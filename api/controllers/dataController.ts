import { Request, Response } from 'express';
import axios from 'axios';
import { getAppToken } from '../config/msal';
import { SITE_ID, LISTS } from '../src/config/constants';
import { AuthRequest } from '../middleware/verifyToken';
import { findUserByEmail } from './authController';

// Interface for Ordenes de Compra
export interface OrdenCompra {
    id: string;
    idUnivoco: string;        // IDUnivoco_OC
    usuario: string;          // Usuario_OC
    fecha: string;            // Fecha_OC
    hora: string;             // Hora_OC
    proveedor: string;        // Proveedor_OC
    cantidadArticulos: string; // CantidadArticulos_OC
    cantidadTotal: string;    // CantidadTotal_OC
    precio: string;           // Precio_OC
    conversion: string;       // Conversion_OC
    status: string;           // Status_OC
    versionApp: string;       // VersionApp_OC
    mesAnio: string;          // MesAño_OC
    observaciones: string;    // Observaciones_OC
    creadoPor: string;        // Created By (approx)
}

// GET Ordenes de Compra
export const getOrdenesCompra = async (req: AuthRequest, res: Response) => {
    try {
        const token = await getAppToken();

        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.ORDENES_COMPRA}/items?expand=fields`;

        let nextUrl: string | null = url + '&$top=999';
        let allOrdenes: any[] = [];
        while (nextUrl && allOrdenes.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly"
                }
            });
            allOrdenes = allOrdenes.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }

        const ordenes = allOrdenes.map((item: any) => ({
            id: item.id,
            idUnivoco: item.fields.IDUnivoco_OC,
            usuario: item.fields.Usuario_OC,
            fecha: item.fields.Fecha_OC,
            hora: item.fields.Hora_OC,
            proveedor: item.fields.Proveedor_SI,
            cantidadArticulos: item.fields.CantidadArticulos_OC,
            cantidadTotal: item.fields.CantidadTotal_OC,
            precio: item.fields.Precio_OC,
            conversion: item.fields.Conversion_OC,
            status: item.fields.Status_OC,
            versionApp: item.fields.Version_OC,
            mesAnio: item.fields.MesA_x00f1_o_OC,
            observaciones: item.fields.Observaciones_OC,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));

        res.json(ordenes);

    } catch (error: any) {
        console.error("Error fetching Ordenes Compra:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Ordenes Compra" });
    }
};

// CREATE Orden Compra
export const createOrdenCompra = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const {
            IDUnivoco, Usuario, Fecha, Hora, Proveedor, CantidadArticulos,
            CantidadTotal, Precio, Conversion, Status, VersionApp, MesAnio, Observaciones
        } = req.body;

        // Basic validation
        if (!IDUnivoco || !Fecha || !Proveedor) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.ORDENES_COMPRA}/items`;

        const newOrden = {
            fields: {
                Title: "[sumar]",
                IDUnivoco_OC: IDUnivoco,
                Usuario_OC: Usuario,
                Fecha_OC: Fecha,
                Hora_OC: Hora,
                Proveedor_SI: Proveedor,
                CantidadArticulos_OC: String(CantidadArticulos),
                CantidadTotal_OC: String(CantidadTotal),
                Precio_OC: String(Precio),
                Conversion_OC: Conversion,
                Status_OC: Status,
                Version_OC: VersionApp,
                MesA_x00f1_o_OC: MesAnio,
                Observaciones_OC: Observaciones
            }
        };

        const response = await axios.post(url, newOrden, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create Orden Compra Error:", error.response?.data || error.message);
        res.status(500).json({
            error: "Failed to create Orden Compra",
            details: error.response?.data || error.message
        });
    }
};

// UPDATE Orden Compra
export const updateOrdenCompra = async (req: AuthRequest, res: Response) => {
    try {
        const { id, Status, CantidadArticulos, CantidadTotal, Precio, Observaciones, ...otherFields } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.ORDENES_COMPRA}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (Status) updateData['Status_OC'] = Status;
        if (CantidadArticulos !== undefined) updateData['CantidadArticulos_OC'] = String(CantidadArticulos);
        if (CantidadTotal !== undefined) updateData['CantidadTotal_OC'] = String(CantidadTotal);
        if (Precio !== undefined) updateData['Precio_OC'] = String(Precio);
        if (Observaciones !== undefined) updateData['Observaciones_OC'] = Observaciones;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update Orden Compra Error:", error.response?.data || error.message);

        if (error.response?.status === 404) {
            return res.status(404).json({ error: "Orden Compra not found" });
        }

        res.status(500).json({ error: "Failed to update Orden Compra" });
    }
};

// =========================================================
// DETAILS (DETALLES OM)
// =========================================================

// Interface for Detalles Orden Compra
export interface DetalleOC {
    id: string;
    idCompra: string;         // IdCompra_DOC
    usuario: string;          // Usuario_DOC
    fecha: string;            // Fecha_DOC
    hora: string;             // Hora_DOC
    idArticulo: string;       // IdArticulo_DOC
    articuloConcat: string;   // ArticuloConcat_DOC
    articulo: string;         // Articulo_DOC
    sku: string;              // SKU_DOC
    precioUnitario: string;   // PrecioUnitario_DOC
    cantidad: string;         // Cantidad_DOC
    precioTotal: string;      // PrecioTotal_DOC
    cantidadRecepcionada: string; // CantidadRecepcionada_DOC
    valorRecepcionado: string;    // ValorRecepcionado_DOC
    status: string;           // Status_DOC
    versionApp: string;       // VersionApp_DOC
    mesAnio: string;          // MesAño_DOC
    creadoPor: string;        // Created By
}

// GET Detalles OC
export const getDetallesOC = async (req: AuthRequest, res: Response) => {
    try {
        const { idCompra } = req.query;
        const token = await getAppToken();

        // Base URL
        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.DETALLES_OC}/items?expand=fields`;

        // Filter if idCompra provided
        if (idCompra) {
            const filter = `fields/IdCompra_DOC eq '${idCompra}'`;
            url += `&$filter=${filter}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allItems: any[] = [];
        while (nextUrl && allItems.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly"
                }
            });
            allItems = allItems.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }

        const detalles = allItems.map((item: any) => ({
            id: item.id,
            idCompra: item.fields.IdCompra_DOC,
            usuario: item.fields.Usuario_DOC,
            fecha: item.fields.Fecha_DOC,
            hora: item.fields.Hora_DOC,
            idArticulo: item.fields.IdArticulo_DOC,
            articuloConcat: item.fields.ArticuloConcat_DOC,
            articulo: item.fields.Articulo_DOC,
            sku: item.fields.SKU_DOC,
            precioUnitario: item.fields.PrecioUnitario_DOC,
            cantidad: item.fields.Cantidad_DOC,
            precioTotal: item.fields.PrecioTotal_DOC,
            cantidadRecepcionada: item.fields.CantidadRecepcionada_DOC,
            valorRecepcionado: item.fields.ValorRecepcionado_DOC,
            status: item.fields.Status_DOC,
            versionApp: item.fields.VersionApp_DOC,
            mesAnio: item.fields.MesA_x00f1_o_DOC,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));

        res.json(detalles);

    } catch (error: any) {
        console.error("Error fetching Detalles OC:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Detalles OC" });
    }
};

// CREATE Detalle OC
export const createDetalleOC = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const {
            IdCompra, Usuario, Fecha, Hora, IdArticulo, ArticuloConcat,
            Articulo, SKU, PrecioUnitario, Cantidad, PrecioTotal,
            CantidadRecepcionada, ValorRecepcionado, Status, VersionApp, MesAnio
        } = req.body;

        if (!IdCompra || !IdArticulo) {
            return res.status(400).json({ error: "Missing required fields (IdCompra, IdArticulo)" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.DETALLES_OC}/items`;

        const newDetalle = {
            fields: {
                Title: "[sumar]",
                IdCompra_DOC: IdCompra,
                Usuario_DOC: Usuario,
                Fecha_DOC: Fecha,
                Hora_DOC: Hora,
                IdArticulo_DOC: IdArticulo,
                ArticuloConcat_DOC: ArticuloConcat,
                Articulo_DOC: Articulo,
                SKU_DOC: SKU,
                PrecioUnitario_DOC: String(PrecioUnitario),
                Cantidad_DOC: String(Cantidad),
                PrecioTotal_DOC: String(PrecioTotal),
                CantidadRecepcionada_DOC: String(CantidadRecepcionada || 0),
                ValorRecepcionado_DOC: String(ValorRecepcionado || 0),
                Status_DOC: Status,
                VersionApp_DOC: VersionApp,
                MesA_x00f1_o_DOC: MesAnio
            }
        };

        const response = await axios.post(url, newDetalle, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create Detalle OC Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create Detalle OC", details: error.response?.data || error.message });
    }
};

// UPDATE Detalle OC
export const updateDetalleOC = async (req: AuthRequest, res: Response) => {
    try {
        const {
            id, Status, CantidadRecepcionada, ValorRecepcionado,
            IdCompra, Usuario, Fecha, Hora, IdArticulo, ArticuloConcat,
            Articulo, SKU, PrecioUnitario, Cantidad, PrecioTotal, VersionApp, MesAnio
        } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.DETALLES_OC}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (Status) updateData['Status_DOC'] = Status;
        if (CantidadRecepcionada !== undefined) updateData['CantidadRecepcionada_DOC'] = String(CantidadRecepcionada);
        if (ValorRecepcionado !== undefined) updateData['ValorRecepcionado_DOC'] = String(ValorRecepcionado);
        if (IdCompra) updateData['IdCompra_DOC'] = IdCompra;
        if (Usuario) updateData['Usuario_DOC'] = Usuario;
        if (Fecha) updateData['Fecha_DOC'] = Fecha;
        if (Hora) updateData['Hora_DOC'] = Hora;
        if (IdArticulo) updateData['IdArticulo_DOC'] = IdArticulo;
        if (ArticuloConcat) updateData['ArticuloConcat_DOC'] = ArticuloConcat;
        if (Articulo) updateData['Articulo_DOC'] = Articulo;
        if (SKU) updateData['SKU_DOC'] = SKU;
        if (PrecioUnitario !== undefined) updateData['PrecioUnitario_DOC'] = String(PrecioUnitario);
        if (Cantidad !== undefined) updateData['Cantidad_DOC'] = String(Cantidad);
        if (PrecioTotal !== undefined) updateData['PrecioTotal_DOC'] = String(PrecioTotal);
        if (VersionApp) updateData['VersionApp_DOC'] = VersionApp;
        if (MesAnio) updateData['MesA_x00f1_o_DOC'] = MesAnio;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update Detalle OC Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update Detalle OC" });
    }
};

// =========================================================
// RECEPCIONES (RECEPCIONES OC)
// =========================================================

// Interface for Recepciones Orden Compra
export interface RecepcionOC {
    id: string;
    idRecepcionGrupal: string; // IDRecepcionGrupal_ROC
    idCompra: string;          // IDCompra_ROC
    idDetalleCompra: string;   // IDDetalleCompra_ROC
    usuario: string;           // Usuario_ROC
    fecha: string;             // Fecha_ROC
    hora: string;              // Hora_ROC
    fechaRecepcion: string;    // FechaRecepcion_ROC
    nroRemito: string;         // NroRemito_ROC
    lote: string;              // Lote_ROC
    idArticulo: string;        // IdArticulo_ROC
    detalleArticulo: string;   // DetalleArticulo_ROC
    articuloConcat: string;    // ArticuloConcat_ROC
    sku: string;               // SKU_ROC
    cantidadRecepcion: string; // CantidadRecepcion_ROC
    status: string;            // Status_ROC
    versionApp: string;        // VersionApp_ROC
    mesAnio: string;           // MesAño_ROC
    creadoPor: string;         // Created By
}

// GET Recepciones OC
export const getRecepcionesOC = async (req: AuthRequest, res: Response) => {
    try {
        const { idCompra, idRecepcionGrupal } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.RECEPCIONES_OC}/items?expand=fields`;

        // Filter logic
        const filters: string[] = [];
        if (idCompra) filters.push(`fields/IDCompra_ROC eq '${idCompra}'`);
        if (idRecepcionGrupal) filters.push(`fields/IDRecepcionGrupal_ROC eq '${idRecepcionGrupal}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allRecepciones: any[] = [];
        while (nextUrl && allRecepciones.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly"
                }
            });
            allRecepciones = allRecepciones.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }

        const recepciones = allRecepciones.map((item: any) => ({
            id: item.id,
            idRecepcionGrupal: item.fields.IDRecepcionGrupal_ROC,
            idCompra: item.fields.IDCompra_ROC,
            idDetalleCompra: item.fields.IDDetalleCompra_ROC,
            usuario: item.fields.Usuario_ROC,
            fecha: item.fields.Fecha_ROC,
            hora: item.fields.Hora_ROC,
            fechaRecepcion: item.fields.FechaRecepcion_ROC,
            nroRemito: item.fields.NroRemito_ROC,
            lote: item.fields.Lote_ROC,
            idArticulo: item.fields.IdArticulo_ROC,
            detalleArticulo: item.fields.DetalleArticulo_ROC,
            articuloConcat: item.fields.ArticuloConcat_ROC,
            sku: item.fields.SKU_ROC,
            cantidadRecepcion: item.fields.CantidadRecepcion_ROC,
            status: item.fields.Status_ROC,
            versionApp: item.fields.VersionApp_ROC,
            mesAnio: item.fields.MesA_x00f1_o_ROC,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));

        res.json(recepciones);

    } catch (error: any) {
        console.error("Error fetching Recepciones:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Recepciones" });
    }
};

// CREATE Recepcion OC
export const createRecepcionOC = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const {
            IDRecepcionGrupal, IDCompra, IDDetalleCompra, Usuario, Fecha, Hora,
            FechaRecepcion, NroRemito, Lote, IdArticulo, DetalleArticulo,
            ArticuloConcat, SKU, CantidadRecepcion, Status, VersionApp, MesAnio
        } = req.body;

        // Basic validation
        if (!IDCompra || !IdArticulo) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.RECEPCIONES_OC}/items`;

        const newRecepcion = {
            fields: {
                Title: "[sumar]",
                IDRecepcionGrupal_ROC: IDRecepcionGrupal,
                IDCompra_ROC: IDCompra,
                IDDetalleCompra_ROC: IDDetalleCompra,
                Usuario_ROC: Usuario,
                Fecha_ROC: Fecha,
                Hora_ROC: Hora,
                FechaRecepcion_ROC: FechaRecepcion,
                NroRemito_ROC: NroRemito,
                Lote_ROC: Lote,
                IdArticulo_ROC: IdArticulo,
                DetalleArticulo_ROC: DetalleArticulo,
                ArticuloConcat_ROC: ArticuloConcat,
                SKU_ROC: SKU,
                CantidadRecepcion_ROC: String(CantidadRecepcion),
                Status_ROC: Status,
                VersionApp_ROC: VersionApp,
                MesA_x00f1_o_ROC: MesAnio
            }
        };

        const response = await axios.post(url, newRecepcion, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create Recepcion OC Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create Recepcion OC", details: error.response?.data || error.message });
    }
};

// UPDATE Recepcion OC
export const updateRecepcionOC = async (req: AuthRequest, res: Response) => {
    try {
        const { id, Status, ...otherFields } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.RECEPCIONES_OC}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (Status) updateData['Status_ROC'] = Status;

        // Add more fields if needed for updates

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update Recepcion OC Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update Recepcion OC" });
    }
};

// =========================================================
// CARGA TRANSITO (CARGA TRANSITO)
// =========================================================

// Interface for Carga Transito
export interface CargaTransito {
    id: string;
    idTransaccion: string;     // IDTRX_CT
    fecha: string;             // Fecha_CT
    hora: string;              // Hora_CT
    movimiento: string;        // Movimiento_CT
    almacen: string;           // Almacen_CT
    almacenDestino: string;    // AlmacenDestino_CT
    usuario: string;           // Usuario_CT
    sku: string;               // SKU_CT
    concatArtCliente: string;  // ConcatArtCliente_CT
    articulo: string;          // Articulo_CT
    cantidadInicial: string;   // CantidadInicial_CT
    cantidad: string;          // Cantidad_CT
    status: string;            // Status_CT
    version: string;           // Version_CT
    cliente: string;           // Cliente_CT
    creadoPor: string;         // Created By
}

// GET Carga Transito
export const getCargaTransito = async (req: AuthRequest, res: Response) => {
    try {
        const { idTransaccion, sku } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.CARGA_TRANSITO}/items?expand=fields`;

        // Filter logic
        const filters: string[] = [];
        if (idTransaccion) filters.push(`fields/IDTRX_CT eq '${idTransaccion}'`);
        if (sku) filters.push(`fields/SKU_CT eq '${sku}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allCargas: any[] = [];
        while (nextUrl && allCargas.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly"
                }
            });
            allCargas = allCargas.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }

        const cargas = allCargas.map((item: any) => ({
            id: item.id,
            idTransaccion: item.fields.IDTRX_CT,
            fecha: item.fields.Fecha_CT,
            hora: item.fields.Hora_CT,
            movimiento: item.fields.Movimiento_CT,
            almacen: item.fields.Almacen_CT,
            almacenDestino: item.fields.AlmacenDestino_CT,
            usuario: item.fields.Usuario_CT,
            sku: item.fields.SKU_CT,
            concatArtCliente: item.fields.ConcatArtCliente_CT,
            articulo: item.fields.Articulo_CT,
            cantidadInicial: item.fields.CantidadInicial_CT,
            cantidad: item.fields.Cantidad_CT,
            status: item.fields.Status_CT,
            version: item.fields.Version_CT,
            cliente: item.fields.Cliente_CT,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));

        res.json(cargas);

    } catch (error: any) {
        console.error("Error fetching Carga Transito:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Carga Transito" });
    }
};

// CREATE Carga Transito
export const createCargaTransito = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const {
            IDTRX, Fecha, Hora, Movimiento, Almacen, AlmacenDestino, Usuario,
            SKU, ConcatArtCliente, Articulo, CantidadInicial, Cantidad,
            Status, Version, Cliente
        } = req.body;

        // Basic validation
        if (!IDTRX || !SKU) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.CARGA_TRANSITO}/items`;

        const newCarga = {
            fields: {
                Title: "[sumar]",
                IDTRX_CT: IDTRX,
                Fecha_CT: Fecha,
                Hora_CT: Hora,
                Movimiento_CT: Movimiento,
                Almacen_CT: Almacen,
                AlmacenDestino_CT: AlmacenDestino,
                Usuario_CT: Usuario,
                SKU_CT: SKU,
                ConcatArtCliente_CT: ConcatArtCliente,
                Articulo_CT: Articulo,
                CantidadInicial_CT: String(CantidadInicial),
                Cantidad_CT: String(Cantidad),
                Status_CT: Status,
                Version_CT: Version,
                Cliente_CT: Cliente
            }
        };

        const response = await axios.post(url, newCarga, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create Carga Transito Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create Carga Transito", details: error.response?.data || error.message });
    }
};

// UPDATE Carga Transito
export const updateCargaTransito = async (req: AuthRequest, res: Response) => {
    try {
        const { id, Status, ...otherFields } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.CARGA_TRANSITO}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (Status) updateData['Status_CT'] = Status;

        // Add more fields if needed for updates

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update Carga Transito Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update Carga Transito" });
    }
};

// =========================================================
// ALMACENES (TEST LIST)
// =========================================================

// Interface for Almacenes
export interface Almacen {
    id: string;
    fecha: string;             // Fecha_A
    idAlmacen: string;         // IDAlmacen_A
    nroAlmacen: string;        // NroAlmacen_A
    sku: string;               // SKU_A
    articulo: string;          // Articulo_A
    concat: string;            // Concat_A
    stockInicial: string;      // StockInicial_A
    ingreso: string;           // Ingreso_A
    egreso: string;            // Egreso_A
    stockFinal: string;        // StockFinal_A
    status: string;            // Status_A
    creadoPor: string;         // Created By
}

// GET Almacenes
export const getAlmacenes = async (req: AuthRequest, res: Response) => {
    try {
        const { idAlmacen, sku } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.TEST}/items?expand=fields`;

        // Filter logic
        const filters: string[] = [];
        if (idAlmacen) filters.push(`fields/IDAlmacen_A eq '${idAlmacen}'`);
        if (sku) filters.push(`fields/SKU_A eq '${sku}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allAlmacenes: any[] = [];
        while (nextUrl && allAlmacenes.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly"
                }
            });
            allAlmacenes = allAlmacenes.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }

        const almacenes = allAlmacenes.map((item: any) => ({
            id: item.id,
            fecha: item.fields.Fecha_A,
            idAlmacen: item.fields.IDAlmacen_A,
            nroAlmacen: item.fields.NroAlmacen_A,
            sku: item.fields.SKU_A,
            articulo: item.fields.Articulo_A,
            concat: item.fields.Concat_A,
            stockInicial: item.fields.StockInicial_A,
            ingreso: item.fields.Ingreso_A,
            egreso: item.fields.Egreso_A,
            stockFinal: item.fields.StockFinal_A,
            status: item.fields.Status_A,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));

        res.json(almacenes);

    } catch (error: any) {
        console.error("Error fetching Almacenes:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Almacenes" });
    }
};

// CREATE Almacen
export const createAlmacen = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const {
            Fecha, IDAlmacen, NroAlmacen, SKU, Articulo, Concat,
            StockInicial, Ingreso, Egreso, StockFinal, Status
        } = req.body;

        // Basic validation
        if (!IDAlmacen || !SKU) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.TEST}/items`;

        const newAlmacen = {
            fields: {
                Title: "[sumar]",
                Fecha_A: Fecha,
                IDAlmacen_A: IDAlmacen,
                NroAlmacen_A: NroAlmacen,
                SKU_A: SKU,
                Articulo_A: Articulo,
                Concat_A: Concat,
                StockInicial_A: String(StockInicial),
                Ingreso_A: String(Ingreso),
                Egreso_A: String(Egreso),
                StockFinal_A: String(StockFinal),
                Status_A: Status
            }
        };

        const response = await axios.post(url, newAlmacen, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create Almacen Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create Almacen", details: error.response?.data || error.message });
    }
};

// UPDATE Almacen
export const updateAlmacen = async (req: AuthRequest, res: Response) => {
    try {
        const { id, Status, ...otherFields } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.TEST}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (Status) updateData['Status_A'] = Status;

        // Add more fields if needed for updates

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update Almacen Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update Almacen" });
    }
};

// =========================================================
// ORDENES DE TRABAJO
// =========================================================

// Interface for Ordenes de Trabajo
export interface OrdenTrabajo {
    id: string;
    idTransaccion: string;     // IDTRX_OT
    ordenTrabajo: string;      // OrdenTrabajo_OT
    fecha: string;             // Fecha_OT
    hora: string;              // Hora_OT
    estado: string;            // Status_OT ("Baja", "Alta", etc.)
    usuario: string;           // Usuario_OT
    sku: string;               // SKU_OT
    cliente: string;           // Cliente_OT
    articulo: string;          // Articulo_OT
    version: string;           // Version_OT
    mesAnio: string;           // MesAño_OT
    creadoPor: string;         // Created By
}

// GET Ordenes Trabajo
export const getOrdenesTrabajo = async (req: AuthRequest, res: Response) => {
    try {
        const { ordenTrabajo, idTransaccion, sku } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.ORDENES_TRABAJO}/items?expand=fields`;

        // Filter logic
        const filters: string[] = [];
        if (ordenTrabajo) filters.push(`fields/OrdenTrabajo_OT eq '${ordenTrabajo}'`);
        if (idTransaccion) filters.push(`fields/IDTRX_OT eq '${idTransaccion}'`);
        if (sku) filters.push(`fields/SKU_OT eq '${sku}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allOrdenesTrabajo: any[] = [];
        while (nextUrl && allOrdenesTrabajo.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly"
                }
            });
            allOrdenesTrabajo = allOrdenesTrabajo.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }

        const ordenes = allOrdenesTrabajo.map((item: any) => ({
            id: item.id,
            idTransaccion: item.fields.IDTRX_OT,
            ordenTrabajo: item.fields.OrdenTrabajo_OT,
            fecha: item.fields.Fecha_OT,
            hora: item.fields.Hora_OT,
            estado: item.fields.Status_OT,
            usuario: item.fields.Usuario_OT,
            sku: item.fields.SKU_OT,
            cliente: item.fields.Cliente_OT,
            articulo: item.fields.Articulo_OT,
            version: item.fields.Version_OT,
            mesAnio: item.fields.MesA_x00f1_o_OT,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));

        res.json(ordenes);

    } catch (error: any) {
        console.error("Error fetching Ordenes Trabajo:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Ordenes Trabajo" });
    }
};

// CREATE Orden Trabajo
export const createOrdenTrabajo = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const {
            IDTRX, OrdenTrabajo, Fecha, Hora, Status, Usuario,
            SKU, Cliente, Articulo, Version, MesAnio
        } = req.body;

        // Basic validation
        if (!IDTRX || !OrdenTrabajo) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.ORDENES_TRABAJO}/items`;

        const newOrden = {
            fields: {
                Title: "[sumar]",
                IDTRX_OT: IDTRX,
                OrdenTrabajo_OT: OrdenTrabajo,
                Fecha_OT: Fecha,
                Hora_OT: Hora,
                Status_OT: Status,
                Usuario_OT: Usuario,
                SKU_OT: SKU,
                Cliente_OT: Cliente,
                Articulo_OT: Articulo,
                Version_OT: Version,
                MesA_x00f1_o_OT: MesAnio
            }
        };

        const response = await axios.post(url, newOrden, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create Orden Trabajo Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create Orden Trabajo", details: error.response?.data || error.message });
    }
};

// UPDATE Orden Trabajo
export const updateOrdenTrabajo = async (req: AuthRequest, res: Response) => {
    try {
        const { id, Status, ...otherFields } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.ORDENES_TRABAJO}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (Status) updateData['Status_OT'] = Status;

        // Add more fields if needed for updates

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update Orden Trabajo Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update Orden Trabajo" });
    }
};

// =========================================================
// SOLICITUDES DE INYECCIONES
// =========================================================

// Interface for Solicitud Inyecciones
export interface SolicitudInyeccion {
    id: string;
    idTransaccion: string;     // IDTRX_SI
    usuario: string;           // Usuario_SI
    fecha: string;             // Fecha_SI
    hora: string;              // Hora_SI
    movimiento: string;        // Movimiento_SI
    articulo: string;          // Articulo_SI
    sku: string;               // SKU_SI
    cliente: string;           // Cliente_SI
    cantidadInicial: string;   // CantidadInicial_SI
    cantidad: string;          // Cantidad_SI
    status: string;            // Status_SI
    observaciones: string;     // Observaciones_SI
    version: string;           // Version_SI
    mesAnio: string;           // MesAño_SI
    mesAnioReal: string;       // MesAñoReal_SI
    creadoPor: string;         // Created By
}

// GET Solicitud Inyecciones
export const getSolicitudInyecciones = async (req: AuthRequest, res: Response) => {
    try {
        const { idTransaccion, sku, cliente } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.SOLICITUDES_INYECCIONES}/items?expand=fields`;

        // Filter logic
        const filters: string[] = [];
        if (idTransaccion) filters.push(`fields/IDTRX_SI eq '${idTransaccion}'`);
        if (sku) filters.push(`fields/SKU_SI eq '${sku}'`);
        if (cliente) filters.push(`fields/Cliente_SI eq '${cliente}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allSolicitudes: any[] = [];
        while (nextUrl && allSolicitudes.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly"
                }
            });
            allSolicitudes = allSolicitudes.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }

        const solicitudes = allSolicitudes.map((item: any) => ({
            id: item.id,
            idTransaccion: item.fields.IDTRX_SI,
            usuario: item.fields.Usuario_SI,
            fecha: item.fields.Fecha_SI,
            hora: item.fields.Hora_SI,
            movimiento: item.fields.Movimiento_SI,
            articulo: item.fields.Articulo_SI,
            sku: item.fields.SKU_SI,
            cliente: item.fields.Cliente_SI,
            cantidadInicial: item.fields.CantidadInicial_SI,
            cantidad: item.fields.Cantidad_SI,
            status: item.fields.Status_SI,
            observaciones: item.fields.Observaciones_SI,
            version: item.fields.Version_SI,
            mesAnio: item.fields.MesA_x00f1_o_SI,
            mesAnioReal: item.fields.MesA_x00f1_oReal_SI,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));

        res.json(solicitudes);

    } catch (error: any) {
        console.error("Error fetching Solicitud Inyecciones:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Solicitud Inyecciones" });
    }
};

// CREATE Solicitud Inyeccion
export const createSolicitudInyeccion = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const {
            IDTRX, Usuario, Fecha, Hora, Movimiento, Articulo, SKU, Cliente,
            CantidadInicial, Cantidad, Status, Observaciones, Version, MesAnio, MesAnioReal
        } = req.body;

        // Basic validation
        if (!IDTRX || !SKU) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.SOLICITUDES_INYECCIONES}/items`;

        const newSolicitud = {
            fields: {
                Title: "[sumar]",
                IDTRX_SI: IDTRX,
                Usuario_SI: Usuario,
                Fecha_SI: Fecha,
                Hora_SI: Hora,
                Movimiento_SI: Movimiento,
                Articulo_SI: Articulo,
                SKU_SI: SKU,
                Cliente_SI: Cliente,
                CantidadInicial_SI: String(CantidadInicial),
                Cantidad_SI: String(Cantidad),
                Status_SI: Status,
                Observaciones_SI: Observaciones,
                Version_SI: Version,
                MesA_x00f1_o_SI: MesAnio,
                MesA_x00f1_oReal_SI: MesAnioReal
            }
        };

        const response = await axios.post(url, newSolicitud, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create Solicitud Inyeccion Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create Solicitud Inyeccion", details: error.response?.data || error.message });
    }
};

// UPDATE Solicitud Inyeccion
export const updateSolicitudInyeccion = async (req: AuthRequest, res: Response) => {
    try {
        const { id, Status, Cantidad, ...otherFields } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.SOLICITUDES_INYECCIONES}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (Status) updateData['Status_SI'] = Status;
        if (Cantidad !== undefined) updateData['Cantidad_SI'] = String(Cantidad);

        // Add more fields if needed for updates

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update Solicitud Inyeccion Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update Solicitud Inyeccion" });
    }
};

// =========================================================
// CARGA TRANSITO UNIVOCA
// =========================================================

// Interface for Carga Transito Univoca
export interface CargaTransitoUnivoca {
    id: string;
    ultimoUsuario: string;     // UltimoUsuario_CTU
    ultimaFecha: string;       // UltimaFecha_CTU
    ultimaHora: string;        // UltimaHora_CTU
    cliente: string;           // Cliente_CTU
    articulo: string;          // Articulo_CTU
    concat: string;            // Concat_CTU
    sku: string;               // Sku_CTU
    cantidadInicial: string;   // CantidadInicial_CTU
    movimiento: string;        // Movimiento_CTU
    cantidadFinal: string;     // CantidadFinal_CTU
    versionApp: string;        // VersionApp_CTU
    creadoPor: string;         // Created By
}

// GET Carga Transito Univoca
export const getCargaTransitoUnivoca = async (req: AuthRequest, res: Response) => {
    try {
        const { sku, cliente } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.CARGA_TRANSITO_UNIVOCA}/items?expand=fields`;

        // Filter logic
        const filters: string[] = [];
        if (sku) filters.push(`fields/Sku_CTU eq '${sku}'`);
        if (cliente) filters.push(`fields/Cliente_CTU eq '${cliente}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allCargasUnivocos: any[] = [];
        while (nextUrl && allCargasUnivocos.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly"
                }
            });
            allCargasUnivocos = allCargasUnivocos.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }

        const cargas = allCargasUnivocos.map((item: any) => ({
            id: item.id,
            ultimoUsuario: item.fields.UltimoUsuario_CTU,
            ultimaFecha: item.fields.UltimaFecha_CTU,
            ultimaHora: item.fields.UltimaHora_CTU,
            cliente: item.fields.Cliente_CTU,
            articulo: item.fields.Articulo_CTU,
            concat: item.fields.Concat_CTU,
            sku: item.fields.Sku_CTU,
            cantidadInicial: item.fields.CantidadInicial_CTU,
            movimiento: item.fields.Movimiento_CTU,
            cantidadFinal: item.fields.CantidadFinal_CTU,
            versionApp: item.fields.VersionApp_CTU,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));

        res.json(cargas);

    } catch (error: any) {
        console.error("Error fetching Carga Transito Univoca:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Carga Transito Univoca" });
    }
};

// CREATE Carga Transito Univoca
export const createCargaTransitoUnivoca = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const {
            UltimoUsuario, UltimaFecha, UltimaHora, Cliente, Articulo, Concat,
            Sku, CantidadInicial, Movimiento, CantidadFinal, VersionApp
        } = req.body;

        // Basic validation
        if (!Sku || !Cliente) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.CARGA_TRANSITO_UNIVOCA}/items`;

        const newCarga = {
            fields: {
                Title: "[sumar]",
                UltimoUsuario_CTU: UltimoUsuario,
                UltimaFecha_CTU: UltimaFecha,
                UltimaHora_CTU: UltimaHora,
                Cliente_CTU: Cliente,
                Articulo_CTU: Articulo,
                Concat_CTU: Concat,
                Sku_CTU: Sku,
                CantidadInicial_CTU: String(CantidadInicial),
                Movimiento_CTU: String(Movimiento),
                CantidadFinal_CTU: String(CantidadFinal),
                VersionApp_CTU: VersionApp
            }
        };

        const response = await axios.post(url, newCarga, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create Carga Transito Univoca Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create Carga Transito Univoca", details: error.response?.data || error.message });
    }
};

// UPDATE Carga Transito Univoca
export const updateCargaTransitoUnivoca = async (req: AuthRequest, res: Response) => {
    try {
        const { id, Movimiento, CantidadFinal, ...otherFields } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.CARGA_TRANSITO_UNIVOCA}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (Movimiento !== undefined) updateData['Movimiento_CTU'] = String(Movimiento);
        if (CantidadFinal !== undefined) updateData['CantidadFinal_CTU'] = String(CantidadFinal);

        // Add more fields if needed for updates

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update Carga Transito Univoca Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update Carga Transito Univoca" });
    }
};

// =========================================================
// APROBACIONES
// =========================================================

// Interface for Aprobaciones
export interface Aprobacion {
    id: string;
    idUnivoco: string;         // IDUnivoco_A
    usuario: string;           // Usuario_A
    fechaAprobacion: string;   // FechaAprobacion_A
    horaAprobacion: string;    // HoraAprobacion_A
    fechaCreacion: string;     // FechaCreacion_A
    horaCreacion: string;      // HoraCreacion_A
    cliente: string;           // Cliente_A
    tipo: string;              // Tipo_A
    tipoPrenda: string;        // TipoPrenda_A
    almacenOrigen: string;     // AlmacenOrigen_A
    almacenDestino: string;    // AlmacenDestino_A
    cantidad: string;          // Cantidad_A
    status: string;            // Status_A
    mesAnio: string;           // MesAño_A
    versionApp: string;        // VersionApp_A
    creadoPor: string;         // Created By
}

// GET Aprobaciones
export const getAprobaciones = async (req: AuthRequest, res: Response) => {
    try {
        const { status, cliente, idUnivoco } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.APROBACIONES}/items?expand=fields`;

        // Filter logic
        const filters: string[] = [];
        if (status) filters.push(`fields/Status_A eq '${status}'`);
        if (cliente) filters.push(`fields/Cliente_A eq '${cliente}'`);
        if (idUnivoco) filters.push(`fields/IDUnivoco_A eq '${idUnivoco}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allAprobaciones: any[] = [];
        while (nextUrl && allAprobaciones.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly"
                }
            });
            allAprobaciones = allAprobaciones.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }

        const aprobaciones = allAprobaciones.map((item: any) => ({
            id: item.id,
            idUnivoco: item.fields.IDUnivoco_A,
            usuario: item.fields.Usuario_A,
            fechaAprobacion: item.fields.FechaAprobacion_A,
            horaAprobacion: item.fields.HoraAprobacion_A,
            fechaCreacion: item.fields.FechaCreacion_A,
            horaCreacion: item.fields.HoraCreacion_A,
            cliente: item.fields.Cliente_A,
            tipo: item.fields.Tipo_A,
            tipoPrenda: item.fields.TipoPrenda_A,
            almacenOrigen: item.fields.AlmacenOrigen_A,
            almacenDestino: item.fields.AlmacenDestino_A,
            cantidad: item.fields.Cantidad_A,
            status: item.fields.Status_A,
            mesAnio: item.fields.MesA_x00f1_o_A,
            versionApp: item.fields.VersionApp_A,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));

        res.json(aprobaciones);

    } catch (error: any) {
        console.error("Error fetching Aprobaciones:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Aprobaciones" });
    }
};

// CREATE Aprobacion
export const createAprobacion = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const {
            IDUnivoco, Usuario, FechaAprobacion, HoraAprobacion, FechaCreacion, HoraCreacion,
            Cliente, Tipo, TipoPrenda, AlmacenOrigen, AlmacenDestino, Cantidad, Status,
            MesAnio, VersionApp
        } = req.body;

        // Basic validation
        if (!IDUnivoco || !Cliente) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.APROBACIONES}/items`;

        const newAprobacion = {
            fields: {
                Title: "[sumar]",
                IDUnivoco_A: IDUnivoco,
                Usuario_A: Usuario,
                FechaAprobacion_A: FechaAprobacion,
                HoraAprobacion_A: HoraAprobacion,
                FechaCreacion_A: FechaCreacion,
                HoraCreacion_A: HoraCreacion,
                Cliente_A: Cliente,
                Tipo_A: Tipo,
                TipoPrenda_A: TipoPrenda,
                AlmacenOrigen_A: AlmacenOrigen,
                AlmacenDestino_A: AlmacenDestino,
                Cantidad_A: String(Cantidad),
                Status_A: Status,
                MesA_x00f1_o_A: MesAnio,
                VersionApp_A: VersionApp
            }
        };

        const response = await axios.post(url, newAprobacion, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create Aprobacion Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create Aprobacion", details: error.response?.data || error.message });
    }
};

// UPDATE Aprobacion
export const updateAprobacion = async (req: AuthRequest, res: Response) => {
    try {
        const { id, Status, ...otherFields } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.APROBACIONES}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (Status) updateData['Status_A'] = Status;

        // Add more fields if needed for updates

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update Aprobacion Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update Aprobacion" });
    }
};

// =========================================================
// STOCK
// =========================================================

// Interface for Stock
export interface Stock {
    id: string;
    fecha: string;             // Fecha_St
    idSubdeposito: string;     // IDSubdeposito_St
    subdeposito: string;       // Subdeposito_St
    sku: string;               // SKU_St
    articulo: string;          // Articulo_St
    concat: string;            // Concat_St
    stockFinal: string;        // StockFinal_St
    stockPendiente: string;    // StockPendiente_St
    status: string;            // Status_St
    modificado: string;        // Modificado (System)
    creadoPor: string;         // Created By
}

// GET Stock
export const getStock = async (req: AuthRequest, res: Response) => {
    try {
        const { sku, idSubdeposito } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.STOCK}/items?expand=fields`;

        // Filter logic
        const filters: string[] = [];
        if (sku) filters.push(`fields/SKU_St eq '${sku}'`);
        if (idSubdeposito) filters.push(`fields/IDSubdeposito_St eq '${idSubdeposito}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allStock: any[] = [];
        while (nextUrl && allStock.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly"
                }
            });
            allStock = allStock.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }

        const stockItems = allStock.map((item: any) => ({
            id: item.id,
            fecha: item.fields.Fecha_St,
            idSubdeposito: item.fields.IDSubdeposito_St,
            subdeposito: item.fields.Subdeposito_St,
            sku: item.fields.SKU_St,
            articulo: item.fields.Articulo_St,
            concat: item.fields.Concat_St,
            stockFinal: item.fields.StockFinal_St,
            stockPendiente: item.fields.StockPendiente_St,
            status: item.fields.Status_St,
            modificado: item.fields.Modified,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));

        res.json(stockItems);

    } catch (error: any) {
        console.error("Error fetching Stock:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Stock" });
    }
};

// CREATE Stock
export const createStock = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const {
            Fecha, IDSubdeposito, Subdeposito, SKU, Articulo, Concat,
            StockFinal, StockPendiente, Status
        } = req.body;

        // Basic validation
        if (!SKU || !IDSubdeposito) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.STOCK}/items`;

        const newStock = {
            fields: {
                Title: "[sumar]",
                Fecha_St: Fecha,
                IDSubdeposito_St: IDSubdeposito,
                Subdeposito_St: Subdeposito,
                SKU_St: SKU,
                Articulo_St: Articulo,
                Concat_St: Concat,
                StockFinal_St: String(StockFinal),
                StockPendiente_St: String(StockPendiente),
                Status_St: Status
            }
        };

        const response = await axios.post(url, newStock, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create Stock Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create Stock", details: error.response?.data || error.message });
    }
};

// UPDATE Stock
export const updateStock = async (req: AuthRequest, res: Response) => {
    try {
        const {
            id, Fecha, IDSubdeposito, Subdeposito, SKU, Articulo, Concat,
            StockFinal, StockPendiente, Status
        } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.STOCK}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (Fecha !== undefined) updateData['Fecha_St'] = Fecha;
        if (IDSubdeposito !== undefined) updateData['IDSubdeposito_St'] = IDSubdeposito;
        if (Subdeposito !== undefined) updateData['Subdeposito_St'] = Subdeposito;
        if (SKU !== undefined) updateData['SKU_St'] = SKU;
        if (Articulo !== undefined) updateData['Articulo_St'] = Articulo;
        if (Concat !== undefined) updateData['Concat_St'] = Concat;
        if (StockFinal !== undefined) updateData['StockFinal_St'] = String(StockFinal);
        if (StockPendiente !== undefined) updateData['StockPendiente_St'] = String(StockPendiente);
        if (Status !== undefined) updateData['Status_St'] = Status;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update Stock Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update Stock" });
    }
};

// =========================================================
// DETALLES INGRESOS EGRESOS
// =========================================================

// Interface for Detalle Ingreso Egreso
export interface DetalleIngresoEgreso {
    id: string;
    idUnivoco: string;         // IDUnivoco_DIE
    tipo: string;              // Tipo_DIE
    articulo: string;          // Articulo_DIE
    subdeposito: string;       // Subdeposito_DIE
    cantidad: string;          // Cantidad_DIE
    stockInicial: string;      // StockInicial_DIE
    stockFinal: string;        // StockFinal_DIE
    concat: string;            // Concat_DIE
    usuario: string;           // Usuario_DIE
    fecha: string;             // Fecha_DIE
    mes: string;               // Mes_DIE
    anio: string;              // Año_DIE
    mesAnio: string;           // MesAño_DIE
    hora: string;              // Hora_DIE
    status: string;            // Status_DIE
    versionApp: string;        // VersionApp_DIE
    creadoPor: string;         // Created By
}

// GET Detalles Ingresos Egresos
export const getDetallesIngresosEgresos = async (req: AuthRequest, res: Response) => {
    try {
        const { idUnivoco, tipo } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.DETALLES_INGRESOS_EGRESOS}/items?expand=fields`;

        // Filter logic
        const filters: string[] = [];
        if (idUnivoco) filters.push(`fields/IDUnivoco_DIE eq '${idUnivoco}'`);
        if (tipo) filters.push(`fields/Tipo_DIE eq '${tipo}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allDetalles: any[] = [];
        while (nextUrl && allDetalles.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly"
                }
            });
            allDetalles = allDetalles.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }

        const detalles = allDetalles.map((item: any) => ({
            id: item.id,
            idUnivoco: item.fields.IDUnivoco_DIE,
            tipo: item.fields.Tipo_DIE,
            articulo: item.fields.Articulo_DIE,
            subdeposito: item.fields.Subdeposito_DIE,
            cantidad: item.fields.Cantidad_DIE,
            stockInicial: item.fields.StockInicial_DIE,
            stockFinal: item.fields.StockFinal_DIE,
            concat: item.fields.Concat_DIE,
            usuario: item.fields.Usuario_DIE,
            fecha: item.fields.Fecha_DIE,
            mes: item.fields.Mes_DIE,
            anio: item.fields.A_x00f1_o_DIE,
            mesAnio: item.fields.MesA_x00f1_o_DIE,
            hora: item.fields.Hora_DIE,
            status: item.fields.Status_DIE,
            versionApp: item.fields.VersionApp_DIE,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));

        res.json(detalles);

    } catch (error: any) {
        console.error("Error fetching Detalles Ingresos Egresos:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Detalles Ingresos Egresos" });
    }
};

// CREATE Detalle Ingreso Egreso
export const createDetalleIngresoEgreso = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const {
            IDUnivoco, Tipo, Articulo, Subdeposito, Cantidad, StockInicial, StockFinal, Concat,
            Usuario, Fecha, Mes, Anio, MesAnio, Hora, Status, VersionApp
        } = req.body;

        // Basic validation
        if (!IDUnivoco || !Articulo) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.DETALLES_INGRESOS_EGRESOS}/items`;

        const newDetalle = {
            fields: {
                Title: "[sumar]",
                IDUnivoco_DIE: IDUnivoco,
                Tipo_DIE: Tipo,
                Articulo_DIE: Articulo,
                Subdeposito_DIE: Subdeposito,
                Cantidad_DIE: String(Cantidad),
                StockInicial_DIE: String(StockInicial),
                StockFinal_DIE: String(StockFinal),
                Concat_DIE: Concat,
                Usuario_DIE: Usuario,
                Fecha_DIE: Fecha,
                Mes_DIE: Mes,
                A_x00f1_o_DIE: Anio,
                MesA_x00f1_o_DIE: MesAnio,
                Hora_DIE: Hora,
                Status_DIE: Status,
                VersionApp_DIE: VersionApp
            }
        };

        const response = await axios.post(url, newDetalle, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create Detalle Ingreso Egreso Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create Detalle Ingreso Egreso", details: error.response?.data || error.message });
    }
};

// UPDATE Detalle Ingreso Egreso
export const updateDetalleIngresoEgreso = async (req: AuthRequest, res: Response) => {
    try {
        const { id, Status, ...otherFields } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.DETALLES_INGRESOS_EGRESOS}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (Status) updateData['Status_DIE'] = Status;

        // Add more fields if needed for updates

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update Detalle Ingreso Egreso Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update Detalle Ingreso Egreso" });
    }
};

// =========================================================
// MOVIMIENTOS STOCK
// =========================================================

// Interface for Movimiento Stock
export interface MovimientoStock {
    id: string;
    idUnivoco: string;         // IDUnivoco_MS
    tipo: string;              // Tipo_MS
    articulo: string;          // Articulo_MS
    concat: string;            // Concat_MS
    stockInicial: string;      // StockInicial_MS
    stockFinal: string;        // StockFinal_MS
    subdepositoActual: string; // SubdepositoActual_MS
    subdepositoFinal: string;  // SubdepositoFinal_MS
    usuario: string;           // Usuario_MS
    fecha: string;             // Fecha_MS
    mes: string;               // Mes_MS
    anio: string;              // Año_MS
    mesAnio: string;           // MesAño_MS
    hora: string;              // Hora_MS
    status: string;            // Status_MS
    versionApp: string;        // VersionApp_MS
    creadoPor: string;         // Created By
}

// GET Movimientos Stock
export const getMovimientosStock = async (req: AuthRequest, res: Response) => {
    try {
        const { idUnivoco, tipo } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.MOVIMIENTOS_STOCK}/items?expand=fields`;

        // Filter logic
        const filters: string[] = [];
        if (idUnivoco) filters.push(`fields/IDUnivoco_MS eq '${idUnivoco}'`);
        if (tipo) filters.push(`fields/Tipo_MS eq '${tipo}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allMovimientos: any[] = [];
        while (nextUrl && allMovimientos.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly"
                }
            });
            allMovimientos = allMovimientos.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }

        const movimientos = allMovimientos.map((item: any) => ({
            id: item.id,
            idUnivoco: item.fields.IDUnivoco_MS,
            tipo: item.fields.Tipo_MS,
            articulo: item.fields.Articulo_MS,
            concat: item.fields.Concat_MS,
            stockInicial: item.fields.StockInicial_MS,
            stockFinal: item.fields.StockFinal_MS,
            subdepositoActual: item.fields.SubdepositoActual_MS,
            subdepositoFinal: item.fields.SubdepositoFinal_MS,
            usuario: item.fields.Usuario_MS,
            fecha: item.fields.Fecha_MS,
            mes: item.fields.Mes_MS,
            anio: item.fields.A_x00f1_o_MS,
            mesAnio: item.fields.MesA_x00f1_o_MS,
            hora: item.fields.Hora_MS,
            status: item.fields.Status_MS,
            versionApp: item.fields.VersionApp_MS,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));

        res.json(movimientos);

    } catch (error: any) {
        console.error("Error fetching Movimientos Stock:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Movimientos Stock" });
    }
};

// CREATE Movimiento Stock
export const createMovimientoStock = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const {
            IDUnivoco, Tipo, Articulo, Concat, StockInicial, StockFinal,
            SubdepositoActual, SubdepositoFinal, Usuario, Fecha, Mes, Anio, MesAnio,
            Hora, Status, VersionApp
        } = req.body;

        // Basic validation
        if (!IDUnivoco || !Articulo) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.MOVIMIENTOS_STOCK}/items`;

        const newMovimiento = {
            fields: {
                Title: "[sumar]",
                IDUnivoco_MS: IDUnivoco,
                Tipo_MS: Tipo,
                Articulo_MS: Articulo,
                Concat_MS: Concat,
                StockInicial_MS: String(StockInicial),
                StockFinal_MS: String(StockFinal),
                SubdepositoActual_MS: SubdepositoActual,
                SubdepositoFinal_MS: SubdepositoFinal,
                Usuario_MS: Usuario,
                Fecha_MS: Fecha,
                Mes_MS: Mes,
                A_x00f1_o_MS: Anio,
                MesA_x00f1_o_MS: MesAnio,
                Hora_MS: Hora,
                Status_MS: Status,
                VersionApp_MS: VersionApp
            }
        };

        const response = await axios.post(url, newMovimiento, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create Movimiento Stock Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create Movimiento Stock", details: error.response?.data || error.message });
    }
};

// UPDATE Movimiento Stock
export const updateMovimientoStock = async (req: AuthRequest, res: Response) => {
    try {
        const { id, Status, ...otherFields } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.MOVIMIENTOS_STOCK}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (Status) updateData['Status_MS'] = Status;

        // Add more fields if needed for updates

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update Movimiento Stock Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update Movimiento Stock" });
    }
};

// =========================================================
// INYECCIONES PENDIENTES
// =========================================================

// Interface for Inyeccion Pendiente
export interface InyeccionPendiente {
    id: string;
    idUnivoco: string;         // IDUnivoco_IP
    fecha: string;             // Fecha_IP
    cantidadSku: string;       // CantidadSKU_IP
    cantidadTotal: string;     // CantidadTotal_IP
    status: string;            // Status_IP
    usuario: string;           // Usuario_IP
    cliente: string;           // Cliente_IP
    hora: string;              // Hora_IP
    mes: string;               // Mes_IP
    anio: string;              // Año_IP
    mesAnio: string;           // MesAño_IP
    versionApp: string;        // VersionApp_IP
    creadoPor: string;         // Created By
}

// GET Inyecciones Pendientes
export const getInyeccionesPendientes = async (req: AuthRequest, res: Response) => {
    try {
        const { idUnivoco, cliente } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.INYECCIONES_PENDIENTES}/items?expand=fields`;

        // Filter logic
        const filters: string[] = [];
        if (idUnivoco) filters.push(`fields/IDUnivoco_IP eq '${idUnivoco}'`);
        if (cliente) filters.push(`fields/Cliente_IP eq '${cliente}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allInyecciones: any[] = [];
        while (nextUrl && allInyecciones.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly"
                }
            });
            allInyecciones = allInyecciones.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }

        const inyecciones = allInyecciones.map((item: any) => ({
            id: item.id,
            idUnivoco: item.fields.IDUnivoco_IP,
            fecha: item.fields.Fecha_IP,
            cantidadSku: item.fields.CantidadSKU_IP,
            cantidadTotal: item.fields.CantidadTotal_IP,
            status: item.fields.Status_IP,
            usuario: item.fields.Usuario_IP,
            cliente: item.fields.Cliente_IP,
            hora: item.fields.Hora_IP,
            mes: item.fields.Mes_IP,
            anio: item.fields.A_x00f1_o_IP,
            mesAnio: item.fields.MesA_x00f1_o_IP,
            versionApp: item.fields.VersionApp_IP,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));

        res.json(inyecciones);

    } catch (error: any) {
        console.error("Error fetching Inyecciones Pendientes:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Inyecciones Pendientes" });
    }
};

// CREATE Inyeccion Pendiente
export const createInyeccionPendiente = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const {
            IDUnivoco, Fecha, CantidadSKU, CantidadTotal, Status, Usuario,
            Cliente, Hora, Mes, Anio, MesAnio, VersionApp
        } = req.body;

        // Basic validation
        if (!IDUnivoco) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.INYECCIONES_PENDIENTES}/items`;

        const newInyeccion = {
            fields: {
                Title: "[sumar]",
                IDUnivoco_IP: IDUnivoco,
                Fecha_IP: Fecha,
                CantidadSKU_IP: String(CantidadSKU),
                CantidadTotal_IP: String(CantidadTotal),
                Status_IP: Status,
                Usuario_IP: Usuario,
                Cliente_IP: Cliente,
                Hora_IP: Hora,
                Mes_IP: Mes,
                A_x00f1_o_IP: Anio,
                MesA_x00f1_o_IP: MesAnio,
                VersionApp_IP: VersionApp
            }
        };

        const response = await axios.post(url, newInyeccion, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create Inyeccion Pendiente Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create Inyeccion Pendiente", details: error.response?.data || error.message });
    }
};

// UPDATE Inyeccion Pendiente
export const updateInyeccionPendiente = async (req: AuthRequest, res: Response) => {
    try {
        const { id, Status, ...otherFields } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.INYECCIONES_PENDIENTES}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (Status) updateData['Status_IP'] = Status;

        // Add more fields if needed for updates

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update Inyeccion Pendiente Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update Inyeccion Pendiente" });
    }
};

// =========================================================
// DETALLE INYECCIONES
// =========================================================

// Interface for Detalle Inyeccion
export interface DetalleInyeccion {
    id: string;
    idUnivoco: string;         // IDUnivoco_DI
    articulo: string;          // Articulo_DI
    sku: string;               // SKU_DI
    concat: string;            // Concat_DI
    origen: string;            // Origen_DI
    subdeposito: string;       // Subdeposito_DI
    cantidadOriginal: string;  // CantidadOriginalPedida_DI
    cantidad: string;          // Cantidad_DI
    status: string;            // Status_DI
    usuario: string;           // Usuario_DI
    fecha: string;             // Fecha_DI
    mes: string;               // Mes_DI
    anio: string;              // Año_DI
    mesAnio: string;           // MesAño_DI
    hora: string;              // Hora_DI
    versionApp: string;        // VersionApp_DI
    creadoPor: string;         // Created By
}

// GET Detalle Inyecciones
export const getDetalleInyecciones = async (req: AuthRequest, res: Response) => {
    try {
        const { idUnivoco } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.DETALLES_INYECCIONES}/items?expand=fields`;

        // Filter logic
        const filters: string[] = [];
        if (idUnivoco) filters.push(`fields/IDUnivoco_DI eq '${idUnivoco}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allDetallesIny: any[] = [];
        while (nextUrl && allDetallesIny.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly"
                }
            });
            allDetallesIny = allDetallesIny.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }

        const detalles = allDetallesIny.map((item: any) => ({
            id: item.id,
            idUnivoco: item.fields.IDUnivoco_DI,
            articulo: item.fields.Articulo_DI,
            sku: item.fields.SKU_DI,
            concat: item.fields.Concat_DI,
            origen: item.fields.Origen_DI,
            subdeposito: item.fields.Subdeposito_DI,
            cantidadOriginal: item.fields.CantidadOriginalPedida_DI,
            cantidad: item.fields.Cantidad_DI,
            status: item.fields.Status_DI,
            usuario: item.fields.Usuario_DI,
            fecha: item.fields.Fecha_DI,
            mes: item.fields.Mes_DI,
            anio: item.fields.A_x00f1_o_DI,
            mesAnio: item.fields.MesA_x00f1_o_DI,
            hora: item.fields.Hora_DI,
            versionApp: item.fields.VersionApp_DI,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));

        res.json(detalles);

    } catch (error: any) {
        console.error("Error fetching Detalle Inyecciones:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Detalle Inyecciones" });
    }
};

// CREATE Detalle Inyeccion
export const createDetalleInyeccion = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const {
            IDUnivoco, Articulo, SKU, Concat, Origen, Subdeposito,
            CantidadOriginal, Cantidad, Status, Usuario, Fecha, Mes, Anio, MesAnio,
            Hora, VersionApp
        } = req.body;

        // Basic validation
        if (!IDUnivoco || !Articulo) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.DETALLES_INYECCIONES}/items`;

        const newDetalle = {
            fields: {
                Title: "[sumar]",
                IDUnivoco_DI: IDUnivoco,
                Articulo_DI: Articulo,
                SKU_DI: SKU,
                Concat_DI: Concat,
                Origen_DI: Origen,
                Subdeposito_DI: Subdeposito,
                CantidadOriginalPedida_DI: String(CantidadOriginal),
                Cantidad_DI: String(Cantidad),
                Status_DI: Status,
                Usuario_DI: Usuario,
                Fecha_DI: Fecha,
                Mes_DI: Mes,
                A_x00f1_o_DI: Anio,
                MesA_x00f1_o_DI: MesAnio,
                Hora_DI: Hora,
                VersionApp_DI: VersionApp
            }
        };

        const response = await axios.post(url, newDetalle, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create Detalle Inyeccion Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create Detalle Inyeccion", details: error.response?.data || error.message });
    }
};

// UPDATE Detalle Inyeccion
export const updateDetalleInyeccion = async (req: AuthRequest, res: Response) => {
    try {
        const { id, Status, ...otherFields } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.DETALLES_INYECCIONES}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (Status) updateData['Status_DI'] = Status;

        // Add more fields if needed for updates

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update Detalle Inyeccion Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update Detalle Inyeccion" });
    }
};

// =========================================================
// IMAGENES RECEPCIONES
// =========================================================

// Interface for Imagen Recepcion
export interface ImagenRecepcion {
    id: string;
    usuario: string;           // Usuario_IR
    fecha: string;             // Fecha_IR
    hora: string;              // Hora_IR
    idOrdenCompra: string;     // IdUnivocoOrdenCompra_IR
    idDetalleCompra: string;   // IdDetalleCompra_IR
    idRecepcion: string;       // IdRecepcion_IR
    imagen: string;            // Imagen_IR (Base64 or URL)
    tipo: string;              // Tipo_IR
    status: string;            // Status_IR
    versionApp: string;        // VersionApp_IR
    mesAnio: string;           // MesAño_IR
    creadoPor: string;         // Created By
}

// GET Imagenes Recepciones
export const getImagenesRecepciones = async (req: AuthRequest, res: Response) => {
    try {
        const { idOrdenCompra, idRecepcion } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.IMAGENES_RECEPCIONES}/items?expand=fields`;

        // Filter logic
        const filters: string[] = [];
        if (idOrdenCompra) filters.push(`fields/IdUnivocoOrdenCompra_IR eq '${idOrdenCompra}'`);
        if (idRecepcion) filters.push(`fields/IdRecepcion_IR eq '${idRecepcion}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allImagenes: any[] = [];
        while (nextUrl && allImagenes.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly"
                }
            });
            allImagenes = allImagenes.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }

        const imagenes = allImagenes.map((item: any) => ({
            id: item.id,
            usuario: item.fields.Usuario_IR,
            fecha: item.fields.Fecha_IR,
            hora: item.fields.Hora_IR,
            idOrdenCompra: item.fields.IdUnivocoOrdenCompra_IR,
            idDetalleCompra: item.fields.IdDetalleCompra_IR,
            idRecepcion: item.fields.IdRecepcion_IR,
            imagen: item.fields.Imagen_IR,
            tipo: item.fields.Tipo_IR,
            status: item.fields.Status_IR,
            versionApp: item.fields.VersionApp_IR,
            mesAnio: item.fields.MesA_x00f1_o_IR,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));

        res.json(imagenes);

    } catch (error: any) {
        console.error("Error fetching Imagenes Recepciones:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Imagenes Recepciones" });
    }
};

// CREATE Imagen Recepcion
export const createImagenRecepcion = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const {
            Usuario, Fecha, Hora, IdOrdenCompra, IdDetalleCompra, IdRecepcion,
            Imagen, Tipo, Status, VersionApp, MesAnio
        } = req.body;

        // Basic validation
        if (!IdOrdenCompra || !IdRecepcion || !Imagen) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.IMAGENES_RECEPCIONES}/items`;

        const newImagen = {
            fields: {
                Title: "[sumar]",
                Usuario_IR: Usuario,
                Fecha_IR: Fecha,
                Hora_IR: Hora,
                IdUnivocoOrdenCompra_IR: IdOrdenCompra,
                IdDetalleCompra_IR: IdDetalleCompra,
                IdRecepcion_IR: IdRecepcion,
                Imagen_IR: Imagen,
                Tipo_IR: Tipo,
                Status_IR: Status,
                VersionApp_IR: VersionApp,
                MesA_x00f1_o_IR: MesAnio
            }
        };

        const response = await axios.post(url, newImagen, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create Imagen Recepcion Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create Imagen Recepcion", details: error.response?.data || error.message });
    }
};

// UPDATE Imagen Recepcion
export const updateImagenRecepcion = async (req: AuthRequest, res: Response) => {
    try {
        const { id, Status, ...otherFields } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.IMAGENES_RECEPCIONES}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (Status) updateData['Status_IR'] = Status;

        // Add more fields if needed for updates

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update Imagen Recepcion Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update Imagen Recepcion" });
    }
};

// =========================================================
// FUNCIONALIDADES HOME
// =========================================================

// Interface for Funcionalidad Home
export interface FuncionalidadHome {
    id: string;
    titulo: string;            // Titulo
    idFh: string;              // ID_FH
    tipoApp: string;           // TipoApp_FH
    funcionalidad: string;     // Funcionalidad_FH
    admin: string;             // Admin_FH
    calidad: string;           // Calidad_FH
    costureraJefe: string;     // CostureraJefe_FH
    costureraOp: string;       // CostureraOP_FH
    produccion: string;        // Produccion_FH
    calidadOp: string;         // CalidadOp_FH
    deposito: string;          // Deposito_FH
    img: string;               // Img_FH
    imgSelected: string;       // ImgSelected_FH
    orden: string;             // Orden_FH
    status: string;            // Status_FH
    creadoPor: string;         // Created By
}

// GET Funcionalidades Home
export const getFuncionalidadesHome = async (req: AuthRequest, res: Response) => {
    try {
        const { tipoApp, status } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.FUNCIONALIDADES_HOME}/items?expand=fields`;

        // Filter logic
        const filters: string[] = [];
        if (tipoApp) filters.push(`fields/TipoApp_FH eq '${tipoApp}'`);
        if (status) filters.push(`fields/Status_FH eq '${status}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allFuncionalidades: any[] = [];
        while (nextUrl && allFuncionalidades.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly"
                }
            });
            allFuncionalidades = allFuncionalidades.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }

        const funcionalidades = allFuncionalidades.map((item: any) => ({
            id: item.id,
            titulo: item.fields.Title,
            idFh: item.fields.ID_FH,
            tipoApp: item.fields.TipoApp_FH,
            funcionalidad: item.fields.Funcionalidad_FH,
            admin: item.fields.Admin_FH,
            calidad: item.fields.Calidad_FH,
            costureraJefe: item.fields.CostureraJefe_FH,
            costureraOp: item.fields.CostureraOP_FH,
            produccion: item.fields.Produccion_FH,
            calidadOp: item.fields.CalidadOp_FH,
            deposito: item.fields.Deposito_FH,
            img: item.fields.Img_FH,
            imgSelected: item.fields.ImgSelected_FH,
            orden: item.fields.Orden_FH,
            status: item.fields.Status_FH,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));

        res.json(funcionalidades);

    } catch (error: any) {
        console.error("Error fetching Funcionalidades Home:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Funcionalidades Home" });
    }
};

// CREATE Funcionalidad Home
export const createFuncionalidadHome = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const {
            Titulo, ID_FH, TipoApp, Funcionalidad, Admin, Calidad, CostureraJefe,
            CostureraOP, Produccion, CalidadOp, Deposito, Img, ImgSelected, Orden, Status
        } = req.body;

        // Basic validation
        if (!Titulo || !ID_FH) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.FUNCIONALIDADES_HOME}/items`;

        const newFuncionalidad = {
            fields: {
                Title: Titulo,
                ID_FH: ID_FH,
                TipoApp_FH: TipoApp,
                Funcionalidad_FH: Funcionalidad,
                Admin_FH: Admin,
                Calidad_FH: Calidad,
                CostureraJefe_FH: CostureraJefe,
                CostureraOP_FH: CostureraOP,
                Produccion_FH: Produccion,
                CalidadOp_FH: CalidadOp,
                Deposito_FH: Deposito,
                Img_FH: Img,
                ImgSelected_FH: ImgSelected,
                Orden_FH: String(Orden), // Ensure string
                Status_FH: Status
            }
        };

        const response = await axios.post(url, newFuncionalidad, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create Funcionalidad Home Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create Funcionalidad Home", details: error.response?.data || error.message });
    }
};

// UPDATE Funcionalidad Home
export const updateFuncionalidadHome = async (req: AuthRequest, res: Response) => {
    try {
        const { id, Status, Orden, ...otherFields } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.FUNCIONALIDADES_HOME}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (Status) updateData['Status_FH'] = Status;
        if (Orden) updateData['Orden_FH'] = String(Orden);

        // Add more fields if needed for updates

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update Funcionalidad Home Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update Funcionalidad Home" });
    }
};

// =========================================================
// ARTICULOS
// =========================================================

// Interface for Articulo
export interface Articulo {
    id: string;
    titulo: string;            // Title
    sku: string;               // SKU
    concat: string;            // Concat_A
    tipoPrenda: string;        // TipoPrenda_A
    descripcion: string;       // Descripcion_A
    status: string;            // Status_A
    principal: string;         // Principal_A
    familia: string;           // Familia_A
    codigoCliente: string;     // CodigoCliente_A
    nOrden: string;            // NOrden_A
    proveedores: string;       // Proveedores_A
    precio: string;            // Precio_A (String for consistency)
    creadoPor: string;         // Created By
}

// GET Articulos
export const getArticulos = async (req: AuthRequest, res: Response) => {
    try {
        const { sku, status } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.ARTICULOS}/items?expand=fields`;

        // Filter logic
        const filters: string[] = [];
        if (sku) filters.push(`fields/SKU eq '${sku}'`);
        if (status) filters.push(`fields/Status_A eq '${status}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allArticulos: any[] = [];
        while (nextUrl && allArticulos.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: { Authorization: `Bearer ${token}`, "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly" }
            });
            allArticulos = allArticulos.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }
        const articulos = allArticulos.map((item: any) => ({
            id: item.id,
            titulo: item.fields.Title,
            sku: item.fields.SKU,
            concat: item.fields.Concat_A,
            tipoPrenda: item.fields.TipoPrenda_A,
            descripcion: item.fields.Descripcion_A,
            status: item.fields.Status_A,
            principal: item.fields.Principal_A,
            familia: item.fields.Familia_A,
            codigoCliente: item.fields.CodigoCliente_A,
            nOrden: item.fields.NOrden_A,
            proveedores: item.fields.Proveedores_A,
            precio: item.fields.Precio_A,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));
        res.json(articulos);

    } catch (error: any) {
        console.error("Error fetching Articulos:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Articulos" });
    }
};

// CREATE Articulo
export const createArticulo = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const {
            Titulo, SKU, Concat, TipoPrenda, Descripcion, Status,
            Principal, Familia, CodigoCliente, NOrden, Proveedores, Precio
        } = req.body;

        // Basic validation
        if (!Titulo || !SKU) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.ARTICULOS}/items`;

        const newArticulo = {
            fields: {
                Title: Titulo,
                SKU: SKU,
                Concat_A: Concat,
                TipoPrenda_A: TipoPrenda,
                Descripcion_A: Descripcion,
                Status_A: Status,
                Principal_A: Principal,
                Familia_A: Familia,
                CodigoCliente_A: CodigoCliente,
                NOrden_A: String(NOrden), // Ensure string
                Proveedores_A: Proveedores,
                Precio_A: String(Precio)  // Ensure string
            }
        };

        const response = await axios.post(url, newArticulo, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create Articulo Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create Articulo", details: error.response?.data || error.message });
    }
};

// UPDATE Articulo
export const updateArticulo = async (req: AuthRequest, res: Response) => {
    try {
        const {
            id, Status, Precio, SKU, Concat, TipoPrenda,
            Descripcion, Principal, Familia, CodigoCliente, NOrden, Proveedores
        } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.ARTICULOS}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (Status) updateData['Status_A'] = Status;
        if (Precio !== undefined) updateData['Precio_A'] = String(Precio);
        if (SKU) updateData['SKU'] = SKU;
        if (Concat) updateData['Concat_A'] = Concat;
        if (TipoPrenda) updateData['TipoPrenda_A'] = TipoPrenda;
        if (Descripcion) updateData['Descripcion_A'] = Descripcion;
        if (Principal) updateData['Principal_A'] = Principal;
        if (Familia) updateData['Familia_A'] = Familia;
        if (CodigoCliente) updateData['CodigoCliente_A'] = CodigoCliente;
        if (NOrden !== undefined) updateData['NOrden_A'] = String(NOrden);
        if (Proveedores) updateData['Proveedores_A'] = Proveedores;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update Articulo Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update Articulo" });
    }
};

// =========================================================
// SEGMENTOS METRICAS
// =========================================================

// Interface for SegmentoMetrica
export interface SegmentoMetrica {
    id: string;
    titulo: string;            // Title
    segmento: string;          // Segmento_SM
    perfil: string;            // Perfil_SM
    numOrden: string;          // NumOrden_SM (String for consistency)
    creadoPor: string;         // Created By
}

// GET SegmentosMetricas
export const getSegmentosMetricas = async (req: AuthRequest, res: Response) => {
    try {
        const { segmento, perfil } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.SEGMENTOS_METRICAS}/items?expand=fields`;

        // Filter logic
        const filters: string[] = [];
        if (segmento) filters.push(`fields/Segmento_SM eq '${segmento}'`);
        if (perfil) filters.push(`fields/Perfil_SM eq '${perfil}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allSegMetricas: any[] = [];
        while (nextUrl && allSegMetricas.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: { Authorization: `Bearer ${token}`, "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly" }
            });
            allSegMetricas = allSegMetricas.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }
        const segmentos = allSegMetricas.map((item: any) => ({
            id: item.id,
            titulo: item.fields.Title,
            segmento: item.fields.Segmento_SM,
            perfil: item.fields.Perfil_SM,
            numOrden: item.fields.NumOrden_SM,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));
        res.json(segmentos);

    } catch (error: any) {
        console.error("Error fetching Segmentos Metricas:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Segmentos Metricas" });
    }
};

// CREATE SegmentoMetrica
export const createSegmentoMetrica = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const {
            Titulo, Segmento, Perfil, NumOrden
        } = req.body;

        // Basic validation
        if (!Titulo || !Segmento) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.SEGMENTOS_METRICAS}/items`;

        const newSegmento = {
            fields: {
                Title: Titulo,
                Segmento_SM: Segmento,
                Perfil_SM: Perfil,
                NumOrden_SM: String(NumOrden) // Ensure string
            }
        };

        const response = await axios.post(url, newSegmento, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create Segmento Metrica Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create Segmento Metrica", details: error.response?.data || error.message });
    }
};

// UPDATE SegmentoMetrica
export const updateSegmentoMetrica = async (req: AuthRequest, res: Response) => {
    try {
        const { id, NumOrden, ...otherFields } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.SEGMENTOS_METRICAS}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (NumOrden) updateData['NumOrden_SM'] = String(NumOrden);

        // Add more fields if needed for updates

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update Segmento Metrica Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update Segmento Metrica" });
    }
};

// =========================================================
// CLIENTES
// =========================================================

// Interface for Cliente
export interface Cliente {
    id: string;
    titulo: string;            // Title (usually same as Codigo or empty, depending on usage)
    codigo: string;            // Codigo_C
    nombre: string;            // Nombre_C
    concat: string;            // ConcatCodigoCliente_C
    status: string;            // Status_C
    creadoPor: string;         // Created By
}

// GET Clientes
export const getClientes = async (req: AuthRequest, res: Response) => {
    try {
        const { codigo, status } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.CLIENTES}/items?expand=fields`;

        // Filter logic
        const filters: string[] = [];
        if (codigo) filters.push(`fields/Codigo_C eq '${codigo}'`);
        if (status) filters.push(`fields/Status_C eq '${status}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allClientes: any[] = [];
        while (nextUrl && allClientes.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: { Authorization: `Bearer ${token}`, "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly" }
            });
            allClientes = allClientes.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }
        const clientes = allClientes.map((item: any) => ({
            id: item.id,
            titulo: item.fields.Title,
            codigo: item.fields.Codigo_C,
            nombre: item.fields.Nombre_C,
            concat: item.fields.ConcatCodigoCliente_C,
            status: item.fields.Status_C,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));
        res.json(clientes);

    } catch (error: any) {
        console.error("Error fetching Clientes:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Clientes" });
    }
};

// CREATE Cliente
export const createCliente = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const {
            Titulo, Codigo, Nombre, Concat, Status
        } = req.body;

        // Basic validation
        if (!Codigo || !Nombre) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.CLIENTES}/items`;

        const newCliente = {
            fields: {
                Title: Titulo || Codigo, // Use Codigo as Title if not provided
                Codigo_C: Codigo,
                Nombre_C: Nombre,
                ConcatCodigoCliente_C: Concat,
                Status_C: Status
            }
        };

        const response = await axios.post(url, newCliente, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create Cliente Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create Cliente", details: error.response?.data || error.message });
    }
};

// UPDATE Cliente
export const updateCliente = async (req: AuthRequest, res: Response) => {
    try {
        const { id, Status, ...otherFields } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.CLIENTES}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (Status) updateData['Status_C'] = Status;

        // Add more fields if needed for updates

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update Cliente Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update Cliente" });
    }
};

// =========================================================
// SEGMENTOS APROBACIONES
// =========================================================

// Interface for SegmentoAprobacion
export interface SegmentoAprobacion {
    id: string;
    titulo: string;            // Title
    segmento: string;          // Segmento_SA
    admin: string;             // Admin_SA
    calidad: string;           // Calidad_SA
    costureraOperaria: string; // CostureraOperaria_SA (Assumed based on pattern)
    costureraJefa: string;     // CostureraJefa_SA
    produccion: string;        // Produccion_SA
    numOrden: string;          // NumOrden_SA (String for consistency)
    creadoPor: string;         // Created By
}

// GET SegmentosAprobaciones
export const getSegmentosAprobaciones = async (req: AuthRequest, res: Response) => {
    try {
        const { segmento } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.SEGMENTOS_APROBACIONES}/items?expand=fields`;

        // Filter logic
        const filters: string[] = [];
        if (segmento) filters.push(`fields/Segmento_SA eq '${segmento}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allSegAprobaciones: any[] = [];
        while (nextUrl && allSegAprobaciones.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: { Authorization: `Bearer ${token}`, "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly" }
            });
            allSegAprobaciones = allSegAprobaciones.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }
        const segmentos = allSegAprobaciones.map((item: any) => ({
            id: item.id,
            titulo: item.fields.Title,
            segmento: item.fields.Segmento_SA,
            admin: item.fields.Admin_SA,
            calidad: item.fields.Calidad_SA,
            costureraOperaria: item.fields.CostureraOperaria_SA,
            costureraJefa: item.fields.CostureraJefa_SA,
            produccion: item.fields.Produccion_SA,
            numOrden: item.fields.NumOrden_SA,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));
        res.json(segmentos);

    } catch (error: any) {
        console.error("Error fetching Segmentos Aprobaciones:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Segmentos Aprobaciones" });
    }
};

// CREATE SegmentoAprobacion
export const createSegmentoAprobacion = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const {
            Titulo, Segmento, Admin, Calidad, CostureraOperaria, CostureraJefa, Produccion, NumOrden
        } = req.body;

        // Basic validation
        if (!Titulo || !Segmento) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.SEGMENTOS_APROBACIONES}/items`;

        const newSegmento = {
            fields: {
                Title: Titulo,
                Segmento_SA: Segmento,
                Admin_SA: Admin,
                Calidad_SA: Calidad,
                CostureraOperaria_SA: CostureraOperaria,
                CostureraJefa_SA: CostureraJefa,
                Produccion_SA: Produccion,
                NumOrden_SA: String(NumOrden) // Ensure string
            }
        };

        const response = await axios.post(url, newSegmento, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create Segmento Aprobacion Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create Segmento Aprobacion", details: error.response?.data || error.message });
    }
};

// UPDATE SegmentoAprobacion
export const updateSegmentoAprobacion = async (req: AuthRequest, res: Response) => {
    try {
        const { id, NumOrden, Admin, Calidad, ...otherFields } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.SEGMENTOS_APROBACIONES}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (NumOrden) updateData['NumOrden_SA'] = String(NumOrden);
        if (Admin) updateData['Admin_SA'] = Admin;
        if (Calidad) updateData['Calidad_SA'] = Calidad;

        // Add more fields if needed for updates

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update Segmento Aprobacion Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update Segmento Aprobacion" });
    }
};

// =========================================================
// PROVEEDORES
// =========================================================

// Interface for Proveedor
export interface Proveedor {
    id: string;
    titulo: string;            // Title
    proveedor: string;         // Proveedor_P
    segmento: string;          // Segmento_P
    moneda: string;            // Moneda_P
    emails: string;            // Emails_P
    telefono: string;          // Telefono_P
    status: string;            // Status_P
    creadoPor: string;         // Created By
}

// GET Proveedores
export const getProveedores = async (req: AuthRequest, res: Response) => {
    try {
        const { proveedor, status } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.PROVEEDORES}/items?expand=fields`;

        // Filter logic
        const filters: string[] = [];
        if (proveedor) filters.push(`fields/Proveedor_P eq '${proveedor}'`);
        if (status) filters.push(`fields/Status_P eq '${status}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allProveedores: any[] = [];
        while (nextUrl && allProveedores.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: { Authorization: `Bearer ${token}`, "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly" }
            });
            allProveedores = allProveedores.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }
        const proveedores = allProveedores.map((item: any) => ({
            id: item.id,
            titulo: item.fields.Title,
            proveedor: item.fields.Proveedor_P,
            segmento: item.fields.Segmento_P,
            moneda: item.fields.Moneda_P,
            emails: item.fields.Emails_P,
            telefono: item.fields.Telefono_P,
            status: item.fields.Status_P,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));
        res.json(proveedores);

    } catch (error: any) {
        console.error("Error fetching Proveedores:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Proveedores" });
    }
};

// CREATE Proveedor
export const createProveedor = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const {
            Titulo, Proveedor, Segmento, Moneda, Emails, Telefono, Status
        } = req.body;

        // Basic validation
        if (!Titulo || !Proveedor) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.PROVEEDORES}/items`;

        const newProveedor = {
            fields: {
                Title: Titulo,
                Proveedor_P: Proveedor,
                Segmento_P: Segmento,
                Moneda_P: Moneda,
                Emails_P: Emails,
                Telefono_P: Telefono,
                Status_P: Status
            }
        };

        const response = await axios.post(url, newProveedor, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create Proveedor Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create Proveedor", details: error.response?.data || error.message });
    }
};

// UPDATE Proveedor
export const updateProveedor = async (req: AuthRequest, res: Response) => {
    try {
        const { id, Status, Emails, Telefono, Proveedor, Segmento, Moneda } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.PROVEEDORES}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (Status) updateData['Status_P'] = Status;
        if (Emails) updateData['Emails_P'] = Emails;
        if (Telefono) updateData['Telefono_P'] = Telefono;
        if (Proveedor) updateData['Proveedor_P'] = Proveedor;
        if (Segmento) updateData['Segmento_P'] = Segmento;
        if (Moneda) updateData['Moneda_P'] = Moneda;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update Proveedor Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update Proveedor" });
    }
};

// =========================================================
// EMAILS
// =========================================================

// Interface for Email
export interface Email {
    id: string;
    titulo: string;            // Title
    modulo: string;            // Modulo_E
    emailConcat: string;       // EmailConcat_E
    copiaOculta: string;       // CopiaOculta_E
    status: string;            // Status_E
    creadoPor: string;         // Created By
}

// GET Emails
export const getEmails = async (req: AuthRequest, res: Response) => {
    try {
        const { modulo, status } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.EMAILS}/items?expand=fields`;

        // Filter logic
        const filters: string[] = [];
        if (modulo) filters.push(`fields/Modulo_E eq '${modulo}'`);
        if (status) filters.push(`fields/Status_E eq '${status}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allEmails: any[] = [];
        while (nextUrl && allEmails.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: { Authorization: `Bearer ${token}`, "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly" }
            });
            allEmails = allEmails.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }
        const emails = allEmails.map((item: any) => ({
            id: item.id,
            titulo: item.fields.Title,
            modulo: item.fields.Modulo_E,
            emailConcat: item.fields.EmailConcat_E,
            copiaOculta: item.fields.CopiaOculta_E,
            status: item.fields.Status_E,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));
        res.json(emails);

    } catch (error: any) {
        console.error("Error fetching Emails:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Emails" });
    }
};

// CREATE Email
export const createEmail = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const {
            Titulo, Modulo, EmailConcat, CopiaOculta, Status
        } = req.body;

        // Basic validation
        if (!Titulo || !Modulo) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.EMAILS}/items`;

        const newEmail = {
            fields: {
                Title: Titulo,
                Modulo_E: Modulo,
                EmailConcat_E: EmailConcat,
                CopiaOculta_E: CopiaOculta,
                Status_E: Status
            }
        };

        const response = await axios.post(url, newEmail, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create Email Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create Email", details: error.response?.data || error.message });
    }
};

// UPDATE Email
export const updateEmail = async (req: AuthRequest, res: Response) => {
    try {
        const { id, Status, EmailConcat, CopiaOculta, ...otherFields } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.EMAILS}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (Status) updateData['Status_E'] = Status;
        if (EmailConcat) updateData['EmailConcat_E'] = EmailConcat;
        if (CopiaOculta) updateData['CopiaOculta_E'] = CopiaOculta;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update Email Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update Email" });
    }
};

// =========================================================
// FAMILIAS
// =========================================================

// Interface for Familia
export interface Familia {
    id: string;
    titulo: string;            // Title
    familia: string;           // Familia_F
    su: string;                // Su_F
    concatFamiliaSu: string;   // ConcatFamiliaSu_F
    status: string;            // Status_F
    creadoPor: string;         // Created By
}

// GET Familias
export const getFamilias = async (req: AuthRequest, res: Response) => {
    try {
        const { familia, status } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.FAMILIAS}/items?expand=fields`;

        // Filter logic
        const filters: string[] = [];
        if (familia) filters.push(`fields/Familia_F eq '${familia}'`);
        if (status) filters.push(`fields/Status_F eq '${status}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allFamilias: any[] = [];
        while (nextUrl && allFamilias.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: { Authorization: `Bearer ${token}`, "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly" }
            });
            allFamilias = allFamilias.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }
        const familias = allFamilias.map((item: any) => ({
            id: item.id,
            titulo: item.fields.Title,
            familia: item.fields.Familia_F,
            su: item.fields.Su_F,
            concatFamiliaSu: item.fields.ConcatFamiliaSu_F,
            status: item.fields.Status_F,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));
        res.json(familias);

    } catch (error: any) {
        console.error("Error fetching Familias:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Familias" });
    }
};

// CREATE Familia
export const createFamilia = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const {
            Titulo, Familia, Su, ConcatFamiliaSu, Status
        } = req.body;

        // Basic validation
        if (!Titulo || !Familia) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.FAMILIAS}/items`;

        const newFamilia = {
            fields: {
                Title: Titulo,
                Familia_F: Familia,
                Su_F: Su,
                ConcatFamiliaSu_F: ConcatFamiliaSu,
                Status_F: Status
            }
        };

        const response = await axios.post(url, newFamilia, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create Familia Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create Familia", details: error.response?.data || error.message });
    }
};

// UPDATE Familia
export const updateFamilia = async (req: AuthRequest, res: Response) => {
    try {
        const { id, Status, ...otherFields } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.FAMILIAS}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (Status) updateData['Status_F'] = Status;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update Familia Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update Familia" });
    }
};

// =========================================================
// PRINCIPAL
// =========================================================

// Interface for Principal
export interface Principal {
    id: string;
    titulo: string;            // Title
    codigo: string;            // Codigo_F
    principal: string;         // Principal_F
    concatPrincipalCodigo: string; // ConcatPrincipalCodigo_P (assumed)
    status: string;            // Status_P
    creadoPor: string;         // Created By
}

// GET Principales
export const getPrincipales = async (req: AuthRequest, res: Response) => {
    try {
        const { codigo, status } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.PRINCIPAL}/items?expand=fields`;

        // Filter logic
        const filters: string[] = [];
        if (codigo) filters.push(`fields/Codigo_F eq '${codigo}'`);
        if (status) filters.push(`fields/Status_P eq '${status}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allPrincipales: any[] = [];
        while (nextUrl && allPrincipales.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: { Authorization: `Bearer ${token}`, "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly" }
            });
            allPrincipales = allPrincipales.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }
        const principales = allPrincipales.map((item: any) => ({
            id: item.id,
            titulo: item.fields.Title,
            codigo: item.fields.Codigo_F,
            principal: item.fields.Principal_F,
            concatPrincipalCodigo: item.fields.ConcatPrincipalCodigo_P,
            status: item.fields.Status_P,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));
        res.json(principales);

    } catch (error: any) {
        console.error("Error fetching Principales:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Principales" });
    }
};

// CREATE Principal
export const createPrincipal = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const {
            Titulo, Codigo, Principal, ConcatPrincipalCodigo, Status
        } = req.body;

        // Basic validation
        if (!Titulo || !Codigo) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.PRINCIPAL}/items`;

        const newPrincipal = {
            fields: {
                Title: Titulo,
                Codigo_F: Codigo,
                Principal_F: Principal,
                ConcatPrincipalCodigo_P: ConcatPrincipalCodigo,
                Status_P: Status
            }
        };

        const response = await axios.post(url, newPrincipal, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create Principal Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create Principal", details: error.response?.data || error.message });
    }
};

// UPDATE Principal
export const updatePrincipal = async (req: AuthRequest, res: Response) => {
    try {
        const { id, Status, ...otherFields } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.PRINCIPAL}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (Status) updateData['Status_P'] = Status;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update Principal Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update Principal" });
    }
};

// =========================================================
// ALMACENES UNIVOCOS
// =========================================================

// Interface for AlmacenUnivoco
export interface AlmacenUnivoco {
    id: string;
    titulo: string;            // Title
    almacenes: string;         // Almacenes_AU
    creadoPor: string;         // Created By
}

// GET Almacenes Univocos
export const getAlmacenesUnivocos = async (req: AuthRequest, res: Response) => {
    try {
        const { almacenes } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.ALMACENES_UNIVOCOS}/items?expand=fields`;

        // Filter logic
        const filters: string[] = [];
        if (almacenes) filters.push(`fields/Almacenes_AU eq '${almacenes}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allAlmacenesUnivocos: any[] = [];
        while (nextUrl && allAlmacenesUnivocos.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: { Authorization: `Bearer ${token}`, "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly" }
            });
            allAlmacenesUnivocos = allAlmacenesUnivocos.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }
        const items = allAlmacenesUnivocos.map((item: any) => ({
            id: item.id,
            titulo: item.fields.Title,
            almacenes: item.fields.Almacenes_AU,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));
        res.json(items);

    } catch (error: any) {
        console.error("Error fetching Almacenes Univocos:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Almacenes Univocos" });
    }
};

// CREATE AlmacenUnivoco
export const createAlmacenUnivoco = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const { Titulo, Almacenes } = req.body;

        // Basic validation
        if (!Titulo) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.ALMACENES_UNIVOCOS}/items`;

        const newItem = {
            fields: {
                Title: Titulo,
                Almacenes_AU: Almacenes
            }
        };

        const response = await axios.post(url, newItem, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create AlmacenUnivoco Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create AlmacenUnivoco", details: error.response?.data || error.message });
    }
};

// UPDATE AlmacenUnivoco
export const updateAlmacenUnivoco = async (req: AuthRequest, res: Response) => {
    try {
        const { id, Almacenes, ...otherFields } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.ALMACENES_UNIVOCOS}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (Almacenes) updateData['Almacenes_AU'] = Almacenes;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update AlmacenUnivoco Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update AlmacenUnivoco" });
    }
};

// =========================================================
// TIPO PRENDAS
// =========================================================

// Interface for TipoPrenda
export interface TipoPrenda {
    id: string;
    titulo: string;            // Title
    tipoPrendas: string;       // TipoPrendas_TP
    status: string;            // Status_TP
    creadoPor: string;         // Created By
}

// GET Tipo Prendas
export const getTipoPrendas = async (req: AuthRequest, res: Response) => {
    try {
        const { tipoPrendas, status } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.TIPO_PRENDAS}/items?expand=fields`;

        // Filter logic
        const filters: string[] = [];
        if (tipoPrendas) filters.push(`fields/TipoPrendas_TP eq '${tipoPrendas}'`);
        if (status) filters.push(`fields/Status_TP eq '${status}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allTipoPrendas: any[] = [];
        while (nextUrl && allTipoPrendas.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: { Authorization: `Bearer ${token}`, "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly" }
            });
            allTipoPrendas = allTipoPrendas.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }
        const items = allTipoPrendas.map((item: any) => ({
            id: item.id,
            titulo: item.fields.Title,
            tipoPrendas: item.fields.TipoPrendas_TP,
            status: item.fields.Status_TP,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));
        res.json(items);

    } catch (error: any) {
        console.error("Error fetching Tipo Prendas:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Tipo Prendas" });
    }
};

// CREATE TipoPrenda
export const createTipoPrenda = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const { Titulo, TipoPrendas, Status } = req.body;

        // Basic validation
        if (!Titulo || !TipoPrendas) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.TIPO_PRENDAS}/items`;

        const newItem = {
            fields: {
                Title: Titulo,
                TipoPrendas_TP: TipoPrendas,
                Status_TP: Status
            }
        };

        const response = await axios.post(url, newItem, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create TipoPrenda Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create TipoPrenda", details: error.response?.data || error.message });
    }
};

// UPDATE TipoPrenda
export const updateTipoPrenda = async (req: AuthRequest, res: Response) => {
    try {
        const { id, Status, ...otherFields } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.TIPO_PRENDAS}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (Status) updateData['Status_TP'] = Status;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update TipoPrenda Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update TipoPrenda" });
    }
};

// =========================================================
// CODIGO PUNTOS
// =========================================================

// Interface for CodigoPunto
export interface CodigoPunto {
    id: string;
    titulo: string;            // Title
    codigo: string;            // Codigo_CP
    conPunto: string;          // ConPunto_CP
    status: string;            // Status_CP
    creadoPor: string;         // Created By
}

// GET Codigo Puntos
export const getCodigoPuntos = async (req: AuthRequest, res: Response) => {
    try {
        const { codigo, status } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.CODIGO_PUNTOS}/items?expand=fields`;

        // Filter logic
        const filters: string[] = [];
        if (codigo) filters.push(`fields/Codigo_CP eq '${codigo}'`);
        if (status) filters.push(`fields/Status_CP eq '${status}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allCodigoPuntos: any[] = [];
        while (nextUrl && allCodigoPuntos.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: { Authorization: `Bearer ${token}`, "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly" }
            });
            allCodigoPuntos = allCodigoPuntos.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }
        const items = allCodigoPuntos.map((item: any) => ({
            id: item.id,
            titulo: item.fields.Title,
            codigo: item.fields.Codigo_CP,
            conPunto: item.fields.ConPunto_CP,
            status: item.fields.Status_CP,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));
        res.json(items);

    } catch (error: any) {
        console.error("Error fetching Codigo Puntos:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Codigo Puntos" });
    }
};

// CREATE CodigoPunto
export const createCodigoPunto = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const { Titulo, Codigo, ConPunto, Status } = req.body;

        // Basic validation
        if (!Titulo || !Codigo) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.CODIGO_PUNTOS}/items`;

        const newItem = {
            fields: {
                Title: Titulo,
                Codigo_CP: Codigo,
                ConPunto_CP: ConPunto,
                Status_CP: Status
            }
        };

        const response = await axios.post(url, newItem, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create CodigoPunto Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create CodigoPunto", details: error.response?.data || error.message });
    }
};

// UPDATE CodigoPunto
export const updateCodigoPunto = async (req: AuthRequest, res: Response) => {
    try {
        const { id, Status, ConPunto, ...otherFields } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.CODIGO_PUNTOS}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (Status) updateData['Status_CP'] = Status;
        if (ConPunto) updateData['ConPunto_CP'] = ConPunto;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update CodigoPunto Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update CodigoPunto" });
    }
};

// =========================================================
// ARTICULOS NUEVOS
// =========================================================

// Interface for ArticuloNuevo
export interface ArticuloNuevo {
    id: string;
    titulo: string;            // Title
    sku: string;               // SKU
    concat: string;            // Concat_A
    creado: string;            // Creado_OD
    tipoPrenda: string;        // TipoPrenda_A
    descripcion: string;       // Descripcion_A
    status: string;            // Status_A
    principal: string;         // Principal_A
    familia: string;           // Familia_A
    codigoCliente: string;     // CodigoCliente_A
    nOrden: string;            // NOrden_A
    countId: string;           // CountID
    creadoPor: string;         // Created By
}

// GET Articulos Nuevos
export const getArticulosNuevos = async (req: AuthRequest, res: Response) => {
    try {
        const { sku, status, codigoCliente } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.ARTICULOS_NUEVOS}/items?expand=fields`;

        // Filter logic
        const filters: string[] = [];
        if (sku) filters.push(`fields/SKU eq '${sku}'`);
        if (status) filters.push(`fields/Status_A eq '${status}'`);
        if (codigoCliente) filters.push(`fields/CodigoCliente_A eq '${codigoCliente}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allArticulosNuevos: any[] = [];
        while (nextUrl && allArticulosNuevos.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: { Authorization: `Bearer ${token}`, "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly" }
            });
            allArticulosNuevos = allArticulosNuevos.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }
        const items = allArticulosNuevos.map((item: any) => ({
            id: item.id,
            titulo: item.fields.Title,
            sku: item.fields.SKU,
            concat: item.fields.Concat_A,
            creado: item.fields.Creado_OD,
            tipoPrenda: item.fields.TipoPrenda_A,
            descripcion: item.fields.Descripcion_A,
            status: item.fields.Status_A,
            principal: item.fields.Principal_A,
            familia: item.fields.Familia_A,
            codigoCliente: item.fields.CodigoCliente_A,
            nOrden: item.fields.NOrden_A,
            countId: item.fields.CountID,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));

        res.json(items);

    } catch (error: any) {
        console.error("Error fetching Articulos Nuevos:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Articulos Nuevos" });
    }
};

// CREATE ArticuloNuevo
export const createArticuloNuevo = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const {
            Titulo, SKU, Concat, Creado, TipoPrenda, Descripcion,
            Status, Principal, Familia, CodigoCliente, NOrden, CountID
        } = req.body;

        // Basic validation
        if (!Titulo || !SKU) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.ARTICULOS_NUEVOS}/items`;

        const newItem = {
            fields: {
                Title: Titulo,
                SKU: SKU,
                Concat_A: Concat,
                Creado_OD: Creado,
                TipoPrenda_A: TipoPrenda,
                Descripcion_A: Descripcion,
                Status_A: Status,
                Principal_A: Principal,
                Familia_A: Familia,
                CodigoCliente_A: CodigoCliente,
                NOrden_A: String(NOrden),
                CountID: String(CountID)
            }
        };

        const response = await axios.post(url, newItem, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create ArticuloNuevo Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create ArticuloNuevo", details: error.response?.data || error.message });
    }
};

// UPDATE ArticuloNuevo
export const updateArticuloNuevo = async (req: AuthRequest, res: Response) => {
    try {
        const { id, Status, NOrden, CountID, ...otherFields } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.ARTICULOS_NUEVOS}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (Status) updateData['Status_A'] = Status;
        if (NOrden) updateData['NOrden_A'] = String(NOrden);
        if (CountID) updateData['CountID'] = String(CountID);

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update ArticuloNuevo Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update ArticuloNuevo" });
    }
};

// =========================================================
// RESUMEN INGRESOS EGRESOS
// =========================================================

// Interface for ResumenIngresoEgreso
export interface ResumenIngresoEgreso {
    id: string;
    idUnivoco: string;         // IDUnivoco_RIE
    tipo: string;              // Tipo_RIE
    articulos: string;         // Articulos_RIE
    total: string;             // Total_RIE
    subdeposito: string;       // Subdeposito_RIE
    usuario: string;           // Usuario_RIE
    fecha: string;             // Fecha_RIE
    mes: string;               // Mes_RIE
    anio: string;              // Año_RIE
    mesAnio: string;           // MesAño_RIE
    hora: string;              // Hora_RIE
    status: string;            // Status_RIE
    versionApp: string;        // VersionApp_RIE
    creadoPor: string;         // Created By
}

// GET Resumen Ingresos Egresos
export const getResumenIngresosEgresos = async (req: AuthRequest, res: Response) => {
    try {
        const { idUnivoco, tipo } = req.query;
        const token = await getAppToken();

        let url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.RESUMEN_INGRESOS_EGRESOS}/items?expand=fields`;

        const filters: string[] = [];
        if (idUnivoco) filters.push(`fields/IDUnivoco_RIE eq '${idUnivoco}'`);
        if (tipo) filters.push(`fields/Tipo_RIE eq '${tipo}'`);

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        let nextUrl: string | null = url + '&$top=999';
        let allItems: any[] = [];
        while (nextUrl && allItems.length < 3000) {
            const response: any = await axios.get(nextUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly"
                }
            });
            allItems = allItems.concat(response.data.value);
            nextUrl = response.data['@odata.nextLink'] || null;
        }

        const items = allItems.map((item: any) => ({
            id: item.id,
            idUnivoco: item.fields.IDUnivoco_RIE,
            tipo: item.fields.Tipo_RIE,
            articulos: item.fields.Articulos_RIE,
            total: item.fields.Total_RIE,
            subdeposito: item.fields.Subdeposito_RIE,
            usuario: item.fields.Usuario_RIE,
            fecha: item.fields.Fecha_RIE,
            mes: item.fields.Mes_RIE,
            anio: item.fields.A_x00f1_o_RIE,
            mesAnio: item.fields.MesA_x00f1_o_RIE,
            hora: item.fields.Hora_RIE,
            status: item.fields.Status_RIE,
            versionApp: item.fields.VersionApp_RIE,
            creadoPor: item.createdBy?.user?.displayName || "Unknown"
        }));

        res.json(items);

    } catch (error: any) {
        console.error("Error fetching Resumen Ingresos Egresos:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Resumen Ingresos Egresos" });
    }
};

// CREATE Resumen Ingreso Egreso
export const createResumenIngresoEgreso = async (req: AuthRequest, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(400).json({ error: "Identity missing" });

        const {
            IDUnivoco, Tipo, Articulos, Total, Subdeposito,
            Usuario, Fecha, Mes, Anio, MesAnio, Hora, Status, VersionApp
        } = req.body;

        if (!IDUnivoco) {
            return res.status(400).json({ error: "Missing required fields: IDUnivoco" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.RESUMEN_INGRESOS_EGRESOS}/items`;

        const newItem = {
            fields: {
                Title: "[sumar]",
                IDUnivoco_RIE: IDUnivoco,
                Tipo_RIE: Tipo,
                Articulos_RIE: Articulos !== undefined ? String(Articulos) : undefined,
                Total_RIE: Total !== undefined ? String(Total) : undefined,
                Subdeposito_RIE: Subdeposito,
                Usuario_RIE: Usuario,
                Fecha_RIE: Fecha,
                Mes_RIE: Mes,
                A_x00f1_o_RIE: Anio,
                MesA_x00f1_o_RIE: MesAnio,
                Hora_RIE: Hora,
                Status_RIE: Status,
                VersionApp_RIE: VersionApp
            }
        };

        const response = await axios.post(url, newItem, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(201).json(response.data);

    } catch (error: any) {
        console.error("Create Resumen Ingreso Egreso Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create Resumen Ingreso Egreso", details: error.response?.data || error.message });
    }
};

// UPDATE Resumen Ingreso Egreso
export const updateResumenIngresoEgreso = async (req: AuthRequest, res: Response) => {
    try {
        const {
            id, IDUnivoco, Tipo, Articulos, Total, Subdeposito,
            Usuario, Fecha, Mes, Anio, MesAnio, Hora, Status, VersionApp
        } = req.body;

        if (!id) {
            return res.status(400).json({ error: "ID is required for update" });
        }

        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LISTS.RESUMEN_INGRESOS_EGRESOS}/items/${id}/fields`;

        const updateData: { [key: string]: any } = {};

        if (IDUnivoco !== undefined) updateData['IDUnivoco_RIE'] = IDUnivoco;
        if (Tipo !== undefined) updateData['Tipo_RIE'] = Tipo;
        if (Articulos !== undefined) updateData['Articulos_RIE'] = String(Articulos);
        if (Total !== undefined) updateData['Total_RIE'] = String(Total);
        if (Subdeposito !== undefined) updateData['Subdeposito_RIE'] = Subdeposito;
        if (Usuario !== undefined) updateData['Usuario_RIE'] = Usuario;
        if (Fecha !== undefined) updateData['Fecha_RIE'] = Fecha;
        if (Mes !== undefined) updateData['Mes_RIE'] = Mes;
        if (Anio !== undefined) updateData['A_x00f1_o_RIE'] = Anio;
        if (MesAnio !== undefined) updateData['MesA_x00f1_o_RIE'] = MesAnio;
        if (Hora !== undefined) updateData['Hora_RIE'] = Hora;
        if (Status !== undefined) updateData['Status_RIE'] = Status;
        if (VersionApp !== undefined) updateData['VersionApp_RIE'] = VersionApp;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update provided" });
        }

        const response = await axios.patch(url, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);

    } catch (error: any) {
        console.error("Update Resumen Ingreso Egreso Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to update Resumen Ingreso Egreso" });
    }
};