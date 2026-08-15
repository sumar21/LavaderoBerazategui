import axios from 'axios';
import { getAppToken } from '../config/msal.js';
import { LOGO_CID, LOGO_PNG_BASE64 } from '../templates/logo.js';

const GRAPH = 'https://graph.microsoft.com/v1.0';

/**
 * Mailbox the app sends from. Client-credentials flow has no signed-in user, so
 * Graph requires an explicit sender. Needs the Mail.Send application permission
 * granted on the Azure AD app registration.
 */
const SENDER = process.env.MAIL_SENDER || '';

interface SendMailInput {
  to: string[];
  /** Visible copy: the recipient sees these addresses and can reply-all to them. */
  cc?: string[];
  /** Blind copy: hidden from every other recipient. */
  bcc?: string[];
  subject: string;
  html: string;
}

const recipients = (addresses: string[]) =>
  addresses.map((address) => ({ emailAddress: { address } }));

/** Splits the `a@x.com;b@y.com` form used by SharePoint columns and env vars. */
export const parseAddressList = (raw: string | undefined | null): string[] =>
  (raw ?? '')
    .split(/[;,]/)
    .map((address) => address.trim())
    .filter(Boolean);

/**
 * The logo rides along as an inline attachment rather than a `data:` URI or a
 * remote URL: Outlook blocks the former outright and hides the latter behind a
 * "download images" prompt.
 */
const logoAttachment = {
  '@odata.type': '#microsoft.graph.fileAttachment',
  name: 'logo.png',
  contentType: 'image/png',
  contentBytes: LOGO_PNG_BASE64,
  contentId: LOGO_CID,
  isInline: true,
};

/** Graph rejects empty recipient arrays, so absent lists are omitted entirely. */
export const buildMessage = ({ to, cc, bcc, subject, html }: SendMailInput) => ({
  message: {
    subject,
    body: { contentType: 'HTML', content: html },
    toRecipients: recipients(to),
    ...(cc && cc.length > 0 ? { ccRecipients: recipients(cc) } : {}),
    ...(bcc && bcc.length > 0 ? { bccRecipients: recipients(bcc) } : {}),
    attachments: [logoAttachment],
  },
  saveToSentItems: true,
});

export async function sendMail(input: SendMailInput): Promise<void> {
  if (!SENDER) {
    throw new Error('MAIL_SENDER is not configured');
  }
  if (input.to.length === 0) {
    throw new Error('sendMail called with no recipients');
  }

  const accessToken = await getAppToken();

  await axios.post(
    `${GRAPH}/users/${encodeURIComponent(SENDER)}/sendMail`,
    buildMessage(input),
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  );
}
