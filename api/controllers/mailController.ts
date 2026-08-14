import { Request, Response } from 'express';
import axios from 'axios';
import { getAppToken } from '../config/msal';
import { SITE_ID, LISTS } from '../src/config/constants';
import { sendMail, parseAddressList } from '../services/mail';
import { purchaseOrderEmail, credentialsEmail, OrderItemRow } from '../templates/emails';
import { findUserByEmail } from './authController';

const CC_ORDENES = parseAddressList(process.env.MAIL_CC_ORDENES);
const BCC_ORDENES = parseAddressList(process.env.MAIL_BCC_ORDENES);

interface ListItem { id: string; fields: Record<string, any>; }

/** Single-quote is the escape character in OData string literals. */
const odata = (value: string) => value.replace(/'/g, "''");

async function queryList(listId: string, filter: string): Promise<ListItem[]> {
  const accessToken = await getAppToken();
  const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${listId}/items?expand=fields&$filter=${filter}`;
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly',
    },
  });
  return (response.data?.value ?? []) as ListItem[];
}

/**
 * Replaces the "Notificar Orden de Compra" Power Automate flow.
 *
 * Recipients come from the provider record (Emails_P), not from the caller —
 * matching the flow, which ignored the `correo` it was handed.
 */
export const notifyPurchaseOrder = async (req: Request, res: Response) => {
  const { id, notas } = req.body ?? {};

  if (!id) {
    return res.status(400).json({ error: 'id is required' });
  }

  try {
    const safeId = odata(String(id));

    const [orders, details] = await Promise.all([
      queryList(LISTS.ORDENES_COMPRA, `fields/IDUnivoco_OC eq '${safeId}'`),
      queryList(LISTS.DETALLES_OC, `fields/IdCompra_DOC eq '${safeId}'`),
    ]);

    const order = orders[0];
    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const providers = await queryList(
      LISTS.PROVEEDORES,
      `fields/Proveedor_P eq '${odata(String(order.fields.Proveedor_SI ?? ''))}'`
    );

    const to = parseAddressList(providers[0]?.fields?.Emails_P);
    if (to.length === 0) {
      return res.status(422).json({ error: 'Provider has no email address registered' });
    }

    const items: OrderItemRow[] = details.map((detail) => ({
      sku: detail.fields.SKU_DOC,
      articulo: detail.fields.Articulo_DOC,
      descripcion: detail.fields.ArticuloConcat_DOC,
      cantidad: detail.fields.Cantidad_DOC,
    }));

    await sendMail({
      to,
      cc: CC_ORDENES,
      bcc: BCC_ORDENES,
      subject: `Solicitud de Presupuesto - Orden de Compra N° ${order.fields.ID ?? id}`,
      html: purchaseOrderEmail({
        orderNumber: order.fields.ID ?? id,
        orderDate: order.fields.Fecha_OC,
        notes: notas,
        items,
      }),
    });

    return res.status(200).json({ success: true, sentTo: to });
  } catch (error: any) {
    console.error('notifyPurchaseOrder failed:', error?.response?.data ?? error.message);
    return res.status(500).json({ error: 'Could not send the purchase order notification' });
  }
};

/**
 * Replaces the "Enviar Usuario y Contraseña" Power Automate flow.
 *
 * Public endpoint: always answers 200 so it cannot be used to probe which
 * addresses are registered — the flow behaved the same way.
 */
export const sendCredentials = async (req: Request, res: Response) => {
  const { correo } = req.body ?? {};

  if (!correo) {
    return res.status(400).json({ error: 'correo is required' });
  }

  try {
    const user = await findUserByEmail(String(correo));

    if (user) {
      await sendMail({
        to: [String(correo)],
        subject: `Envío de contraseña del usuario ${user.fields.UsuarioApp_Usr}`,
        html: credentialsEmail({
          name: user.fields.ConcatName_Usr,
          username: user.fields.UsuarioApp_Usr,
          password: user.fields.Password_Usr,
        }),
      });
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('sendCredentials failed:', error?.response?.data ?? error.message);
    return res.status(500).json({ error: 'Could not send the credentials email' });
  }
};
