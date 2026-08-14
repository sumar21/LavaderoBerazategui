import api from './api';
import { OrdenTrabajo, SolicitudInyeccion, InyeccionPendiente, DetalleInyeccion, DetalleIngresoEgreso } from '@/types';

export const productionService = {
  // Ordenes de Trabajo
  getOrdenesTrabajo: async (ordenTrabajo?: string, idTransaccion?: string, sku?: string) => {
    const params: any = {};
    if (ordenTrabajo) params.ordenTrabajo = ordenTrabajo;
    if (idTransaccion) params.idTransaccion = idTransaccion;
    if (sku) params.sku = sku;

    const response = await api.get<OrdenTrabajo[]>('/ordenes-trabajo', { params });
    return response.data;
  },

  createOrdenTrabajo: async (data: Partial<OrdenTrabajo>) => {
    const response = await api.post<OrdenTrabajo>('/ordenes-trabajo', data);
    return response.data;
  },

  updateOrdenTrabajo: async (id: string, data: Partial<OrdenTrabajo>) => {
    const response = await api.patch<OrdenTrabajo>('/ordenes-trabajo', { id, ...data });
    return response.data;
  },

  // Solicitud Inyecciones
  getSolicitudInyecciones: async (idTransaccion?: string, sku?: string, cliente?: string) => {
    const params: any = {};
    if (idTransaccion) params.idTransaccion = idTransaccion;
    if (sku) params.sku = sku;
    if (cliente) params.cliente = cliente;

    const response = await api.get<SolicitudInyeccion[]>('/solicitud-inyecciones', { params });
    return response.data;
  },

  createSolicitudInyeccion: async (data: Partial<SolicitudInyeccion>) => {
    const response = await api.post<SolicitudInyeccion>('/solicitud-inyecciones', data);
    return response.data;
  },

  updateSolicitudInyeccion: async (id: string, data: Partial<SolicitudInyeccion>) => {
    const response = await api.patch<SolicitudInyeccion>('/solicitud-inyecciones', { id, ...data });
    return response.data;
  },

  // Inyecciones Pendientes
  getInyeccionesPendientes: async (idUnivoco?: string, cliente?: string) => {
    const params: any = {};
    if (idUnivoco) params.idUnivoco = idUnivoco;
    if (cliente) params.cliente = cliente;

    const response = await api.get<InyeccionPendiente[]>('/inyecciones-pendientes', { params });
    return response.data;
  },

  createInyeccionPendiente: async (data: Partial<InyeccionPendiente>) => {
    const response = await api.post<InyeccionPendiente>('/inyecciones-pendientes', data);
    return response.data;
  },

  updateInyeccionPendiente: async (id: string, data: Partial<InyeccionPendiente>) => {
    const response = await api.patch<InyeccionPendiente>('/inyecciones-pendientes', { id, ...data });
    return response.data;
  },

  // Detalle Inyecciones
  getDetalleInyecciones: async (idUnivoco?: string) => {
    const params = idUnivoco ? { idUnivoco } : {};
    const response = await api.get<DetalleInyeccion[]>('/detalle-inyecciones', { params });
    return response.data;
  },

  createDetalleInyeccion: async (data: Partial<DetalleInyeccion>) => {
    const response = await api.post<DetalleInyeccion>('/detalle-inyecciones', data);
    return response.data;
  },

  updateDetalleInyeccion: async (id: string, data: Partial<DetalleInyeccion>) => {
    const response = await api.patch<DetalleInyeccion>('/detalle-inyecciones', { id, ...data });
    return response.data;
  },

  // Detalles Ingresos Egresos
  getDetallesIngresosEgresos: async (idUnivoco?: string, tipo?: string) => {
    const params: any = {};
    if (idUnivoco) params.idUnivoco = idUnivoco;
    if (tipo) params.tipo = tipo;

    const response = await api.get<DetalleIngresoEgreso[]>('/detalles-ingresos-egresos', { params });
    return response.data;
  },

  createDetalleIngresoEgreso: async (data: Partial<DetalleIngresoEgreso>) => {
    const response = await api.post<DetalleIngresoEgreso>('/detalles-ingresos-egresos', data);
    return response.data;
  },

  updateDetalleIngresoEgreso: async (id: string, data: Partial<DetalleIngresoEgreso>) => {
    const response = await api.patch<DetalleIngresoEgreso>('/detalles-ingresos-egresos', { id, ...data });
    return response.data;
  }
};
