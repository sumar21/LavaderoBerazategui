import api from './api';
import { OrdenCompra, DetalleOC, RecepcionOC, ImagenRecepcion } from '@/types';

export const generateOCId = (username: string) => {
  const cod = (username || 'USR').substring(0, 3).toUpperCase();
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const mmm = String(now.getMilliseconds()).padStart(3, '0');
  
  return `(OC)-${cod}-${dd}${mm}${yyyy}${hh}${min}${ss}${mmm}`;
};

export const generateROCId = (username: string, idCompra: string, idDetalle: string) => {
  const cod = (username || 'USR').substring(0, 3).toUpperCase();
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const mmm = String(now.getMilliseconds()).padStart(3, '0');
  
  // Extract numeric parts from IDs to keep it cleaner if needed, or just append
  // Format requested: (ROC)-ADM-23122025114417458 (This looks like just timestamp)
  // But user said: "donde id recepcion es el id de la recepcion general y el detalle es el id del detalle de compra"
  // Wait, the user provided example:
  // IdRecepcion_IR: (ROC)-ADM-23122025114417458
  // This looks like a general reception ID.
  // AND "y lo guardo en la lista de imagenesRecepciones con este formato"
  // The user is talking about the IMAGE list format.
  // "donde id recepcion es el id de la recepcion general y el detalle es el id del detalle de compra"
  // This refers to the fields in the ImagenRecepcion object.
  
  return `(ROC)-${cod}-${dd}${mm}${yyyy}${hh}${min}${ss}${mmm}`;
};

// Helper to safely extract array from response
const extractArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
};

export const purchaseService = {
  // Ordenes de Compra
  getOrdenesCompra: async () => {
    const response = await api.get('/ordenes-compra');
    return extractArray(response.data) as OrdenCompra[];
  },

  createOrdenCompra: async (data: Partial<OrdenCompra>) => {
    // Ensure Observaciones is included if present in data
    const payload = { ...data };
    if (data.Observaciones) {
        payload.Observaciones = data.Observaciones;
    }
    const response = await api.post<OrdenCompra>('/ordenes-compra', payload);
    return response.data;
  },

  updateOrdenCompra: async (id: string, data: Partial<OrdenCompra>) => {
    // Ensure Observaciones is included if present in data
    const payload = { id, ...data };
    if (data.Observaciones) {
        payload.Observaciones = data.Observaciones;
    }
    const response = await api.patch<OrdenCompra>('/ordenes-compra', payload);
    return response.data;
  },

  // Detalles OC
  getDetallesOC: async (idCompra?: string) => {
    const params = idCompra ? { idCompra } : {};
    const response = await api.get('/detalles-oc', { params });
    return extractArray(response.data) as DetalleOC[];
  },

  createDetalleOC: async (data: Partial<DetalleOC>) => {
    const response = await api.post<DetalleOC>('/detalles-oc', data);
    return response.data;
  },

  updateDetalleOC: async (id: string, data: Partial<DetalleOC>) => {
    const response = await api.patch<DetalleOC>('/detalles-oc', { id, ...data });
    return response.data;
  },

  // Recepciones OC
  getRecepcionesOC: async (idCompra?: string, idRecepcionGrupal?: string) => {
    const params: any = {};
    if (idCompra) params.idCompra = idCompra;
    if (idRecepcionGrupal) params.idRecepcionGrupal = idRecepcionGrupal;
    
    const response = await api.get('/recepciones-oc', { params });
    return extractArray(response.data) as RecepcionOC[];
  },

  createRecepcionOC: async (data: Partial<RecepcionOC>) => {
    const response = await api.post<RecepcionOC>('/recepciones-oc', data);
    return response.data;
  },

  updateRecepcionOC: async (id: string, data: Partial<RecepcionOC>) => {
    const response = await api.patch<RecepcionOC>('/recepciones-oc', { id, ...data });
    return response.data;
  },

  // Imagenes Recepciones
  getImagenesRecepciones: async (idOrdenCompra?: string, idRecepcion?: string) => {
    const params: any = {};
    if (idOrdenCompra) params.idOrdenCompra = idOrdenCompra;
    if (idRecepcion) params.idRecepcion = idRecepcion;

    const response = await api.get('/imagenes-recepciones', { params });
    return extractArray(response.data) as ImagenRecepcion[];
  },

  createImagenRecepcion: async (data: Partial<ImagenRecepcion>) => {
    const response = await api.post<ImagenRecepcion>('/imagenes-recepciones', data);
    return response.data;
  },

  updateImagenRecepcion: async (id: string, data: Partial<ImagenRecepcion>) => {
    const response = await api.patch<ImagenRecepcion>('/imagenes-recepciones', { id, ...data });
    return response.data;
  },

  // Notificaciones
  // The recipient is resolved server-side from the provider record, so the
  // caller only needs to say which order to notify.
  notifyPurchaseOrder: async (orderId: string, _providerEmail: string, notes?: string) => {
    await api.post('/notificaciones/orden-compra', {
      id: orderId,
      notas: notes || ''
    });

    return true;
  }
};
