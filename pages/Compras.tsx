
import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Eye, Send, FileText, Calendar, User, DollarSign, MessageCircle, Mail, Trash2, Truck, CheckCircle, RefreshCcw, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Combobox } from '../components/ui/Combobox';
import { Select } from '../components/ui/Select';
import { MultiSelect } from '../components/ui/MultiSelect';
import { CreateOrderModal } from '../components/compras/CreateOrderModal';
import { NotificationModal } from '../components/compras/NotificationModal';
import { BudgetModal } from '../components/compras/BudgetModal';
import { ReceptionModal } from '../components/compras/ReceptionModal';
import { DeleteConfirmationModal } from '../components/compras/DeleteConfirmationModal';
import { ViewOrderModal } from '../components/compras/ViewOrderModal';
import { PurchaseOrder, OrderItem, OrderStatus, Provider, Article } from '@/types';
import { configService } from '../services/configService';
import { notify } from '../components/ui/Notice';
import { Loader } from '../components/ui/Loader';
import { getSessionUser } from '../services/session';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { capitalizeFirst } from '../utils/text';

// Helper for sorting orders
const sortOrders = (orders: PurchaseOrder[]) => {
  const getStatusPriority = (status: string) => {
    if (!status) return 7;
    const s = status.toLowerCase();
    
    if (s.includes('recepcion') || s.includes('recepción')) return 1;
    if (s.includes('aprobada') || s.includes('aprobado') || s.includes('ingreso')) return 2;
    if ((s.includes('pendiente') && (s.includes('aprobacion') || s.includes('aprobación'))) || s === 'pendiente') return 3;
    if (s.includes('presupuesto')) return 4;
    if (s.includes('completada') || s.includes('completado')) return 5;
    if (s.includes('rechazada') || s.includes('rechazado') || s.includes('baja')) return 6;
    
    return 7;
  };

  return [...orders].sort((a, b) => {
    const priorityA = getStatusPriority(a.status);
    const priorityB = getStatusPriority(b.status);
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    const idA = parseInt(a.sharepointId) || 0;
    const idB = parseInt(b.sharepointId) || 0;
    return idB - idA;
  });
};

/** StatusBadge now resolves the raw API status itself — see resolveStatus. */
const getStatusBadge = (status: OrderStatus | string) => <StatusBadge status={String(status ?? '')} />;

interface ComprasProps {
  orders: PurchaseOrder[];
  setOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

export const Compras: React.FC<ComprasProps> = ({ orders, setOrders, onRefresh, isRefreshing }) => {
  // Local state for UI only (Search, Modals, Forms)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    if (onRefresh) {
      await onRefresh();
    }
    try {
      const [apiProviders, apiArticles] = await Promise.all([
        configService.getProveedores(),
        configService.getArticulos()
      ]);

      const mappedProviders: Provider[] = apiProviders.map(p => ({
        id: String(p.id || p.ID || ''),
        name: p.proveedor || p.Proveedor_P || p.titulo || '',
        segment: p.segmento || p.Segmento_P || '',
        email: p.emails || p.Emails_P || '',
        phone: p.telefono || p.Telefono_P || '',
        paymentCondition: 'ARS',
        currency: (p.moneda === 'USD' || p.Moneda_P === 'USD' ? 'USD' : 'ARS') as 'ARS' | 'USD',
        status: p.status || p.Status_P || ''
      }));
      setProviders(mappedProviders);

      const mappedArticles: Article[] = apiArticles.map(a => {
        let pIds: string[] = [];
        // Use lowercase 'proveedores' as primary source as per user request
        const provs = a.proveedores || a.Proveedores_A || a.Proveedor_A || a.Proveedores || a.Proveedor;
        
        if (Array.isArray(provs)) {
          pIds = provs.map(v => {
            if (v && typeof v === 'object') {
              return String(v.id || v.ID || v.Id || '');
            }
            return String(v).trim();
          });
        } else if (provs && typeof provs === 'object') {
          pIds = [String(provs.id || provs.ID || provs.Id || '')];
        } else if (provs !== undefined && provs !== null) {
          const str = String(provs);
          // Split by semicolon or comma
          pIds = str.split(/[;,]/).map(s => s.trim());
        }
        
        return {
          id: parseInt(String(a.id || a.ID || '0')),
          providerIds: pIds.filter(Boolean),
          name: a.descripcion || a.Descripcion_A || a.titulo || '',
          category: a.familia || a.Familia_A || '',
          code: String(a.sku || a.SKU || a.CodigoCliente_A || a.id || ''),
          unitPrice: parseFloat(String(a.precio || a.Precio_A || '0').replace(',', '.')) || 0,
          status: a.status || a.Status_A || ''
        };
      });
      setArticles(mappedArticles);
    } catch (error) {
      console.error("Error fetching data in Compras:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Creation State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  // Temporary state to hold data between Create and Notification modal steps
  const [tempOrderData, setTempOrderData] = useState<{providerId: string, items: OrderItem[]} | null>(null);

  
  // Resend State
  const [orderToResend, setOrderToResend] = useState<PurchaseOrder | null>(null);

  // View Details State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  // Budget Load State
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  // Reception State
  const [isReceptionModalOpen, setIsReceptionModalOpen] = useState(false);
  const [isSavingReception, setIsSavingReception] = useState(false);

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<PurchaseOrder | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);

  // --- Handlers ---

  const handleCreateOrderSave = (providerId: string, items: OrderItem[]) => {
      setTempOrderData({ providerId, items });
      setIsCreateModalOpen(false);
      setIsNotificationModalOpen(true);
  };

  const getProvider = (targetData: any) => {
    if (!targetData) return null;
    return providers.find(p => 
      p.id === targetData.providerId || 
      p.name === targetData.providerId || 
      (targetData.providerName && p.name === targetData.providerName)
    );
  };

  const createOrder = async (): Promise<string | undefined> => {
    if(!tempOrderData) return undefined;

    const provider = getProvider(tempOrderData);
    
    // Used for the OC id and for stamping who created the record.
    const { name: username, usuarioApp } = getSessionUser();

    const { purchaseService, generateOCId } = await import('../services/purchaseService');
    const newId = generateOCId(username);
    const now = new Date();
    
    // Formatos para SharePoint
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const dateStr = `${dd}/${mm}/${yyyy}`;
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5); // HH:mm
    const mesAnioStr = `${mm}/${yyyy}`;

    const order: PurchaseOrder = {
      id: newId,
      date: dateStr,
      providerId: provider?.id || tempOrderData.providerId,
      providerName: provider?.name || 'Desconocido',
      items: tempOrderData.items,
      status: 'Presupuesto'
    };

    try {
      // Create Order
      const createdOC = await purchaseService.createOrdenCompra({
        IDUnivoco: newId,
        Usuario: usuarioApp,
        Fecha: dateStr,
        Hora: timeStr,
        Proveedor: provider?.name || 'Desconocido',
        CantidadArticulos: tempOrderData.items.length.toString(),
        CantidadTotal: tempOrderData.items.reduce((acc, item) => acc + item.quantity, 0).toString(),
        Precio: '0',
        Conversion: '1',
        Status: 'Presupuesto',
        VersionApp: 'v20251223_1.0.10',
        MesAnio: mesAnioStr,
        creadoPor: username
      });

      if (createdOC && createdOC.id) {
        order.sharepointId = String(createdOC.id);
      }

      // Create Details
      for (const item of tempOrderData.items) {
        await purchaseService.createDetalleOC({
          IdCompra: newId,
          Usuario: usuarioApp,
          Fecha: dateStr,
          Hora: timeStr,
          IdArticulo: String(item.id || ''), 
          ArticuloConcat: `${item.sku} - ${item.description}`,
          Articulo: item.description,
          SKU: item.sku,
          PrecioUnitario: '0',
          Cantidad: item.quantity.toString(),
          PrecioTotal: '0',
          CantidadRecepcionada: '0',
          ValorRecepcionado: '0',
          Status: 'Pendiente',
          VersionApp: 'v20251223_1.0.10',
          MesAnio: mesAnioStr,
          creadoPor: username
        });
        
        // Auto-assign provider to article if it's missing (Dynamic Catalog Addition)
        const cleanProviderId = String(provider?.id || '').trim();
        if (cleanProviderId) {
           const article = articles.find(a => String(a.code) === String(item.sku) || String(a.id) === String(item.id));
           if (article && !article.providerIds.some(id => String(id).trim() === cleanProviderId)) {
               const newProviderIds = [...article.providerIds, cleanProviderId];
               const proveedoresStr = newProviderIds.join(';');
               try {
                   import('../services/configService').then(({ configService }) => {
                       configService.updateArticulo(article.id.toString(), {
                           Proveedores: proveedoresStr
                       }).then(() => {
                           article.providerIds.push(cleanProviderId);
                       }).catch(e => console.error("Error auto-assigning provider", e));
                   });
               } catch(e) {
                   console.error("Auto assign failed", e);
               }
           }
        }
      }

      setOrders([order, ...orders]);
      
      // Reset and close
      setTempOrderData(null);
      setIsNotificationModalOpen(false);
      
      return newId;
    } catch (error) {
      console.error('Error creating order:', error);
      notify.error('Error al crear la orden de compra en el servidor.');
      return undefined;
    }
  };

  const handleSendWhatsApp = async (notes: string) => {
    const isResend = !!orderToResend;
    const targetData = isResend ? orderToResend : tempOrderData;
    
    if (!targetData) return;

    const provider = getProvider(targetData);
    if (!provider || !provider.phone) return;

    try {
        setIsSendingEmail(true);
        let intro = isResend 
            ? `Hola *${provider.name}*, te reenvío la solicitud de presupuesto para la Orden de Compra #${(targetData as PurchaseOrder).id} que aún tenemos pendiente:`
            : `Hola *${provider.name}*, solicitamos presupuesto para la siguiente orden de compra:`;

        let message = `${intro}\n\n`;
        
        if (notes && notes.trim().length > 0) {
            message += `*Aclaraciones:*\n${notes.trim()}\n\n`;
        }

        targetData.items.forEach((item: OrderItem) => {
          message += `• ${item.quantity} x ${item.description}\n`;
        });
        message += `\nAguardo confirmación. Gracias.`;

        // Clean phone number (remove spaces, dashes, etc)
        const targetPhone = provider.phone.replace(/\D/g, '');
        
        const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
        
        if (isResend) {
            setOrderToResend(null);
            setIsNotificationModalOpen(false);
        } else {
            await createOrder();
        }
    } finally {
        setIsSendingEmail(false);
    }
  };

  const handleSendEmail = async (notes: string) => {
    const isResend = !!orderToResend;
    const targetData = isResend ? orderToResend : tempOrderData;

    if (!targetData) return;

    const provider = getProvider(targetData);
    if (!provider || !provider.email) return;

    try {
        setIsSendingEmail(true);
        let intro = isResend 
            ? `Hola ${provider.name},\n\nTe reenvío la solicitud de presupuesto para la Orden de Compra #${(targetData as PurchaseOrder).id} pendiente:\n\n`
            : `Hola ${provider.name},\n\nSolicitamos presupuesto para los siguientes ítems:\n\n`;

        let body = intro;

        if (notes && notes.trim().length > 0) {
            body += `*** Aclaraciones: ***\n${notes.trim()}\n\n`;
        }

        targetData.items.forEach((item: OrderItem) => {
          body += `- ${item.quantity} x ${item.description}\n`;
        });
        body += `\nSaludos,\nLavadero Berazategui`;

        const subject = isResend 
            ? `RECORDATORIO: Solicitud de Presupuesto OC #${(targetData as PurchaseOrder).id}`
            : "Solicitud de Presupuesto - Nueva Orden de Compra";

        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${provider.email}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(gmailUrl, '_blank');
        
        if (isResend) {
            setOrderToResend(null);
            setIsNotificationModalOpen(false);
        } else {
            await createOrder();
        }
    } finally {
        setIsSendingEmail(false);
    }
  };

  const handleSendAutomatedEmail = async (notes: string) => {
    const isResend = !!orderToResend;
    const targetData = isResend ? orderToResend : tempOrderData;

    if (!targetData) return;

    const provider = getProvider(targetData);
    if (!provider || !provider.email) {
        notify.warning("El proveedor no tiene email registrado.");
        return;
    }

    try {
        setIsSendingEmail(true);
        let orderId = '';
        
        if (isResend) {
            orderId = (targetData as PurchaseOrder).id;
            setOrderToResend(null);
            setIsNotificationModalOpen(false);
        } else {
            // Create the order first
            const createdId = await createOrder();
            if (!createdId) {
                setIsSendingEmail(false);
                return; // Failed to create or no data
            }
            orderId = createdId;
        }

        // Send notification
        const { purchaseService } = await import('../services/purchaseService');
        await purchaseService.notifyPurchaseOrder(orderId, provider.email, notes);
        
        if (isResend) {
             notify.success("Notificación reenviada con éxito.");
        } else {
             notify.success("Orden creada y notificada automáticamente con éxito.");
        }

    } catch (error) {
        console.error("Error sending automated email:", error);
        notify.warning("La orden se procesó, pero hubo un error al enviar la notificación automática.");
    } finally {
        setIsSendingEmail(false);
    }
  };

  const activeNotificationProvider = getProvider(orderToResend || tempOrderData);

  const handleResendClick = (order: PurchaseOrder) => {
    setOrderToResend(order);
    setIsNotificationModalOpen(true);
  };

  // Budget Handlers
  const handleOpenBudgetModal = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setIsBudgetModalOpen(true);
  };

  const handleSaveBudget = async (orderId: string, prices: {[sku: string]: number}, quantities: {[sku: string]: number}, itemsToRemove: string[] = []) => {
    try {
      setIsSavingBudget(true);
      const { purchaseService } = await import('../services/purchaseService');
      const order = orders.find(o => o.id === orderId);
      const apiId = order?.sharepointId || orderId;

      const usuarioApp = getSessionUser().usuarioApp;
      
      // Calculate totals based on new prices, quantities, ignoring removed items
      let totalAmount = 0;
      let totalQuantity = 0;
      let newLength = 0;
      
      if (order) {
        order.items.forEach(item => {
            if (itemsToRemove.includes(item.sku)) return;
            const price = prices[item.sku] || 0;
            const qty = quantities[item.sku] || 0;
            totalAmount += price * qty;
            totalQuantity += qty;
            newLength++;
        });
      }

      // Update Order Status and Totals
      await purchaseService.updateOrdenCompra(apiId, { 
        Status: 'Pendiente Aprobacion',
        CantidadArticulos: newLength.toString(),
        CantidadTotal: totalQuantity.toString(),
        Precio: totalAmount.toString(),
        Usuario: usuarioApp,
        VersionApp: 'v20251223_1.0.10'
      });
      
      // Update each item price and quantity
      // Fetch all details to ensure we find them, in case the query param filter fails
      const allDetails = await purchaseService.getDetallesOC();
      const details = allDetails.filter(d => (d.IdCompra || d.idCompra) === order?.id);
      
      // Handle removed items
      for (const sku of itemsToRemove) {
        const detail = details.find(d => (d.SKU || d.sku) === sku);
        if (detail) {
          await purchaseService.updateDetalleOC(String(detail.id || detail.ID), {
            Status: 'Baja',
            Usuario: usuarioApp,
            VersionApp: 'v20251223_1.0.10'
          });
        }
      }

      for (const sku in prices) {
        if (itemsToRemove.includes(sku)) continue;
        const price = prices[sku];
        const qty = quantities[sku] || 0;
        const detail = details.find(d => (d.SKU || d.sku) === sku);
        
        if (detail) {
          await purchaseService.updateDetalleOC(String(detail.id || detail.ID), { 
            Status: 'Pendiente',
            Cantidad: qty.toString(),
            PrecioUnitario: price.toString(),
            PrecioTotal: (price * qty).toString(),
            Usuario: usuarioApp,
            VersionApp: 'v20251223_1.0.10'
          });
        } else {
          console.warn(`Detail not found for SKU: ${sku} in order ${order?.id}`);
        }
      }

      const updatedOrders = orders.map(o => {
          if (o.id === orderId) {
              const remainingItems = o.items.filter(item => !itemsToRemove.includes(item.sku));
              const updatedItems = remainingItems.map(item => ({
                  ...item,
                  price: prices[item.sku] || 0,
                  quantity: quantities[item.sku] || 0
              }));
              
              return {
                  ...o,
                  items: updatedItems,
                  status: 'Pendiente Aprobacion' as OrderStatus
              };
          }
          return o;
      });

      setOrders(sortOrders(updatedOrders));
      setIsBudgetModalOpen(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error("Error saving budget:", error);
      notify.error("Error al guardar el presupuesto.");
    } finally {
      setIsSavingBudget(false);
    }
  };

  // Reception Handlers
  const handleOpenReceptionModal = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setIsReceptionModalOpen(true);
  };

  const handleSaveReception = async (orderId: string, inputs: {[sku: string]: number}, remito: string, lote: string, images: {type: 'Remito' | 'Recepcion', data: string, detailId?: string}[]) => {
    try {
      setIsSavingReception(true);
      const { purchaseService, generateROCId } = await import('../services/purchaseService');
      const order = orders.find(o => o.id === orderId);
      const apiId = order?.sharepointId || orderId;
      const details = await purchaseService.getDetallesOC(order.id);

      const sessionUser = getSessionUser();
      const username = sessionUser.name;
      const usuarioApp = sessionUser.usuarioApp;
      const userEmail = sessionUser.email || usuarioApp;

      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const dateStr = `${dd}/${mm}/${yyyy}`;
      const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
      const mesAnioStr = `${mm}/${yyyy}`;
      
      // Generate IDRecepcionGrupal using the new format
      const idRecepcionGrupal = generateROCId(username, order.id, '');

      let allCompleted = true;
      let someReceived = false;

      // Update each item reception
      for (const sku in inputs) {
        const incomingQty = inputs[sku];
        const detail = details.find(d => (d.SKU || d.sku) === sku);
        
        if (detail) {
          const prevReceived = parseInt(detail.CantidadRecepcionada || detail.cantidadRecepcionada) || 0;
          const totalReceived = prevReceived + incomingQty;
          // const originalQty = parseInt(detail.Cantidad || detail.cantidad) || 0; // Not needed here anymore for status check

          // Create Reception Record if quantity > 0
          if (incomingQty > 0) {
              console.log("Payload for createRecepcionOC:", {
                  IDRecepcionGrupal: idRecepcionGrupal,
                  IDCompra: order.id,
                  IDDetalleCompra: detail.id,
                  Usuario: userEmail,
                  Fecha: dateStr,
                  Hora: timeStr,
                  FechaRecepcion: dateStr,
                  NroRemito: remito,
                  Lote: lote,
                  IdArticulo: detail.IdArticulo || detail.idArticulo,
                  DetalleArticulo: detail.Articulo || detail.articulo,
                  ArticuloConcat: detail.ArticuloConcat || detail.articuloConcat,
                  SKU: detail.SKU || detail.sku,
                  CantidadRecepcion: incomingQty.toString(),
                  Status: 'Recepcionado',
                  VersionApp: '1.0',
                  MesAnio: mesAnioStr
              });
              await purchaseService.createRecepcionOC({
                  IDRecepcionGrupal: idRecepcionGrupal,
                  IDCompra: order.id, // Use Univoco ID as requested
                  IDDetalleCompra: detail.id, // Use SharePoint ID of the detail
                  Usuario: userEmail,
                  Fecha: dateStr,
                  Hora: timeStr,
                  FechaRecepcion: dateStr,
                  NroRemito: remito,
                  Lote: lote,
                  IdArticulo: detail.IdArticulo || detail.idArticulo,
                  DetalleArticulo: detail.Articulo || detail.articulo,
                  ArticuloConcat: detail.ArticuloConcat || detail.articuloConcat,
                  SKU: detail.SKU || detail.sku,
                  CantidadRecepcion: incomingQty.toString(),
                  Status: 'Recepcionado',
                  VersionApp: '1.0',
                  MesAnio: mesAnioStr
              });
          }

          await purchaseService.updateDetalleOC(detail.id, { 
            CantidadRecepcionada: totalReceived.toString(),
            ValorRecepcionado: (totalReceived * (parseFloat(detail.PrecioUnitario || detail.precioUnitario) || 0)).toString(),
            Usuario: usuarioApp,
            VersionApp: 'v20251223_1.0.10'
          });

          if (totalReceived > 0) someReceived = true;
        }
      }

      // Check if ALL items are completed (including those not in current input)
      for (const detail of details) {
          const sku = detail.SKU || detail.sku;
          const currentInput = inputs[sku] || 0;
          const prevReceived = parseInt(detail.CantidadRecepcionada || detail.cantidadRecepcionada) || 0;
          const totalReceived = prevReceived + currentInput;
          const originalQty = parseInt(detail.Cantidad || detail.cantidad) || 0;
          
          if (totalReceived < originalQty) {
              allCompleted = false;
              break; 
          }
      }

      // Save Images
      for (const img of images) {
        const payload = {
            Usuario: userEmail,
            Fecha: dateStr,
            Hora: timeStr,
            IdOrdenCompra: order.id,
            IdDetalleCompra: img.detailId || '-',
            IdRecepcion: idRecepcionGrupal,
            Imagen: img.data,
            Tipo: img.type,
            Status: 'Activo',
            VersionApp: 'v20251223_1.0.10',
            MesAnio: mesAnioStr
        };

        console.log("Payload for createImagenRecepcion:", payload);
        try {
            await purchaseService.createImagenRecepcion(payload as any);
        } catch (imgError) {
            console.error("Error creating ImagenRecepcion for image:", img, imgError);
            if ((imgError as any).response) {
                console.error("Server response for image error:", (imgError as any).response.data);
            }
            throw imgError; // Re-throw to propagate to main catch block
        }
      }

      // Determine Status
      let newStatus: OrderStatus = 'En Recepcion';
      if (allCompleted) {
        newStatus = 'Completada';
      } else if (someReceived) {
        newStatus = 'En Recepcion';
      }

      await purchaseService.updateOrdenCompra(apiId, { 
        Status: newStatus,
        Usuario: usuarioApp,
        VersionApp: 'v20251223_1.0.10'
      });

      const updatedOrders = orders.map(o => {
          if (o.id === orderId) {
              const updatedItems = o.items.map(item => {
                  const incomingQty = inputs[item.sku] || 0;
                  const prevReceived = item.receivedQuantity || 0;
                  return {
                      ...item,
                      receivedQuantity: prevReceived + incomingQty
                  };
              });

              return {
                  ...o,
                  items: updatedItems,
                  status: newStatus
              };
          }
          return o;
      });

      setOrders(sortOrders(updatedOrders));
      setIsReceptionModalOpen(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error("Error saving reception:", error);
      notify.error("Error al guardar la recepción.");
    } finally {
      setIsSavingReception(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;

    try {
      const { purchaseService } = await import('../services/purchaseService');
      const apiId = orderToDelete.sharepointId || orderToDelete.id;

      const usuarioApp = getSessionUser().usuarioApp;

      await purchaseService.updateOrdenCompra(apiId, {
        Status: 'Baja',
        Usuario: usuarioApp,
        VersionApp: 'v20251223_1.0.10'
      });

      setOrders(orders.filter(o => o.id !== orderToDelete.id));
      setIsDeleteModalOpen(false);
      setOrderToDelete(null);
    } catch (error) {
      console.error("Error deleting order:", error);
      notify.error("Error al eliminar la orden.");
    }
  };

  // Filter Logic
  const filteredOrders = orders.filter(o => {
    const providerName = o.providerName || '';
    const matchesSearch = providerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
           o.id.toString().includes(searchTerm);
    
    const matchesProvider = selectedProviders.length === 0 || selectedProviders.includes(o.providerId);
    
    const matchesStatus = selectedStatus.length === 0 || selectedStatus.includes(o.status);

    return matchesSearch && matchesProvider && matchesStatus;
  });

  // Calculate unique statuses from current orders
  const uniqueStatuses = Array.from(new Set(orders.map(o => o.status))).filter(Boolean).sort();
  const statusOptions = uniqueStatuses.map(status => ({ value: status, label: status }));

  return (
    <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-500 bg-muted/50 overflow-y-auto md:overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-muted px-4 py-4 sm:px-8">
        <PageHeader
          title="Gestión de Compras"
          subtitle="Control de órdenes y proveedores"
          actions={
          <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3 w-full lg:w-auto items-center">
             <div className="hidden lg:flex flex-1 sm:w-40 min-w-[140px]">
                <MultiSelect
                    options={statusOptions}
                    value={selectedStatus}
                    onChange={setSelectedStatus}
                    placeholder="Filtrar Estados"
                />
             </div>

             <div className="hidden lg:flex flex-1 sm:w-64 min-w-[160px]">
                 <MultiSelect
                     options={providers.map(p => ({ value: p.id, label: p.name }))}
                     value={selectedProviders}
                     onChange={setSelectedProviders}
                     placeholder="Filtrar Proveedores"
                 />
             </div>
             
             <div className="flex w-full sm:w-auto gap-2 items-center">
               <Button
                 variant="outline"
                 size="icon"
                 onClick={fetchData}
                 disabled={isLoading}
                 className="rounded-md bg-card text-foreground border-border shadow-sm hover:bg-accent hover:text-brand transition-colors shrink-0"
                 title="Actualizar datos"
               >
                 <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand' : ''}`} />
               </Button>

               {/* Mobile Filter Button & Popover */}
               <div className="relative lg:hidden">
                 <Button
                   variant="outline"
                   size="icon"
                   onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
                   className={`rounded-md bg-card text-foreground border-border shadow-sm hover:bg-accent hover:text-brand transition-colors shrink-0 ${isMobileFiltersOpen ? 'ring-2 ring-ring/20 border-brand text-brand' : ''}`}
                   title="Filtros"
                 >
                   <Filter className="w-4 h-4" />
                 </Button>

                 {isMobileFiltersOpen && (
                   <>
                     <div 
                       className="fixed inset-0 z-40"
                       onClick={() => setIsMobileFiltersOpen(false)}
                     />
                     <div className="absolute top-full left-0 mt-3 w-[260px] sm:w-72 bg-card rounded-md shadow-xl border border-border z-50 animate-in fade-in zoom-in-95 origin-top-left">
                       {/* Flecha apuntando al icono */}
                       <div className="absolute -top-[6px] left-[16px] w-3 h-3 bg-card border-t border-l border-border transform rotate-45 rounded-tl-[2px]"></div>
                       
                       <div className="relative z-10 bg-card rounded-md">
                         <div className="p-4 border-b border-border flex items-center justify-between">
                           <h3 className="font-semibold text-foreground">Filtrar</h3>
                           <button 
                             onClick={() => setIsMobileFiltersOpen(false)}
                             className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent transition-colors"
                           >
                             <X className="w-4 h-4" />
                           </button>
                         </div>
                         <div className="p-4 space-y-4">
                           <div className="space-y-2">
                             <div className="flex items-center justify-between">
                               <label className="text-sm font-medium text-foreground">Estado</label>
                               {selectedStatus.length > 0 && (
                                 <button 
                                   onClick={() => setSelectedStatus([])}
                                   className="text-xs text-muted-foreground hover:text-foreground"
                                 >
                                   Limpiar
                                 </button>
                               )}
                             </div>
                             <MultiSelect
                                 options={statusOptions}
                                 value={selectedStatus}
                                 onChange={setSelectedStatus}
                                 placeholder="Seleccionar"
                             />
                           </div>
                           <div className="space-y-2">
                             <div className="flex items-center justify-between">
                               <label className="text-sm font-medium text-foreground">Proveedor</label>
                               {selectedProviders.length > 0 && (
                                 <button 
                                   onClick={() => setSelectedProviders([])}
                                   className="text-xs text-muted-foreground hover:text-foreground"
                                 >
                                   Limpiar
                                 </button>
                               )}
                             </div>
                             <MultiSelect
                                 options={providers.map(p => ({ value: p.id, label: p.name }))}
                                 value={selectedProviders}
                                 onChange={setSelectedProviders}
                                 placeholder="Seleccionar"
                             />
                           </div>
                         </div>
                       </div>
                     </div>
                   </>
                 )}
               </div>

               <div className="relative flex-1 sm:w-64 group">
                 <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-brand transition-colors" />
                 <Input 
                   placeholder="Buscar..." 
                   className="pl-10 bg-card shadow-sm border-border focus:border-primary focus:ring-ring/20 rounded-md w-full"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                 />
               </div>
             </div>
             
             <Button 
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full sm:w-auto bg-brand hover:bg-brand/90 text-brand-foreground shadow-sm rounded-md px-6 py-2.5 flex items-center justify-center gap-2 transition-all active:scale-95"
             >
               <Plus className="w-4 h-4" />
               <span className="hidden sm:inline">Nueva Orden</span>
               <span className="sm:hidden">Nueva OC</span>
             </Button>
          </div>
          }
        />
      </div>

      {/* Main Content Area */}
      <div className="flex min-h-0 flex-1 flex-col px-4 sm:px-8 pb-4 pt-2 md:overflow-hidden overflow-y-auto">
        {(isLoading || isRefreshing) ? (
          <div className="flex h-full min-h-[400px] items-center justify-center">
            <Loader text="Cargando órdenes…" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] animate-in fade-in zoom-in-95 duration-500">
             <div className="w-20 h-20 bg-muted rounded-md flex items-center justify-center mb-6 shadow-sm ring-1 ring-border">
                 <FileText className="w-10 h-10 text-muted-foreground" />
             </div>
             <h3 className="text-xl font-bold text-foreground tracking-tight">No hay órdenes</h3>
             <p className="text-muted-foreground mt-2 text-center max-w-xs">No se encontraron órdenes de compra con los filtros actuales.</p>
             <Button onClick={() => setIsCreateModalOpen(true)} className="mt-6 rounded-md bg-brand text-brand-foreground px-6 py-2.5 shadow-sm">
               <Plus className="w-4 h-4 mr-2" />
               Generar Nueva OC
             </Button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:flex min-h-0 flex-1 flex-col bg-card rounded-lg border border-border shadow-sm"><div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="sticky top-0 z-20 bg-muted border-b border-border">
                  <tr className="border-b border-border bg-muted/50">
                    <th className="h-12 px-4 text-left text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Orden</th>
                    <th className="h-12 px-4 text-left text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Fecha & Proveedor</th>
                    <th className="h-12 px-4 text-right text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Items</th>
                    <th className="h-12 px-4 text-center text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Estado</th>
                    <th className="h-12 px-4 text-right text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Avance</th>
                    <th className="h-12 px-4 text-right text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border [&_tr]:transition-colors [&_tr:hover]:bg-muted/40">
                  {filteredOrders.map((order) => {
                    const totalItems = order.items.reduce((acc, i) => acc + i.quantity, 0);
                    const totalReceived = order.items.reduce((acc, i) => acc + (i.receivedQuantity || 0), 0);
                    let progress = Math.floor((totalReceived / totalItems) * 100) || 0;
                    if (progress === 100 && totalReceived < totalItems) {
                        progress = 99;
                    }
                    
                    return (
                      <tr key={order.id} className="hover:bg-brand/10/30 transition-all duration-200 group">
                        <td className="h-16 px-4 py-3">
                          <span className="inline-block bg-brand/10 text-brand font-bold px-2 py-1 rounded text-xs">
                              #{order.sharepointId || order.id}
                          </span>
                        </td>
                        <td className="h-16 px-4 py-3">
                           <div className="flex flex-col">
                              <span className="font-semibold text-foreground text-sm">{capitalizeFirst(order.providerName)}</span>
                              <div className="flex items-center gap-1.5 mt-1">
                                  <Calendar className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">{order.date}</span>
                              </div>
                           </div>
                        </td>

                        <td className="h-16 px-4 py-3 text-right">
                          <span className="font-bold text-foreground">{totalItems}</span> <span className="text-muted-foreground text-xs">un.</span>
                        </td>
                        <td className="h-16 px-4 py-3 text-center">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="h-16 px-4 py-3 text-right">
                           {order.status.toUpperCase() === 'COMPLETADA' || order.status.toUpperCase() === 'APROBADA' || order.status.toUpperCase() === 'EN RECEPCION' || order.status.toUpperCase() === 'PENDIENTE INGRESO' ? (
                               <div className="flex flex-col items-end gap-1">
                                   <div className="w-24 bg-muted rounded-full h-1.5 overflow-hidden">
                                       <div 
                                          className={`h-1.5 rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-brand'}`} 
                                          style={{ width: `${progress}%` }} 
                                       />
                                   </div>
                                   <span className="text-[10px] font-bold text-muted-foreground">{progress}%</span>
                               </div>
                           ) : (
                               <span className="text-muted-foreground text-xs">-</span>
                           )}
                        </td>
                        <td className="h-16 px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                              {order.status === 'Presupuesto' && (
                                  <>
                                      <button 
                                          onClick={() => handleOpenBudgetModal(order)}
                                          title="Cargar Presupuesto"
                                          className="p-2 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                      >
                                          <DollarSign className="w-4 h-4" />
                                      </button>
                                      <button 
                                          onClick={() => handleResendClick(order)}
                                          title="Reenviar solicitud"
                                          className="p-2 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                      >
                                          <Send className="w-4 h-4" />
                                      </button>
                                      <button 
                                          onClick={() => {
                                            setOrderToDelete(order);
                                            setIsDeleteModalOpen(true);
                                          }}
                                          title="Eliminar Orden"
                                          className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      >
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                  </>
                              )}
                              
                              {(order.status.toUpperCase() === 'APROBADA' || order.status.toUpperCase() === 'EN RECEPCION') && (
                                  <button 
                                      onClick={() => handleOpenReceptionModal(order)}
                                      title="Ingresar Remito (Recepción)"
                                      className="p-2 text-muted-foreground hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                                  >
                                      <Truck className="w-4 h-4" />
                                  </button>
                              )}

                              <button 
                                  onClick={() => {
                                      setSelectedOrder(order);
                                      setIsViewModalOpen(true);
                                  }}
                                  className="p-2 text-muted-foreground hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                                  title="Ver detalles"
                              >
                                  <Eye className="w-4 h-4" />
                              </button>
                          </div>
                        </td>
                      </tr>
                    )})}
                </tbody>
              </table>
            </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {filteredOrders.map((order) => {
                const totalItems = order.items.reduce((acc, i) => acc + i.quantity, 0);
                const totalReceived = order.items.reduce((acc, i) => acc + (i.receivedQuantity || 0), 0);
                let progress = Math.floor((totalReceived / totalItems) * 100) || 0;

                return (
                  <div key={order.id} className="bg-card rounded-lg border border-border shadow-sm p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="font-bold text-brand text-sm">#{order.sharepointId || order.id}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" /> {order.date}
                        </span>
                      </div>
                      <div className="scale-90 origin-right">
                        {getStatusBadge(order.status)}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Proveedor</span>
                        <span className="text-sm font-semibold text-foreground">{capitalizeFirst(order.providerName)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Items</span>
                        <span className="text-sm font-bold text-foreground">{totalItems} <span className="text-[10px] text-muted-foreground font-medium">un.</span></span>
                      </div>
                      
                      {(order.status.toUpperCase() === 'COMPLETADA' || order.status.toUpperCase() === 'APROBADA' || order.status.toUpperCase() === 'EN RECEPCION' || order.status.toUpperCase() === 'PENDIENTE INGRESO') && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Avance</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={`h-1.5 rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-brand'}`} 
                                style={{ width: `${progress}%` }} 
                              />
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground">{progress}%</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-border flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 rounded-md text-xs gap-2 min-w-[100px]"
                        onClick={() => {
                            setSelectedOrder(order);
                            setIsViewModalOpen(true);
                        }}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Detalles
                      </Button>
                      
                      {order.status === 'Presupuesto' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 rounded-md text-xs gap-2 text-emerald-600 border-emerald-100 bg-emerald-50/50 min-w-[100px]"
                            onClick={() => handleOpenBudgetModal(order)}
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            Presup.
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 rounded-md text-xs gap-2 text-brand border-indigo-100 bg-brand/10/50 min-w-[100px]"
                            onClick={() => handleResendClick(order)}
                          >
                            <Send className="w-3.5 h-3.5" />
                            Reenviar
                          </Button>
                        </>
                      )}
                      
                      {(order.status.toUpperCase() === 'APROBADA' || order.status.toUpperCase() === 'EN RECEPCION') && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 rounded-md text-xs gap-2 text-brand border-brand/20 bg-brand/10/50 min-w-[100px]"
                          onClick={() => handleOpenReceptionModal(order)}
                        >
                          <Truck className="w-3.5 h-3.5" />
                          Recibir
                        </Button>
                      )}

                      {order.status === 'Presupuesto' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-md text-xs text-red-600 border-red-100 bg-red-50/50 px-3"
                          onClick={() => {
                            setOrderToDelete(order);
                            setIsDeleteModalOpen(true);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* --- MODALS (Imported Components) --- */}
      <CreateOrderModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSave={handleCreateOrderSave} 
        providers={providers}
        articles={articles}
        isLoading={isLoading}
        onArticleCreated={(newArticle) => {
          setArticles(prev => [...prev, newArticle]);
        }}
      />

      <NotificationModal 
        isOpen={isNotificationModalOpen}
        onClose={() => {
            setIsNotificationModalOpen(false);
            setOrderToResend(null);
            if(tempOrderData) setTempOrderData(null); // Clear temp if cancelled
        }}
        orderToResend={orderToResend}
        tempOrderData={tempOrderData}
        provider={activeNotificationProvider}
        onSendWhatsApp={handleSendWhatsApp}
        onSendEmail={handleSendEmail}
        onSendAutomatedEmail={handleSendAutomatedEmail}
        hasPhone={!!activeNotificationProvider?.phone && activeNotificationProvider.phone.trim() !== '' && activeNotificationProvider.phone.trim() !== '-'}
        hasEmail={!!activeNotificationProvider?.email && activeNotificationProvider.email.trim() !== '' && activeNotificationProvider.email.trim() !== '-'}
        isLoading={isSendingEmail}
      />

      <BudgetModal 
        isOpen={isBudgetModalOpen}
        onClose={() => {
            setIsBudgetModalOpen(false);
            setSelectedOrder(null);
        }}
        order={selectedOrder}
        onSave={handleSaveBudget}
        isLoading={isSavingBudget}
      />

      <ReceptionModal 
        isOpen={isReceptionModalOpen}
        onClose={() => {
            setIsReceptionModalOpen(false);
            setSelectedOrder(null);
        }}
        order={selectedOrder}
        onSave={handleSaveReception}
        isLoading={isSavingReception}
      />

      <ViewOrderModal 
        isOpen={isViewModalOpen}
        onClose={() => {
            setIsViewModalOpen(false);
            setSelectedOrder(null);
        }}
        order={selectedOrder}
        onBudgetClick={handleOpenBudgetModal}
        onResendClick={handleResendClick}
      />

      <DeleteConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setOrderToDelete(null);
        }}
        onConfirm={handleDeleteOrder}
        orderId={orderToDelete?.sharepointId || orderToDelete?.id || null}
      />

    </div>
  );
};
