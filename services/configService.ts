import api from './api';
import { 
  ArticuloAPI, ProveedorAPI, Cliente, Familia, Principal, TipoPrenda, CodigoPunto, ArticuloNuevo, Email, FuncionalidadHome, SegmentoMetrica, SegmentoAprobacion, Usuario 
} from '@/types';

// Helper to safely extract array from response
const extractArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
};

export const configService = {
  // Articulos
  getArticulos: async (sku?: string, status?: string) => {
    const params: any = {};
    if (sku) params.sku = sku;
    if (status) params.status = status;
    
    const response = await api.get('/articulos', { params });
    return extractArray(response.data) as ArticuloAPI[];
  },

  createArticulo: async (data: Partial<ArticuloAPI>) => {
    const response = await api.post<ArticuloAPI>('/articulos', data);
    return response.data;
  },

  updateArticulo: async (id: string, data: Partial<ArticuloAPI>) => {
    const response = await api.patch<ArticuloAPI>('/articulos', { id, ...data });
    return response.data;
  },

  // Proveedores
  getProveedores: async (proveedor?: string, status?: string) => {
    const params: any = {};
    if (proveedor) params.proveedor = proveedor;
    if (status) params.status = status;

    const response = await api.get('/proveedores', { params });
    return extractArray(response.data) as ProveedorAPI[];
  },

  createProveedor: async (data: Partial<ProveedorAPI>) => {
    const response = await api.post<ProveedorAPI>('/proveedores', data);
    return response.data;
  },

  updateProveedor: async (id: string, data: Partial<ProveedorAPI>) => {
    const response = await api.patch<ProveedorAPI>('/proveedores', { id, ...data });
    return response.data;
  },

  // Clientes
  getClientes: async (codigo?: string, status?: string) => {
    const params: any = {};
    if (codigo) params.codigo = codigo;
    if (status) params.status = status;

    const response = await api.get('/clientes', { params });
    return extractArray(response.data) as Cliente[];
  },

  createCliente: async (data: Partial<Cliente>) => {
    const response = await api.post<Cliente>('/clientes', data);
    return response.data;
  },

  updateCliente: async (id: string, data: Partial<Cliente>) => {
    const response = await api.patch<Cliente>('/clientes', { id, ...data });
    return response.data;
  },

  // Familias
  getFamilias: async (familia?: string, status?: string) => {
    const params: any = {};
    if (familia) params.familia = familia;
    if (status) params.status = status;

    const response = await api.get('/familias', { params });
    return extractArray(response.data) as Familia[];
  },

  createFamilia: async (data: Partial<Familia>) => {
    const response = await api.post<Familia>('/familias', data);
    return response.data;
  },

  updateFamilia: async (id: string, data: Partial<Familia>) => {
    const response = await api.patch<Familia>('/familias', { id, ...data });
    return response.data;
  },

  // Principales
  getPrincipales: async (codigo?: string, status?: string) => {
    const params: any = {};
    if (codigo) params.codigo = codigo;
    if (status) params.status = status;

    const response = await api.get('/principales', { params });
    return extractArray(response.data) as Principal[];
  },

  createPrincipal: async (data: Partial<Principal>) => {
    const response = await api.post<Principal>('/principales', data);
    return response.data;
  },

  updatePrincipal: async (id: string, data: Partial<Principal>) => {
    const response = await api.patch<Principal>('/principales', { id, ...data });
    return response.data;
  },

  // Tipo Prendas
  getTipoPrendas: async (tipoPrendas?: string, status?: string) => {
    const params: any = {};
    if (tipoPrendas) params.tipoPrendas = tipoPrendas;
    if (status) params.status = status;

    const response = await api.get('/tipo-prendas', { params });
    return extractArray(response.data) as TipoPrenda[];
  },

  createTipoPrenda: async (data: Partial<TipoPrenda>) => {
    const response = await api.post<TipoPrenda>('/tipo-prendas', data);
    return response.data;
  },

  updateTipoPrenda: async (id: string, data: Partial<TipoPrenda>) => {
    const response = await api.patch<TipoPrenda>('/tipo-prendas', { id, ...data });
    return response.data;
  },

  // Codigo Puntos
  getCodigoPuntos: async (codigo?: string, status?: string) => {
    const params: any = {};
    if (codigo) params.codigo = codigo;
    if (status) params.status = status;

    const response = await api.get('/codigo-puntos', { params });
    return extractArray(response.data) as CodigoPunto[];
  },

  createCodigoPunto: async (data: Partial<CodigoPunto>) => {
    const response = await api.post<CodigoPunto>('/codigo-puntos', data);
    return response.data;
  },

  updateCodigoPunto: async (id: string, data: Partial<CodigoPunto>) => {
    const response = await api.patch<CodigoPunto>('/codigo-puntos', { id, ...data });
    return response.data;
  },

  // Articulos Nuevos
  getArticulosNuevos: async (sku?: string, status?: string, codigoCliente?: string) => {
    const params: any = {};
    if (sku) params.sku = sku;
    if (status) params.status = status;
    if (codigoCliente) params.codigoCliente = codigoCliente;

    const response = await api.get('/articulos-nuevos', { params });
    return extractArray(response.data) as ArticuloNuevo[];
  },

  createArticuloNuevo: async (data: Partial<ArticuloNuevo>) => {
    const response = await api.post<ArticuloNuevo>('/articulos-nuevos', data);
    return response.data;
  },

  updateArticuloNuevo: async (id: string, data: Partial<ArticuloNuevo>) => {
    const response = await api.patch<ArticuloNuevo>('/articulos-nuevos', { id, ...data });
    return response.data;
  },

  // Emails
  getEmails: async (modulo?: string, status?: string) => {
    const params: any = {};
    if (modulo) params.modulo = modulo;
    if (status) params.status = status;

    const response = await api.get('/emails', { params });
    return extractArray(response.data) as Email[];
  },

  createEmail: async (data: Partial<Email>) => {
    const response = await api.post<Email>('/emails', data);
    return response.data;
  },

  updateEmail: async (id: string, data: Partial<Email>) => {
    const response = await api.patch<Email>('/emails', { id, ...data });
    return response.data;
  },

  // Funcionalidades Home
  getFuncionalidadesHome: async (tipoApp?: string, status?: string) => {
    const params: any = {};
    if (tipoApp) params.tipoApp = tipoApp;
    if (status) params.status = status;

    const response = await api.get('/funcionalidades-home', { params });
    return extractArray(response.data) as FuncionalidadHome[];
  },

  createFuncionalidadHome: async (data: Partial<FuncionalidadHome>) => {
    const response = await api.post<FuncionalidadHome>('/funcionalidades-home', data);
    return response.data;
  },

  updateFuncionalidadHome: async (id: string, data: Partial<FuncionalidadHome>) => {
    const response = await api.patch<FuncionalidadHome>('/funcionalidades-home', { id, ...data });
    return response.data;
  },

  // Segmentos Metricas
  getSegmentosMetricas: async (segmento?: string, perfil?: string) => {
    const params: any = {};
    if (segmento) params.segmento = segmento;
    if (perfil) params.perfil = perfil;

    const response = await api.get('/segmentos-metricas', { params });
    return extractArray(response.data) as SegmentoMetrica[];
  },

  createSegmentoMetrica: async (data: Partial<SegmentoMetrica>) => {
    const response = await api.post<SegmentoMetrica>('/segmentos-metricas', data);
    return response.data;
  },

  updateSegmentoMetrica: async (id: string, data: Partial<SegmentoMetrica>) => {
    const response = await api.patch<SegmentoMetrica>('/segmentos-metricas', { id, ...data });
    return response.data;
  },

  // Segmentos Aprobaciones
  getSegmentosAprobaciones: async (segmento?: string) => {
    const params = segmento ? { segmento } : {};
    const response = await api.get('/segmentos-aprobaciones', { params });
    return extractArray(response.data) as SegmentoAprobacion[];
  },

  createSegmentoAprobacion: async (data: Partial<SegmentoAprobacion>) => {
    const response = await api.post<SegmentoAprobacion>('/segmentos-aprobaciones', data);
    return response.data;
  },

  updateSegmentoAprobacion: async (id: string, data: Partial<SegmentoAprobacion>) => {
    const response = await api.patch<SegmentoAprobacion>('/segmentos-aprobaciones', { id, ...data });
    return response.data;
  },

  getUsuarios: async () => {
    const response = await api.get('/usuarios');
    return extractArray(response.data) as Usuario[];
  }
};
