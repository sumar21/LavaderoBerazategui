import express from 'express';
const router = express.Router();

// Import Controllers and Middleware
import * as authController from '../controllers/authController';
import * as dataController from '../controllers/dataController';
import * as mailController from '../controllers/mailController';
import verifyToken from '../middleware/verifyToken';

// ========================================================
// PUBLIC ROUTES (No Token Required)
// ========================================================

// 1. Check if email exists (Step 1 of Login)
router.post('/auth/check-status', authController.checkEmailStatus);
router.post('/auth/validate', authController.validateAccount);
router.post('/auth/recover', authController.recoverAccount);

// 2. Login with Password (Step 2 of Login)
router.post('/login', authController.login);

// 3. Email the user their credentials (replaces the Power Automate flow)
router.post('/auth/send-credentials', mailController.sendCredentials);


// ========================================================
// PROTECTED ROUTES (Token Required)
// ========================================================

// Notifications
router.post('/notificaciones/orden-compra', verifyToken, mailController.notifyPurchaseOrder);

// Ordenes de Compra Routes
router.get('/ordenes-compra', verifyToken, dataController.getOrdenesCompra);
router.post('/ordenes-compra', verifyToken, dataController.createOrdenCompra);
router.patch('/ordenes-compra', verifyToken, dataController.updateOrdenCompra);

// Detalles Ordenes de Compra Routes
router.get('/detalles-oc', verifyToken, dataController.getDetallesOC);
router.post('/detalles-oc', verifyToken, dataController.createDetalleOC);
router.patch('/detalles-oc', verifyToken, dataController.updateDetalleOC);
// Recepciones Ordenes de Compra Routes
router.get('/recepciones-oc', verifyToken, dataController.getRecepcionesOC);
router.post('/recepciones-oc', verifyToken, dataController.createRecepcionOC);
router.patch('/recepciones-oc', verifyToken, dataController.updateRecepcionOC);
// Carga Transito Routes
router.get('/carga-transito', verifyToken, dataController.getCargaTransito);
router.post('/carga-transito', verifyToken, dataController.createCargaTransito);
router.patch('/carga-transito', verifyToken, dataController.updateCargaTransito);
// Almacenes Routes
router.get('/almacenes', verifyToken, dataController.getAlmacenes);
router.post('/almacenes', verifyToken, dataController.createAlmacen);
router.patch('/almacenes', verifyToken, dataController.updateAlmacen);
// Ordenes de Trabajo Routes
router.get('/ordenes-trabajo', verifyToken, dataController.getOrdenesTrabajo);
router.post('/ordenes-trabajo', verifyToken, dataController.createOrdenTrabajo);
router.patch('/ordenes-trabajo', verifyToken, dataController.updateOrdenTrabajo);
// Solicitud Inyecciones Routes
router.get('/solicitud-inyecciones', verifyToken, dataController.getSolicitudInyecciones);
router.post('/solicitud-inyecciones', verifyToken, dataController.createSolicitudInyeccion);
router.patch('/solicitud-inyecciones', verifyToken, dataController.updateSolicitudInyeccion);
// Carga Transito Univoca Routes
router.get('/carga-transito-univoca', verifyToken, dataController.getCargaTransitoUnivoca);
router.post('/carga-transito-univoca', verifyToken, dataController.createCargaTransitoUnivoca);
router.patch('/carga-transito-univoca', verifyToken, dataController.updateCargaTransitoUnivoca);
// Aprobaciones Routes
router.get('/aprobaciones', verifyToken, dataController.getAprobaciones);
router.post('/aprobaciones', verifyToken, dataController.createAprobacion);
router.patch('/aprobaciones', verifyToken, dataController.updateAprobacion);
// Stock Routes
router.get('/stock', verifyToken, dataController.getStock);
router.post('/stock', verifyToken, dataController.createStock);
router.patch('/stock', verifyToken, dataController.updateStock);
// Resumen Ingresos Egresos Routes
router.get('/resumen-ingresos-egresos', verifyToken, dataController.getResumenIngresosEgresos);
router.post('/resumen-ingresos-egresos', verifyToken, dataController.createResumenIngresoEgreso);
router.patch('/resumen-ingresos-egresos', verifyToken, dataController.updateResumenIngresoEgreso);
// Detalles Ingresos Egresos Routes
router.get('/detalles-ingresos-egresos', verifyToken, dataController.getDetallesIngresosEgresos);
router.post('/detalles-ingresos-egresos', verifyToken, dataController.createDetalleIngresoEgreso);
router.patch('/detalles-ingresos-egresos', verifyToken, dataController.updateDetalleIngresoEgreso);
// Movimientos Stock Routes
router.get('/movimientos-stock', verifyToken, dataController.getMovimientosStock);
router.post('/movimientos-stock', verifyToken, dataController.createMovimientoStock);
router.patch('/movimientos-stock', verifyToken, dataController.updateMovimientoStock);
// Inyecciones Pendientes Routes
router.get('/inyecciones-pendientes', verifyToken, dataController.getInyeccionesPendientes);
router.post('/inyecciones-pendientes', verifyToken, dataController.createInyeccionPendiente);
router.patch('/inyecciones-pendientes', verifyToken, dataController.updateInyeccionPendiente);
// Detalle Inyecciones Routes
router.get('/detalle-inyecciones', verifyToken, dataController.getDetalleInyecciones);
router.post('/detalle-inyecciones', verifyToken, dataController.createDetalleInyeccion);
router.patch('/detalle-inyecciones', verifyToken, dataController.updateDetalleInyeccion);
// Imagenes Recepciones Routes
router.get('/imagenes-recepciones', verifyToken, dataController.getImagenesRecepciones);
router.post('/imagenes-recepciones', verifyToken, dataController.createImagenRecepcion);
router.patch('/imagenes-recepciones', verifyToken, dataController.updateImagenRecepcion);

// Funcionalidades Home Routes
router.get('/funcionalidades-home', verifyToken, dataController.getFuncionalidadesHome);
router.post('/funcionalidades-home', verifyToken, dataController.createFuncionalidadHome);
router.patch('/funcionalidades-home', verifyToken, dataController.updateFuncionalidadHome);

// Articulos Routes
router.get('/articulos', verifyToken, dataController.getArticulos);
router.post('/articulos', verifyToken, dataController.createArticulo);
router.patch('/articulos', verifyToken, dataController.updateArticulo);

// Segmentos Metricas Routes
router.get('/segmentos-metricas', verifyToken, dataController.getSegmentosMetricas);
router.post('/segmentos-metricas', verifyToken, dataController.createSegmentoMetrica);
router.patch('/segmentos-metricas', verifyToken, dataController.updateSegmentoMetrica);

// Clientes Routes
router.get('/clientes', verifyToken, dataController.getClientes);
router.post('/clientes', verifyToken, dataController.createCliente);
router.patch('/clientes', verifyToken, dataController.updateCliente);

// Segmentos Aprobaciones Routes
router.get('/segmentos-aprobaciones', verifyToken, dataController.getSegmentosAprobaciones);
router.post('/segmentos-aprobaciones', verifyToken, dataController.createSegmentoAprobacion);
router.patch('/segmentos-aprobaciones', verifyToken, dataController.updateSegmentoAprobacion);

// Proveedores Routes
router.get('/proveedores', verifyToken, dataController.getProveedores);
router.post('/proveedores', verifyToken, dataController.createProveedor);
router.patch('/proveedores', verifyToken, dataController.updateProveedor);

// Emails Routes
router.get('/emails', verifyToken, dataController.getEmails);
router.post('/emails', verifyToken, dataController.createEmail);
router.patch('/emails', verifyToken, dataController.updateEmail);

// Familias Routes
router.get('/familias', verifyToken, dataController.getFamilias);
router.post('/familias', verifyToken, dataController.createFamilia);
router.patch('/familias', verifyToken, dataController.updateFamilia);

// Principal Routes
router.get('/principales', verifyToken, dataController.getPrincipales);
router.post('/principales', verifyToken, dataController.createPrincipal);
router.patch('/principales', verifyToken, dataController.updatePrincipal);

// Almacenes Univocos Routes
router.get('/almacenes-univocos', verifyToken, dataController.getAlmacenesUnivocos);
router.post('/almacenes-univocos', verifyToken, dataController.createAlmacenUnivoco);
router.patch('/almacenes-univocos', verifyToken, dataController.updateAlmacenUnivoco);

// Tipo Prendas Routes
router.get('/tipo-prendas', verifyToken, dataController.getTipoPrendas);
router.post('/tipo-prendas', verifyToken, dataController.createTipoPrenda);
router.patch('/tipo-prendas', verifyToken, dataController.updateTipoPrenda);

// Codigo Puntos Routes
router.get('/codigo-puntos', verifyToken, dataController.getCodigoPuntos);
router.post('/codigo-puntos', verifyToken, dataController.createCodigoPunto);
router.patch('/codigo-puntos', verifyToken, dataController.updateCodigoPunto);

// Articulos Nuevos Routes
router.get('/articulos-nuevos', verifyToken, dataController.getArticulosNuevos);
router.post('/articulos-nuevos', verifyToken, dataController.createArticuloNuevo);
router.patch('/articulos-nuevos', verifyToken, dataController.updateArticuloNuevo);

export default router;
