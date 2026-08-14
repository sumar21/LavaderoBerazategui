import * as msal from '@azure/msal-node';
import dotenv from 'dotenv';
dotenv.config();

const msalConfig: msal.Configuration = {
    auth: {
        clientId: process.env.CLIENT_ID || '',
        authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
        clientSecret: process.env.CLIENT_SECRET || '',
    }
};

const cca = new msal.ConfidentialClientApplication(msalConfig);

// Helper function to get a token cleanly
export async function getAppToken(): Promise<string> {
    const response = await cca.acquireTokenByClientCredential({
        scopes: ["https://graph.microsoft.com/.default"],
    });
    return response?.accessToken || '';
}
