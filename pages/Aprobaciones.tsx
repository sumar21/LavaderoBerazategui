
import React, { useState } from 'react';
import { Eye, Check, X, AlertCircle, Trash2, Save, ArrowLeft, Clock, RefreshCcw, Loader2, Search } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { PurchaseOrder, OrderStatus, OrderItem } from '@/types';
import { purchaseService } from '../services/purchaseService';
import { getSessionUser } from '../services/session';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { StatusBadge } from '../components/ui/StatusBadge';
import { capitalizeFirst } from '../utils/text';
import { MAX_QUANTITY, toCount } from '../utils/number';

interface AprobacionesProps {
  orders: PurchaseOrder[];
  setOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};

const isPending = (o: PurchaseOrder) => {
  const s = o.status ? o.status.toUpperCase() : '';
  return s === 'PENDIENTE' || s.includes('PENDIENTE APROBACION') || s.includes('PENDIENTE_APROBACION') || s.includes('PENDIENTE APROBACIÓN');
};

const STATUS_OPTIONS = [
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'APROBADA', label: 'Aprobadas' },
  { value: 'RECHAZADA', label: 'Rechazadas' },
  { value: 'TODAS', label: 'Todas' },
];

export const Aprobaciones: React.FC<AprobacionesProps> = ({ orders, setOrders, onRefresh, isRefreshing }) => {
  // Defaults to PENDIENTE so the screen still opens on the work queue; the other
  // options exist because an approved order used to vanish with no way to look
  // it up again.
  const [statusFilter, setStatusFilter] = useState('PENDIENTE');
  const [searchTerm, setSearchTerm] = useState('');

  const visibleOrders = orders.filter(o => {
    const s = o.status ? o.status.toUpperCase() : '';
    const matchesStatus =
      statusFilter === 'TODAS' ? true :
      statusFilter === 'PENDIENTE' ? isPending(o) :
      s.includes(statusFilter);

    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = !q || [o.sharepointId, o.id, o.providerName, o.requester, o.date]
      .some(f => String(f ?? '').toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  // "Todo al día" is only true of the untouched pending queue — with a filter on,
  // an empty table means the search found nothing, which is a different message.
  const isDefaultView = statusFilter === 'PENDIENTE' && !searchTerm.trim();

  // Logic for Approval/Rejection/Edit
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Edit State (Draft)
  const [editOrderDraft, setEditOrderDraft] = useState<PurchaseOrder | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // A resolved order opens read-only. The detail modal is now reachable for any
  // status and it carries the approve/reject buttons — without this it would be
  // a second door onto the decision the row buttons already refuse to reopen.
  const isDraftEditable = !!editOrderDraft && isPending(editOrderDraft);

  const calculateTotal = (items: OrderItem[]) => {
    return items.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0);
  };

  const handleOpenDetail = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    // Create a deep copy for editing
    setEditOrderDraft(JSON.parse(JSON.stringify(order)));
    setIsDetailModalOpen(true);
  };

  const handleQuantityChange = (sku: string, newQty: number) => {
    if (!editOrderDraft || newQty < 1) return;
    const updatedItems = editOrderDraft.items.map(item => 
        item.sku === sku ? { ...item, quantity: newQty } : item
    );
    setEditOrderDraft({ ...editOrderDraft, items: updatedItems });
  };

  const handleDeleteItem = (sku: string) => {
    if (!editOrderDraft) return;
    const updatedItems = editOrderDraft.items.filter(item => item.sku !== sku);
    setEditOrderDraft({ ...editOrderDraft, items: updatedItems });
  };

  const handleAction = async (type: 'APPROVE' | 'REJECT', orderId: string, draftOrder?: PurchaseOrder) => {
    setIsProcessingAction(true);
    try {
      const newStatus = (type === 'APPROVE' ? 'Aprobada' : 'Rechazada') as OrderStatus;
      const order = orders.find(o => o.id === orderId);
      const apiId = order?.sharepointId || orderId;

      const usuarioApp = getSessionUser().usuarioApp;
      
      // Calculate totals if draftOrder exists, otherwise use original order totals
      const targetOrder = draftOrder || order;
      
      let totalQuantity = 0;
      let totalPrice = 0;
      let totalArticles = 0;

      if (targetOrder) {
        totalArticles = targetOrder.items.length;
        targetOrder.items.forEach(item => {
            totalQuantity += item.quantity || 0;
            totalPrice += (item.quantity || 0) * (item.price || 0);
        });
      }

      // Update API
      const updatePayload: any = { 
        Status: newStatus,
        Usuario: usuarioApp,
        VersionApp: 'v20251223_1.0.10',
        CantidadTotal: totalQuantity.toString(),
        Precio: totalPrice.toString(),
        CantidadArticulos: totalArticles.toString()
      };

      if (type === 'REJECT' && rejectionReason) {
          updatePayload.Observaciones = rejectionReason;
      }

      await purchaseService.updateOrdenCompra(apiId.toString(), updatePayload);
      
      // Sync item changes if draftOrder exists
      if (draftOrder && order) {
        const details = await purchaseService.getDetallesOC(order.id);
        
        // 1. Handle deletions (items in original but not in draft)
        for (const originalItem of order.items) {
          const stillExists = draftOrder.items.find(i => i.sku === originalItem.sku);
          if (!stillExists) {
            const detail = details.find(d => (d.SKU || d.sku) === originalItem.sku);
            if (detail) {
              await purchaseService.updateDetalleOC(detail.id, { 
                Status: 'Baja',
                Usuario: usuarioApp,
                VersionApp: 'v20251223_1.0.10'
              });
            }
          }
        }

        // 2. Handle quantity updates
        for (const draftItem of draftOrder.items) {
          const originalItem = order.items.find(i => i.sku === draftItem.sku);
          if (originalItem && originalItem.quantity !== draftItem.quantity) {
            const detail = details.find(d => (d.SKU || d.sku) === draftItem.sku);
            if (detail) {
              await purchaseService.updateDetalleOC(detail.id, { 
                Cantidad: draftItem.quantity.toString(),
                PrecioTotal: (draftItem.quantity * (draftItem.price || 0)).toString(),
                Usuario: usuarioApp,
                VersionApp: 'v20251223_1.0.10'
              });
            }
          }
        }
      }
      
      const updatedOrders = orders.map(o => {
          if (o.id === orderId) {
              // If we have a draft (edited version), use its items
              const finalItems = draftOrder ? draftOrder.items : o.items;
              return {
                  ...o,
                  items: finalItems,
                  status: newStatus
              };
          }
          return o;
      });
      setOrders(updatedOrders);
      setIsDetailModalOpen(false);
      setIsRejectModalOpen(false);
      setSelectedOrder(null);
      setEditOrderDraft(null);
      setRejectionReason('');
    } catch (error) {
      console.error("Error updating order:", error);
      // Handle error (show toast, etc.)
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-500 bg-muted/50 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-muted px-4 py-4 sm:px-8">
        <PageHeader
          title="Aprobaciones"
          subtitle="Gestión de autorizaciones"
          actions={
             <div className="flex w-full flex-wrap items-center gap-2 sm:gap-3 lg:w-auto lg:flex-nowrap">
               <Button
                 variant="outline"
                 size="icon"
                 onClick={onRefresh}
                 disabled={isRefreshing}
                 className="rounded-md bg-card text-foreground border-border shadow-sm hover:bg-accent hover:text-brand transition-colors h-9 w-9 sm:h-10 sm:w-10 shrink-0"
                 title="Actualizar datos"
               >
                 <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand' : ''}`} />
               </Button>

               <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none group">
                 <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-brand transition-colors" />
                 <input
                   placeholder="Buscar OC o proveedor..."
                   aria-label="Buscar órdenes"
                   className="w-full pl-10 h-10 rounded-md bg-card shadow-sm border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all text-sm"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                 />
               </div>

               <div className="w-40 shrink-0">
                 <Select
                   options={STATUS_OPTIONS}
                   value={statusFilter}
                   onChange={setStatusFilter}
                 />
               </div>
             </div>
          }
        />
      </div>

      {/* Content */}
      <div className="flex min-h-0 flex-1 flex-col px-4 sm:px-8 pb-4 pt-5 md:overflow-hidden overflow-y-auto">
        {visibleOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] sm:min-h-[400px] animate-in fade-in zoom-in-95 duration-500">
             <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg sm:rounded-md flex items-center justify-center mb-4 sm:mb-6 shadow-sm ring-1 ring-emerald-100">
                 <Check className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-500" />
             </div>
             <h3 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
               {isDefaultView ? 'Todo al día' : 'Sin resultados'}
             </h3>
             <p className="text-muted-foreground mt-2 text-center max-w-xs text-sm sm:text-base">
               {isDefaultView
                 ? 'No hay solicitudes pendientes de aprobación en este momento.'
                 : 'Ninguna orden coincide con la búsqueda o el filtro aplicado.'}
             </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:flex min-h-0 flex-1 flex-col overflow-hidden bg-card rounded-lg border border-border shadow-sm"><div className="min-h-0 flex-1 overflow-auto bg-muted">
              {/* table-fixed so a long amount or provider name cannot widen its own
                  column and shove the rest sideways. min-w keeps the columns readable:
                  below it the wrapper scrolls instead of squashing them. */}
              <table className="w-full table-fixed min-w-[900px] text-left text-[13px]">
                <thead className="sticky top-0 z-20 bg-muted border-b border-border">
                  <tr className="border-b border-border bg-muted/50">
                    <th className="h-12 w-40 px-4 text-left text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Orden</th>
                    <th className="h-12 px-4 text-left text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Detalles</th>
                    <th className="h-12 w-56 px-4 text-left text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Solicitante</th>
                    <th className="h-12 w-44 px-4 text-right text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Monto Total</th>
                    <th className="h-12 w-40 px-4 text-right text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Decisión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card [&_tr]:transition-colors [&_tr:hover]:bg-muted/40">
                  {visibleOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-brand/10/30 transition-all duration-200 group">
                      <td className="h-16 px-4 py-3">
                        <div className="flex flex-col gap-1">
                            <span className="text-brand font-bold bg-brand/10 px-2 py-0.5 rounded w-fit text-xs">#{order.sharepointId || order.id}</span>
                            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                <Clock className="w-3 h-3" />
                                <span>{order.date}</span>
                            </div>
                        </div>
                      </td>
                      <td className="h-16 px-4 py-3">
                        <span className="block truncate font-semibold text-foreground" title={capitalizeFirst(order.providerName)}>{capitalizeFirst(order.providerName)}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {order.items.length} ítems{isPending(order) ? ' esperando revisión' : ''}
                        </span>
                      </td>
                      <td className="h-16 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                                {order.requester ? order.requester.substring(0, 2).toUpperCase() : 'US'}
                            </div>
                            <div className="flex min-w-0 flex-col">
                                <span className="truncate text-sm font-medium text-foreground">{order.requester || 'Usuario'}</span>
                                <span className="truncate text-[10px] text-muted-foreground uppercase">{order.requesterProfile || 'COMPRAS'}</span>
                            </div>
                        </div>
                      </td>
                      <td className="h-16 px-4 py-3 text-right">
                        <span className="block truncate text-lg font-bold text-foreground tabular-nums" title={formatCurrency(calculateTotal(order.items))}>
                            {formatCurrency(calculateTotal(order.items))}
                        </span>
                      </td>
                      <td className="h-16 px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                            {/* Approve/reject only exist while the order is still pending.
                                Now that resolved orders are reachable through the filter,
                                leaving them here would let you re-decide a closed order. */}
                            {isPending(order) ? (
                              <>
                                <button
                                    onClick={() => handleAction('APPROVE', order.id)}
                                    title="Aprobar"
                                    disabled={isProcessingAction}
                                    className="p-2 text-emerald-600 bg-card hover:bg-emerald-500 hover:text-white border border-emerald-200 hover:border-emerald-500 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedOrder(order);
                                        setIsRejectModalOpen(true);
                                    }}
                                    title="Rechazar"
                                    disabled={isProcessingAction}
                                    className="p-2 text-red-600 bg-card hover:bg-red-500 hover:text-white border border-red-200 hover:border-red-500 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <StatusBadge status={order.status} />
                            )}
                            <div className="h-6 w-px bg-muted mx-1"></div>
                            <button
                                onClick={() => handleOpenDetail(order)}
                                title="Ver detalles y editar"
                                disabled={isProcessingAction}
                                className="p-2 text-muted-foreground hover:text-brand hover:bg-brand/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Eye className="w-4 h-4" />
                            </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>

            {/* Mobile Card View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {visibleOrders.map((order) => (
                <div key={order.id} className="bg-card rounded-lg p-4 shadow-sm border border-border flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <span className="text-brand font-bold bg-brand/10 px-2 py-0.5 rounded w-fit text-[10px]">#{order.sharepointId || order.id}</span>
                      <h3 className="font-bold text-foreground text-sm line-clamp-1">{capitalizeFirst(order.providerName)}</h3>
                      <div className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                        <Clock className="w-3 h-3" />
                        <span>{order.date}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{formatCurrency(calculateTotal(order.items))}</p>
                      <p className="text-[10px] text-muted-foreground">{order.items.length} ítems</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 py-2 border-y border-border">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                      {order.requester ? order.requester.substring(0, 2).toUpperCase() : 'US'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-foreground">{order.requester || 'Usuario'}</span>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{order.requesterProfile || 'COMPRAS'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {isPending(order) ? (
                      <>
                        <Button
                          variant="outline"
                          className="flex-1 h-9 text-xs border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                          onClick={() => handleAction('APPROVE', order.id)}
                        >
                          <Check className="w-3.5 h-3.5 mr-1.5" />
                          Aprobar
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 h-9 text-xs border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsRejectModalOpen(true);
                          }}
                        >
                          <X className="w-3.5 h-3.5 mr-1.5" />
                          Rechazar
                        </Button>
                      </>
                    ) : (
                      <div className="flex-1"><StatusBadge status={order.status} /></div>
                    )}
                    <Button
                      variant="outline" 
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => handleOpenDetail(order)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- REJECT CONFIRMATION MODAL --- */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => {
            if (isProcessingAction) return;
            setIsRejectModalOpen(false);
            setRejectionReason('');
        }}
        title="Rechazar solicitud"
        loading={isProcessingAction}
        loadingText="Procesando rechazo…"
        footer={
            <>
                <Button variant="outline" disabled={isProcessingAction} onClick={() => {
                    setIsRejectModalOpen(false);
                    setRejectionReason('');
                }}>Cancelar</Button>
                <Button variant="destructive" disabled={isProcessingAction} onClick={() => selectedOrder && handleAction('REJECT', selectedOrder.id)}>
                    {isProcessingAction ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Rechazando...
                        </>
                    ) : (
                        'Confirmar Rechazo'
                    )}
                </Button>
            </>
        }
      >
        <div className="space-y-4">
            <div className="flex items-center gap-4 bg-red-50 p-5 rounded-md border border-red-100 text-red-900">
                <div className="bg-red-100 p-2 rounded-full">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                    <p className="font-bold">Acción Irreversible</p>
                    <p className="text-sm opacity-90 mt-1">¿Está seguro que desea rechazar la Orden de Compra <b>#{selectedOrder?.sharepointId || selectedOrder?.id}</b>?</p>
                </div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-foreground mb-1">Motivo del rechazo (opcional)</label>
                <textarea
                    className="w-full rounded-md border border-border p-3 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none min-h-[100px]"
                    placeholder="Ingrese el motivo del rechazo..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    disabled={isProcessingAction}
                />
            </div>
        </div>
      </Modal>

      {/* --- EDIT & APPROVE DETAILS MODAL --- */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
            if (isProcessingAction) return;
            setIsDetailModalOpen(false);
        }}
        title={`${isDraftEditable ? 'Gestionar Aprobación' : 'Detalle'} OC #${editOrderDraft?.sharepointId || editOrderDraft?.id}`}
        description={isDraftEditable
          ? 'Revise los ítems, ajuste cantidades o elimine productos antes de aprobar.'
          : 'Esta orden ya fue resuelta. Se muestra solo para consulta.'}
        maxWidth="3xl"
        loading={isProcessingAction}
        loadingText="Procesando aprobación…"
        footer={
           <div className="flex justify-between w-full">
               <Button variant="outline" disabled={isProcessingAction} onClick={() => setIsDetailModalOpen(false)}>
                 {isDraftEditable ? 'Cancelar' : 'Cerrar'}
               </Button>
               {isDraftEditable && (
               <div className="flex gap-2">
                   <Button
                     variant="destructive"
                     disabled={isProcessingAction}
                     onClick={() => {
                        setIsDetailModalOpen(false);
                        setIsRejectModalOpen(true);
                     }}
                    >
                     Rechazar
                   </Button>
                   <Button
                     disabled={isProcessingAction}
                     onClick={() => editOrderDraft && handleAction('APPROVE', editOrderDraft.id, editOrderDraft)}
                     className="bg-emerald-600 hover:bg-emerald-700 text-white dark:text-emerald-950"
                    >
                     {isProcessingAction ? (
                         <>
                             <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                             Aprobando...
                         </>
                     ) : (
                         <>
                             <Check className="w-4 h-4 mr-2" />
                             Aprobar Orden
                         </>
                     )}
                   </Button>
               </div>
               )}
           </div>
        }
      >
        {editOrderDraft && (
            <div className="space-y-5">
                <div className="flex justify-between items-center bg-muted/80 p-4 rounded-md border border-border">
                    <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Proveedor</p>
                        <p className="font-bold text-foreground text-lg">{capitalizeFirst(editOrderDraft.providerName)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Actualizado</p>
                        <p className="text-xl font-bold text-emerald-700">{formatCurrency(calculateTotal(editOrderDraft.items))}</p>
                    </div>
                </div>

                {/* MOBILE VIEW (Cards) */}
                <div className="md:hidden space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                    {editOrderDraft.items.map((item, idx) => (
                        <div key={item.sku} className="bg-card border border-border rounded-md p-4 shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <span className="block font-bold text-foreground">{capitalizeFirst(item.description)}</span>
                                    <span className="block text-xs text-muted-foreground mt-0.5">{item.sku}</span>
                                </div>
                                <button 
                                    hidden={!isDraftEditable}
                                    onClick={() => handleDeleteItem(item.sku)}
                                    className="text-muted-foreground hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"
                                    title="Eliminar item"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-muted p-2 rounded-lg">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Precio</span>
                                    <span className="text-sm font-bold text-foreground">{item.price ? formatCurrency(item.price) : '-'}</span>
                                </div>
                                <div className="bg-muted p-2 rounded-lg">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Cantidad</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        max={MAX_QUANTITY}
                                        className="w-full text-center border border-border rounded-lg px-2 py-1 text-sm focus:border-primary focus:ring-1 focus:ring-ring outline-none bg-card text-foreground font-bold"
                                        value={item.quantity}
                                        disabled={!isDraftEditable}
                                        onChange={(e) => handleQuantityChange(item.sku, toCount(e.target.value))}
                                    />
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Subtotal</span>
                                <span className="text-sm font-bold text-foreground">{item.price ? formatCurrency(item.price * item.quantity) : '-'}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* DESKTOP VIEW (Table) */}
                {/* This one scrolls itself, so it IS the sticky context. `overflow-hidden`
                    alongside `overflow-y-auto` was contradictory — the Y axis wins anyway. */}
                <div className="hidden md:block rounded-md border border-border bg-muted max-h-[55vh] overflow-auto shadow-sm">
                    <table className="w-full table-fixed min-w-[560px] text-[13px]">
                        <thead className="sticky top-0 z-20 bg-muted border-b border-border">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Descripción</th>
                                <th className="px-4 py-3 text-right w-40 text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Precio</th>
                                <th className="px-5 py-3 text-center w-32 text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Cant.</th>
                                <th className="px-5 py-3 text-right w-16 text-sm align-middle font-medium text-muted-foreground whitespace-nowrap"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card [&_tr]:transition-colors [&_tr:hover]:bg-muted/40">
                            {editOrderDraft.items.map((item, idx) => (
                                <tr key={item.sku} className="bg-card hover:bg-accent">
                                    <td className="h-16 px-4 py-3">
                                        <span className="block truncate font-medium text-foreground" title={capitalizeFirst(item.description)}>{capitalizeFirst(item.description)}</span>
                                        <span className="block truncate text-xs text-muted-foreground">{item.sku}</span>
                                    </td>
                                    <td className="h-16 px-4 py-3 text-right text-muted-foreground tabular-nums">
                                        <span className="block truncate" title={item.price ? formatCurrency(item.price) : undefined}>
                                            {item.price ? formatCurrency(item.price) : '-'}
                                        </span>
                                    </td>
                                    <td className="h-16 px-4 py-3">
                                        <div className="flex justify-center">
                                            <input 
                                                type="number" 
                                                min="1"
                                                max={MAX_QUANTITY}
                                                className="w-20 text-center border border-border rounded-lg px-2 py-1 text-sm focus:border-primary focus:ring-1 focus:ring-ring outline-none bg-card text-foreground font-bold appearance-none"
                                                value={item.quantity}
                                                disabled={!isDraftEditable}
                                                onChange={(e) => handleQuantityChange(item.sku, toCount(e.target.value))}
                                            />
                                        </div>
                                    </td>
                                    <td className="h-16 px-4 py-3 text-right">
                                        <button
                                            hidden={!isDraftEditable}
                                            onClick={() => handleDeleteItem(item.sku)}
                                            className="text-muted-foreground hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded"
                                            title="Eliminar item"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {editOrderDraft.items.length === 0 && (
                        <div className="p-8 text-center bg-red-50 flex flex-col items-center">
                             <AlertCircle className="w-8 h-8 text-red-400 mb-2"/>
                            <p className="text-red-800 font-medium">La orden no puede quedar vacía.</p>
                        </div>
                    )}
                </div>
            </div>
        )}
      </Modal>
    </div>
  );
};
