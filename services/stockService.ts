import api from './api';
import { Stock, MovimientoStock, Almacen, CargaTransito, CargaTransitoUnivoca, AlmacenUnivoco, StockPayload, StockUpdatePayload } from '@/types';

export const stockService = {
  // Stock
  getStock: async (sku?: string, idSubdeposito?: string) => {
    const params: any = {};
    if (sku) params.sku = sku;
    if (idSubdeposito) params.idSubdeposito = idSubdeposito;
    
    const response = await api.get<Stock[]>('/stock', { params });
    return response.data;
  },

  createStock: async (data: StockPayload) => {
    const response = await api.post<Stock>('/stock', data);
    return response.data;
  },

  updateStock: async (data: StockUpdatePayload) => {
    const response = await api.patch<Stock>('/stock', data);
    return response.data;
  },

  // Movimientos Stock
  getMovimientosStock: async (idUnivoco?: string, tipo?: string) => {
    const params: any = {};
    if (idUnivoco) params.idUnivoco = idUnivoco;
    if (tipo) params.tipo = tipo;

    const response = await api.get<MovimientoStock[]>('/movimientos-stock', { params });
    return response.data;
  },

  createMovimientoStock: async (data: Partial<MovimientoStock>) => {
    const response = await api.post<MovimientoStock>('/movimientos-stock', data);
    return response.data;
  },

  updateMovimientoStock: async (id: string, data: Partial<MovimientoStock>) => {
    const response = await api.patch<MovimientoStock>('/movimientos-stock', { id, ...data });
    return response.data;
  },

  // Resumen Ingresos/Egresos
  createResumenIngresoEgreso: async (data: any) => {
    const response = await api.post('/resumen-ingresos-egresos', data);
    return response.data;
  },

  // Detalle Ingresos/Egresos
  createDetalleIngresoEgreso: async (data: any) => {
    const response = await api.post('/detalles-ingresos-egresos', data);
    return response.data;
  },

  // Almacenes
  getAlmacenes: async (idAlmacen?: string, sku?: string) => {
    const params: any = {};
    if (idAlmacen) params.idAlmacen = idAlmacen;
    if (sku) params.sku = sku;

    const response = await api.get<Almacen[]>('/almacenes', { params });
    return response.data;
  },

  createAlmacen: async (data: Partial<Almacen>) => {
    const response = await api.post<Almacen>('/almacenes', data);
    return response.data;
  },

  updateAlmacen: async (id: string, data: Partial<Almacen>) => {
    const response = await api.patch<Almacen>('/almacenes', { id, ...data });
    return response.data;
  },

  // Carga Transito
  getCargaTransito: async (idTransaccion?: string, sku?: string) => {
    const params: any = {};
    if (idTransaccion) params.idTransaccion = idTransaccion;
    if (sku) params.sku = sku;

    const response = await api.get<CargaTransito[]>('/carga-transito', { params });
    return response.data;
  },

  createCargaTransito: async (data: Partial<CargaTransito>) => {
    const response = await api.post<CargaTransito>('/carga-transito', data);
    return response.data;
  },

  updateCargaTransito: async (id: string, data: Partial<CargaTransito>) => {
    const response = await api.patch<CargaTransito>('/carga-transito', { id, ...data });
    return response.data;
  },

  // Carga Transito Univoca
  getCargaTransitoUnivoca: async (sku?: string, cliente?: string) => {
    const params: any = {};
    if (sku) params.sku = sku;
    if (cliente) params.cliente = cliente;

    const response = await api.get<CargaTransitoUnivoca[]>('/carga-transito-univoca', { params });
    return response.data;
  },

  createCargaTransitoUnivoca: async (data: Partial<CargaTransitoUnivoca>) => {
    const response = await api.post<CargaTransitoUnivoca>('/carga-transito-univoca', data);
    return response.data;
  },

  updateCargaTransitoUnivoca: async (id: string, data: Partial<CargaTransitoUnivoca>) => {
    const response = await api.patch<CargaTransitoUnivoca>('/carga-transito-univoca', { id, ...data });
    return response.data;
  },

  // Almacenes Univocos
  getAlmacenesUnivocos: async (almacenes?: string) => {
    const params = almacenes ? { almacenes } : {};
    const response = await api.get<AlmacenUnivoco[]>('/almacenes-univocos', { params });
    return response.data;
  },

  createAlmacenUnivoco: async (data: Partial<AlmacenUnivoco>) => {
    const response = await api.post<AlmacenUnivoco>('/almacenes-univocos', data);
    return response.data;
  },

  updateAlmacenUnivoco: async (id: string, data: Partial<AlmacenUnivoco>) => {
    const response = await api.patch<AlmacenUnivoco>('/almacenes-univocos', { id, ...data });
    return response.data;
  }
};
