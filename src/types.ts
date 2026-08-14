
export interface Usuario {
  id: string;
  usuario: string;
  nombre: string;
  perfil: string;
  status: string;
  creadoPor: string;
  [key: string]: any;
}

export interface StockItem {
  id: string;
  originalId?: string;
  sku: string;
  description: string;
  subdeposit: 'DEPOSITO' | 'LOGISTICA';
  quantity: number;
}

export interface LatestIncome {
  id: number;
  sku: string;
  description: string;
  location: string;
}

export type ModalType = 'ADD' | 'TRANSFORM' | 'TRANSFER' | 'EDIT' | 'DELETE' | null;

export interface User {
  username: string;
  role: string;
}

// --- CONFIGURACION & ARTICULOS ---

export interface Injection {
  id: number;
  timestamp: string;
  client: string;
  sku: string;
  description: string;
  subdeposit: 'DEPOSITO' | 'LOGISTICA';
  origin: string;
  quantity: number;
  status: 'PENDIENTE' | 'PROCESADO';
}

export interface Article {
  id: number; 
  providerIds: string[]; // Changed from providerId to providerIds array
  name: string; 
  category: string;
  code: string; 
  unitPrice: number;
  status?: string;
  nOrden?: string;
  principal?: string;
  clientCode?: string;
  clothingType?: string;
}

// --- COMPRAS & PROVEEDORES ---

export interface Provider {
  id: string;
  name: string;
  segment: string; 
  email: string;
  phone: string; 
  paymentCondition: string; 
  currency: 'ARS' | 'USD';
  status?: string;
}

export interface OrderItem {
  id?: number; // SharePoint ID
  sku: string;
  description: string;
  quantity: number; 
  receivedQuantity?: number; 
  price?: number; 
}

export type OrderStatus = 'Presupuesto' | 'Pendiente Aprobacion' | 'Aprobada' | 'Rechazada' | 'Pendiente Ingreso' | 'En Recepcion' | 'Completada' | 'Baja' | string;

export interface PurchaseOrder {
  id: string; // IDUnivoco
  sharepointId?: string; // Numeric SharePoint ID
  date: string;
  providerId: string;
  providerName: string;
  requester?: string;
  requesterProfile?: string;
  items: OrderItem[];
  status: OrderStatus;
  observaciones?: string;
}


// --- API TYPES ---

export interface OrdenCompra {
  id: string;
  IDUnivoco: string;
  Usuario: string;
  Fecha: string;
  Hora: string;
  Proveedor: string;
  CantidadArticulos: string;
  CantidadTotal: string;
  Precio: string;
  Conversion: string;
  Status: string;
  VersionApp: string;
  MesAnio: string;
  creadoPor?: string;
  Observaciones?: string;
  [key: string]: any;
}

export interface DetalleOC {
  id: string;
  IdCompra: string;
  Usuario: string;
  Fecha: string;
  Hora: string;
  IdArticulo: string;
  ArticuloConcat: string;
  Articulo: string;
  SKU: string;
  PrecioUnitario: string;
  Cantidad: string;
  PrecioTotal: string;
  CantidadRecepcionada: string;
  ValorRecepcionado: string;
  Status: string;
  VersionApp: string;
  MesAnio: string;
  creadoPor?: string;
  [key: string]: any;
}

export interface RecepcionOC {
  id: string;
  IDRecepcionGrupal: string;
  IDCompra: string;
  IDDetalleCompra: string;
  Usuario: string;
  Fecha: string;
  Hora: string;
  FechaRecepcion: string;
  NroRemito: string;
  Lote: string;
  IdArticulo: string;
  DetalleArticulo: string;
  ArticuloConcat: string;
  SKU: string;
  CantidadRecepcion: string;
  Status: string;
  VersionApp: string;
  MesAnio: string;
  creadoPor?: string;
  [key: string]: any;
}

export interface CargaTransito {
  id: string;
  idTransaccion: string;
  fecha: string;
  hora: string;
  movimiento: string;
  almacen: string;
  almacenDestino: string;
  usuario: string;
  sku: string;
  concatArtCliente: string;
  articulo: string;
  cantidadInicial: string;
  cantidad: string;
  status: string;
  version: string;
  cliente: string;
  creadoPor: string;
}

export interface Almacen {
  id: string;
  fecha: string;
  idAlmacen: string;
  nroAlmacen: string;
  sku: string;
  articulo: string;
  concat: string;
  stockInicial: string;
  ingreso: string;
  egreso: string;
  stockFinal: string;
  status: string;
  creadoPor: string;
}

export interface OrdenTrabajo {
  id: string;
  idTransaccion: string;
  ordenTrabajo: string;
  fecha: string;
  hora: string;
  estado: string;
  usuario: string;
  sku: string;
  cliente: string;
  articulo: string;
  version: string;
  mesAnio: string;
  creadoPor: string;
}

export interface SolicitudInyeccion {
  id: string;
  idTransaccion: string;
  usuario: string;
  fecha: string;
  hora: string;
  movimiento: string;
  articulo: string;
  sku: string;
  cliente: string;
  cantidadInicial: string;
  cantidad: string;
  status: string;
  observaciones: string;
  version: string;
  mesAnio: string;
  mesAnioReal: string;
  creadoPor: string;
}

export interface CargaTransitoUnivoca {
  id: string;
  ultimoUsuario: string;
  ultimaFecha: string;
  ultimaHora: string;
  cliente: string;
  articulo: string;
  concat: string;
  sku: string;
  cantidadInicial: string;
  movimiento: string;
  cantidadFinal: string;
  versionApp: string;
  creadoPor: string;
}

export interface Aprobacion {
  id: string;
  idUnivoco: string;
  usuario: string;
  fechaAprobacion: string;
  horaAprobacion: string;
  fechaCreacion: string;
  horaCreacion: string;
  cliente: string;
  tipo: string;
  tipoPrenda: string;
  almacenOrigen: string;
  almacenDestino: string;
  cantidad: string;
  status: string;
  mesAnio: string;
  versionApp: string;
  creadoPor: string;
}

export interface Stock {
  id: string;
  fecha: string;
  idSubdeposito: string;
  subdeposito: string;
  sku: string;
  articulo: string;
  concat: string;
  stockFinal: string;
  stockPendiente: string;
  status: string;
  modificado: string;
  creadoPor: string;
}

export interface StockPayload {
  Fecha?: string;
  IDSubdeposito?: string;
  Subdeposito?: string;
  SKU?: string;
  Articulo?: string;
  Concat?: string;
  StockFinal?: string;
  StockPendiente?: string;
  Status?: string;
}

export interface StockUpdatePayload {
  id: string;
  StockFinal?: string;
  StockPendiente?: string;
  Status?: string;
  [key: string]: any;
}

export interface DetalleIngresoEgreso {
  id: string;
  idUnivoco: string;
  tipo: string;
  articulo: string;
  subdeposito: string;
  cantidad: string;
  stockInicial: string;
  stockFinal: string;
  concat: string;
  usuario: string;
  fecha: string;
  mes: string;
  anio: string;
  hora: string;
  status: string;
  versionApp: string;
  creadoPor: string;
}

export interface MovimientoStock {
  id: string;
  idUnivoco: string;
  tipo: string;
  articulo: string;
  concat: string;
  stockInicial: string;
  stockFinal: string;
  subdepositoActual: string;
  subdepositoFinal: string;
  usuario: string;
  fecha: string;
  mes: string;
  anio: string;
  mesAnio: string;
  hora: string;
  status: string;
  versionApp: string;
  creadoPor: string;
}

export interface InyeccionPendiente {
  id: string;
  idUnivoco: string;
  fecha: string;
  cantidadSku: string;
  cantidadTotal: string;
  status: string;
  usuario: string;
  cliente: string;
  hora: string;
  mes: string;
  anio: string;
  mesAnio: string;
  versionApp: string;
  creadoPor: string;
}

export interface DetalleInyeccion {
  id: string;
  idUnivoco: string;
  articulo: string;
  sku: string;
  concat: string;
  origen: string;
  subdeposito: string;
  cantidadOriginal: string;
  cantidad: string;
  status: string;
  usuario: string;
  fecha: string;
  mes: string;
  anio: string;
  mesAnio: string;
  hora: string;
  versionApp: string;
  creadoPor: string;
}

export interface ImagenRecepcion {
  id: string;
  Usuario_IR: string;
  Fecha_IR: string;
  Hora_IR: string;
  IdUnivocoOrdenCompra_IR: string;
  IdDetalleCompra_IR: string;
  IdRecepcion_IR: string;
  Imagen_IR: string;
  Tipo_IR: string;
  Status_IR: string;
  VersionApp_IR: string;
  MesAnio_IR: string;
  creadoPor?: string;
  [key: string]: any;
}

export interface FuncionalidadHome {
  id: string;
  titulo: string;
  idFh: string;
  tipoApp: string;
  funcionalidad: string;
  admin: string;
  calidad: string;
  costureraJefe: string;
  costureraOp: string;
  produccion: string;
  calidadOp: string;
  deposito: string;
  img: string;
  imgSelected: string;
  orden: string;
  status: string;
  creadoPor: string;
}

export interface ArticuloAPI {
  id: string;
  titulo: string;
  sku: string;
  concat: string;
  tipoPrenda: string;
  descripcion: string;
  status: string;
  principal: string;
  familia: string;
  codigoCliente: string;
  nOrden: string;
  proveedores: string;
  precio: string;
  creadoPor: string;
  [key: string]: any;
}

export interface SegmentoMetrica {
  id: string;
  titulo: string;
  segmento: string;
  perfil: string;
  numOrden: string;
  creadoPor: string;
}

export interface Cliente {
  id: string;
  titulo: string;
  codigo: string;
  nombre: string;
  concat: string;
  status: string;
  creadoPor: string;
}

export interface SegmentoAprobacion {
  id: string;
  titulo: string;
  segmento: string;
  admin: string;
  calidad: string;
  costureraOperaria: string;
  costureraJefa: string;
  produccion: string;
  numOrden: string;
  creadoPor: string;
}

export interface ProveedorAPI {
  id: string;
  titulo: string;
  proveedor: string;
  segmento: string;
  moneda: string;
  emails: string;
  telefono: string;
  status: string;
  creadoPor: string;
  [key: string]: any;
}

export interface Email {
  id: string;
  titulo: string;
  modulo: string;
  emailConcat: string;
  copiaOculta: string;
  status: string;
  creadoPor: string;
}

export interface Familia {
  id: string;
  titulo: string;
  familia: string;
  su: string;
  concatFamiliaSu: string;
  status: string;
  creadoPor: string;
}

export interface Principal {
  id: string;
  titulo: string;
  codigo: string;
  principal: string;
  concatPrincipalCodigo: string;
  status: string;
  creadoPor: string;
}

export interface AlmacenUnivoco {
  id: string;
  titulo: string;
  almacenes: string;
  creadoPor: string;
}

export interface TipoPrenda {
  id: string;
  titulo: string;
  tipoPrendas: string;
  status: string;
  creadoPor: string;
}

export interface CodigoPunto {
  id: string;
  titulo: string;
  codigo: string;
  conPunto: string;
  status: string;
  creadoPor: string;
}

export interface ArticuloNuevo {
  id: string;
  titulo: string;
  sku: string;
  concat: string;
  creado: string;
  tipoPrenda: string;
  descripcion: string;
  status: string;
  principal: string;
  familia: string;
  codigoCliente: string;
  nOrden: string;
  countId: string;
  creadoPor: string;
}
