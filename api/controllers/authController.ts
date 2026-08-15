import { Request, Response } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { getAppToken } from '../config/msal.js';
import { SITE_ID, LISTS } from '../src/config/constants.js';

// --- SHARED TYPES ---
export interface SharePointUser {
    id: string;
    fields: {
        // Standard SharePoint Column
        Title: string;          // Maps to "Título" (Value: "[sumar]")

        // Your Custom Columns
        Nombre_Usr: string;
        Apellido_Usr: string;
        ConcatName_Usr: string;
        Mail_Usr: string;
        Password_Usr: string;
        Validado_Usr?: string;  // "SI" / "NO"

        // Assumed for verification/recovery logic since not visible in screenshot but standard
        CodigoVal_Usr?: string;
        CodigoRec_Usr?: string;

        // Extra Context from Screenshot
        UsuarioApp_Usr: string;
        App_Usr: string;
        NumCelNumero_Usr?: string;
        FechaNac_Usr?: string;
        Perfil_Usr?: string;        // "Admin", "Calidad", "Costura Jefe", etc.
        MarcaExterno_Usr?: string;
        Status_Usr?: string;        // "ALTA"
        WappDefault_Usr?: string;
        UsuarioTesting_Usr?: string;
        "23Navidad_Usr"?: string;   // "SI"

        // These might be missing but were in the old code. Keep optional.
        Dni_Usr?: string;
        Legajo_Usr?: string;
        CentroCosto_Usr?: string;
        Categoria_Usr?: string;
    }
}

// --- HELPER: FIND USER (Reusable) ---
// This function strictly searches for the user and returns the data or null.
// It doesn't handle passwords or responses.
export const findUserByEmail = async (email: string): Promise<SharePointUser | null> => {
    const accessToken = await getAppToken();
    const sanitizedEmail = email.replace(/'/g, "''");
    const filter = `fields/Mail_Usr eq '${sanitizedEmail}' and fields/Status_Usr eq 'ALTA'`
    const graphUrl = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.USUARIOS}/items?expand=fields&$filter=${filter}`;
    const response = await axios.get(graphUrl, {
        headers: { Authorization: `Bearer ${accessToken}`, "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly" }
    });
    if (!response.data.value || response.data.value.length === 0) return null;
    return response.data.value[0] as SharePointUser;
};

// --- HELPER: FIND USER BY USUARIO APP ---
export const findUserByUsuarioApp = async (usuarioApp: string): Promise<SharePointUser | null> => {
    const accessToken = await getAppToken();
    const sanitized = usuarioApp.replace(/'/g, "''");
    const filter = `fields/UsuarioApp_Usr eq '${sanitized}' and fields/Status_Usr eq 'ALTA'`;
    const graphUrl = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.USUARIOS}/items?expand=fields&$filter=${filter}`;
    const response = await axios.get(graphUrl, {
        headers: { Authorization: `Bearer ${accessToken}`, "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly" }
    });
    if (!response.data.value || response.data.value.length === 0) return null;
    return response.data.value[0] as SharePointUser;
};

// --- HELPER: UPDATE USER (New) ---
const updateUserFields = async (itemId: string, fieldsToUpdate: any) => {
    const accessToken = await getAppToken();
    const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.USUARIOS}/items/${itemId}/fields`;

    await axios.patch(url, fieldsToUpdate, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        }
    });
};

// --------------------------------------------------------------------------------------------------------

// --- ENDPOINT 1: CHECK STATUS (Phase 2) ---
// Checks if email exists and if it is verified. No password needed.
export const checkEmailStatus = async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) return res.status(400).json({ error: "Email required" });

    try {
        const user = await findUserByEmail(email);

        if (!user) {
            // Security Best Practice: Sometimes you might want to return 200 even if false 
            // to prevent "Email Enumeration", but for internal apps, 404 is fine.
            return res.status(404).json({ status: "NOT_FOUND", message: "User does not exist or is inactive" });
        }

        const isVerified = user.fields.Validado_Usr?.toUpperCase() === 'SI';

        // Return public info only (NO PASSWORD!)
        res.json({
            status: "FOUND",
            verified: isVerified,
            name: user.fields.ConcatName_Usr
        });

    } catch (error: any) {
        console.error("CheckStatus Error:", error.message);
        res.status(500).json({ error: "Check failed" });
    }
};

// --- ENDPOINT 2: LOGIN (Refactored) ---
export const login = async (req: Request, res: Response) => {
    const { usuarioApp, password } = req.body;

    if (!usuarioApp || !password) return res.status(400).json({ error: "UsuarioApp and Password required" });

    try {
        const user = await findUserByUsuarioApp(usuarioApp);

        if (!user) return res.status(404).json({ error: "User not found" });

        if (user.fields.Validado_Usr?.toUpperCase() !== 'SI') {
            return res.status(403).json({ error: "Account not verified" });
        }

        if (user.fields.Password_Usr !== password) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET missing");

        const token = jwt.sign(
            { id: user.id, email: user.fields.Mail_Usr, role: user.fields.Perfil_Usr || 'User' },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: {
                email: user.fields.Mail_Usr,
                name: user.fields.ConcatName_Usr,
                id: user.id,
                dni: user.fields.Dni_Usr || "",
                legajo: user.fields.Legajo_Usr || "",
                usuarioApp: user.fields.UsuarioApp_Usr,
                perfil: user.fields.Perfil_Usr
            }
        });

    } catch (error: any) {
        console.error("Login Error:", error.message);
        res.status(500).json({ error: "Authentication failed" });
    }
};


// --- ENDPOINT 3: VALIDATE ACCOUNT ---
export const validateAccount = async (req: Request, res: Response) => {
    const { email, code, password } = req.body;

    if (!email || !code || !password) {
        return res.status(400).json({ error: "Email, Code, and Password are required" });
    }

    try {
        // 1. Find the user internally (includes CodigoVal_Usr)
        const user = await findUserByEmail(email);

        if (!user) return res.status(404).json({ error: "User not found" });

        // 2. CHECK THE CODE (Server-side Logic)
        // We compare what the user typed (req.body.code) vs SharePoint (user.fields.CodigoVal_Usr)
        // We use '==' for loose comparison in case one is a number and the other a string
        if (user.fields.CodigoVal_Usr != code) {
            return res.status(400).json({ error: "Invalid verification code" });
        }

        // 3. SUCCESS - Update the User Profile
        await updateUserFields(user.id, {
            Password_Usr: password,         // Set their new password
            Validado_Usr: "SI",             // Mark as verified
            CodigoVal_Usr: "-"              // Clear the code so it can't be used again
        });

        // 4. Return Success (Or you could auto-login and return a Token here too)
        res.json({
            status: "SUCCESS",
            message: "Account verified and password set successfully."
        });

    } catch (error: any) {
        console.error("Validation Error:", error.message);
        res.status(500).json({ error: "Could not validate account" });
    }
};

// --- ENDPOINT 4: RECOVER ACCOUNT ---
export const recoverAccount = async (req: Request, res: Response) => {
    const { email, code, password } = req.body;

    if (!email || !code || !password) {
        return res.status(400).json({ error: "Email, Code, and Password are required" });
    }

    try {
        // 1. Find the user internally (includes CodigoRec_Usr)
        const user = await findUserByEmail(email);

        if (!user) return res.status(404).json({ error: "User not found" });

        // 2. CHECK THE CODE (Server-side Logic)
        // We compare what the user typed (req.body.code) vs SharePoint (user.fields.CodigoRec_Usr)
        // We use '==' for loose comparison in case one is a number and the other a string
        if (user.fields.CodigoRec_Usr != code) {
            return res.status(400).json({ error: "Invalid recovery code" });
        }

        // 3. SUCCESS - Update the User Profile
        await updateUserFields(user.id, {
            Password_Usr: password,         // Set their new password
            CodigoRec_Usr: "-"              // Clear the code so it can't be used again
        });

        // 4. Return Success
        res.json({
            status: "SUCCESS",
            message: "Account recovered and password set successfully."
        });

    } catch (error: any) {
        console.error("Recovery Error:", error.message);
        res.status(500).json({ error: "Could not recover account" });
    }
};