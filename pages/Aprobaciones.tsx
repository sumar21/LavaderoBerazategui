
import React, { useState } from 'react';
import { Eye, Check, X, AlertCircle, Trash2, Save, ArrowLeft, Clock, RefreshCcw, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { PurchaseOrder, OrderStatus, OrderItem } from '@/types';
import { purchaseService } from '../services/purchaseService';

interface AprobacionesProps {
  orders: PurchaseOrder[];
  setOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};

export const Aprobaciones: React.FC<AprobacionesProps> = ({ orders, setOrders, onRefresh, isRefreshing }) => {
  // Filter only pending approval
  const pendingOrders = orders.filter(o => {
    const s = o.status ? o.status.toUpperCase() : '';
    return s === 'PENDIENTE' || s.includes('PENDIENTE APROBACION') || s.includes('PENDIENTE_APROBACION') || s.includes('PENDIENTE APROBACIÓN');
  });

  // Logic for Approval/Rejection/Edit
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Edit State (Draft)
  const [editOrderDraft, setEditOrderDraft] = useState<PurchaseOrder | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

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

      const userDataStr = localStorage.getItem('user_data');
      let usuarioApp = 'USR';
      if (userDataStr) {
        try {
          const userData = JSON.parse(userDataStr);
          usuarioApp = userData.usuarioApp || userData.username || userData.email || 'USR';
        } catch (e) {}
      }
      
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
    <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-500 bg-slate-50/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-8 py-4 sm:py-6 sticky top-0 z-10 bg-slate-50/80 backdrop-blur-md border-b border-slate-200/60 shrink-0">
        <div className="flex flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Aprobaciones</h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5 sm:mt-1">Gestión de autorizaciones</p>
          </div>
          <div className="flex gap-2 items-center">
             <Button
               variant="outline"
               size="icon"
               onClick={onRefresh}
               disabled={isRefreshing}
               className="rounded-xl bg-white text-slate-700 border-slate-200 shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-colors h-9 w-9 sm:h-10 sm:w-10"
               title="Actualizar datos"
             >
               <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
             </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 sm:px-8 py-4 sm:py-8 custom-scrollbar">
        {pendingOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] sm:min-h-[400px] animate-in fade-in zoom-in-95 duration-500">
             <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-4 sm:mb-6 shadow-sm ring-1 ring-green-100">
                 <Check className="w-8 h-8 sm:w-10 sm:h-10 text-green-500" />
             </div>
             <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Todo al día</h3>
             <p className="text-slate-500 mt-2 text-center max-w-xs text-sm sm:text-base">No hay solicitudes pendientes de aprobación en este momento.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-2xl shadow-xl shadow-slate-200/60 ring-1 ring-slate-900/5 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Orden</th>
                    <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Detalles</th>
                    <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Solicitante</th>
                    <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Monto Total</th>
                    <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Decisión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pendingOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-blue-50/30 transition-all duration-200 group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                            <span className="font-mono text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded w-fit text-xs">#{order.sharepointId || order.id}</span>
                            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                                <Clock className="w-3 h-3" />
                                <span>{order.date}</span>
                            </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900 block">{order.providerName}</span>
                        <span className="text-xs text-slate-500">{order.items.length} ítems esperando revisión</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                {order.requester ? order.requester.substring(0, 2).toUpperCase() : 'US'}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-900">{order.requester || 'Usuario'}</span>
                                <span className="text-[10px] text-slate-400 uppercase">{order.requesterProfile || 'COMPRAS'}</span>
                            </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-lg font-bold text-slate-900">
                            {formatCurrency(calculateTotal(order.items))}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => handleAction('APPROVE', order.id)}
                                title="Aprobar"
                                disabled={isProcessingAction}
                                className="p-2 text-green-600 bg-white hover:bg-green-500 hover:text-white border border-green-200 hover:border-green-500 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                                className="p-2 text-red-600 bg-white hover:bg-red-500 hover:text-white border border-red-200 hover:border-red-500 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <div className="h-6 w-px bg-slate-200 mx-1"></div>
                            <button 
                                onClick={() => handleOpenDetail(order)}
                                title="Ver detalles y editar"
                                disabled={isProcessingAction}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Mobile Card View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {pendingOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded w-fit text-[10px]">#{order.sharepointId || order.id}</span>
                      <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{order.providerName}</h3>
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                        <Clock className="w-3 h-3" />
                        <span>{order.date}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">{formatCurrency(calculateTotal(order.items))}</p>
                      <p className="text-[10px] text-slate-500">{order.items.length} ítems</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 py-2 border-y border-slate-50">
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                      {order.requester ? order.requester.substring(0, 2).toUpperCase() : 'US'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-900">{order.requester || 'Usuario'}</span>
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider">{order.requesterProfile || 'COMPRAS'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button 
                      variant="outline" 
                      className="flex-1 h-9 text-xs border-green-200 text-green-600 hover:bg-green-50"
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
        footer={
            <>
                <Button variant="outline" disabled={isProcessingAction} onClick={() => {
                    setIsRejectModalOpen(false);
                    setRejectionReason('');
                }}>Cancelar</Button>
                <Button variant="danger" disabled={isProcessingAction} onClick={() => selectedOrder && handleAction('REJECT', selectedOrder.id)}>
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
        <div className="space-y-4 relative">
            {isProcessingAction && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-xl">
                    <Loader2 className="w-8 h-8 text-red-600 animate-spin mb-2" />
                    <span className="text-sm font-medium text-slate-600">Procesando rechazo...</span>
                </div>
            )}
            <div className="flex items-center gap-4 bg-red-50 p-5 rounded-xl border border-red-100 text-red-900">
                <div className="bg-red-100 p-2 rounded-full">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                    <p className="font-bold">Acción Irreversible</p>
                    <p className="text-sm opacity-90 mt-1">¿Está seguro que desea rechazar la Orden de Compra <b>#{selectedOrder?.sharepointId || selectedOrder?.id}</b>?</p>
                </div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Motivo del rechazo (opcional)</label>
                <textarea
                    className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none min-h-[100px]"
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
        title={`Gestionar Aprobación OC #${editOrderDraft?.sharepointId || editOrderDraft?.id}`}
        description="Revise los ítems, ajuste cantidades o elimine productos antes de aprobar."
        maxWidth="3xl"
        footer={
           <div className="flex justify-between w-full">
               <Button variant="outline" disabled={isProcessingAction} onClick={() => setIsDetailModalOpen(false)}>Cancelar</Button>
               <div className="flex gap-2">
                   <Button 
                     variant="danger" 
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
                     className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20"
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
           </div>
        }
      >
        {editOrderDraft && (
            <div className="space-y-5 relative">
                {isProcessingAction && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-xl">
                        <Loader2 className="w-8 h-8 text-green-600 animate-spin mb-2" />
                        <span className="text-sm font-medium text-slate-600">Procesando aprobación...</span>
                    </div>
                )}
                <div className="flex justify-between items-center bg-slate-50/80 p-4 rounded-xl border border-slate-100">
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Proveedor</p>
                        <p className="font-bold text-slate-900 text-lg">{editOrderDraft.providerName}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Actualizado</p>
                        <p className="text-xl font-bold text-green-700">{formatCurrency(calculateTotal(editOrderDraft.items))}</p>
                    </div>
                </div>

                {/* MOBILE VIEW (Cards) */}
                <div className="md:hidden space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {editOrderDraft.items.map((item, idx) => (
                        <div key={item.sku} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <span className="block font-bold text-slate-900">{item.description}</span>
                                    <span className="block text-xs text-slate-400 font-mono mt-0.5">{item.sku}</span>
                                </div>
                                <button 
                                    onClick={() => handleDeleteItem(item.sku)}
                                    className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"
                                    title="Eliminar item"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 p-2 rounded-lg">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Precio</span>
                                    <span className="text-sm font-bold text-slate-700">{item.price ? formatCurrency(item.price) : '-'}</span>
                                </div>
                                <div className="bg-slate-50 p-2 rounded-lg">
                                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Cantidad</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        className="w-full text-center border border-slate-300 rounded-lg px-2 py-1 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none bg-white text-slate-900 font-bold"
                                        value={item.quantity}
                                        onChange={(e) => handleQuantityChange(item.sku, parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Subtotal</span>
                                <span className="text-sm font-bold text-slate-900">{item.price ? formatCurrency(item.price * item.quantity) : '-'}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* DESKTOP VIEW (Table) */}
                <div className="hidden md:block border rounded-xl overflow-hidden border-slate-200 max-h-[350px] overflow-y-auto shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="px-5 py-3 text-left font-semibold text-slate-600">Descripción</th>
                                <th className="px-5 py-3 text-right font-semibold text-slate-600 w-32">Precio</th>
                                <th className="px-5 py-3 text-center font-semibold text-slate-600 w-32">Cant.</th>
                                <th className="px-5 py-3 text-right font-semibold text-slate-600 w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {editOrderDraft.items.map((item, idx) => (
                                <tr key={item.sku} className="bg-white hover:bg-slate-50">
                                    <td className="px-5 py-3">
                                        <span className="block font-medium text-slate-900">{item.description}</span>
                                        <span className="text-xs text-slate-400 font-mono">{item.sku}</span>
                                    </td>
                                    <td className="px-5 py-3 text-right text-slate-600 font-mono">
                                        {item.price ? formatCurrency(item.price) : '-'}
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex justify-center">
                                            <input 
                                                type="number" 
                                                min="1"
                                                className="w-20 text-center border border-slate-300 rounded-lg px-2 py-1 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none bg-white text-slate-900 font-bold appearance-none"
                                                value={item.quantity}
                                                onChange={(e) => handleQuantityChange(item.sku, parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <button 
                                            onClick={() => handleDeleteItem(item.sku)}
                                            className="text-slate-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded"
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
