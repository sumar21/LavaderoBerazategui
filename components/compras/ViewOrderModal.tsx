
import React, { useState, useEffect } from 'react';
import { User, Calendar, FileText, DollarSign, Send, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { StatusBadge } from '../ui/StatusBadge';
import { Modal } from '../ui/Modal';
import { PurchaseOrder, OrderStatus, RecepcionOC, ImagenRecepcion } from '@/types';
import { purchaseService } from '../../services/purchaseService';
import { capitalizeFirst } from '../../utils/text';

interface ViewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder | null;
  onBudgetClick: (order: PurchaseOrder) => void;
  onResendClick: (order: PurchaseOrder) => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};

/**
 * This modal used to own a third palette (purple / orange / success Badge
 * variants), so the same order was one colour in the grid and another here.
 * One state, one colour — golden rule 7.
 */
const getStatusBadge = (status: OrderStatus | string) => <StatusBadge status={String(status ?? '')} />;

export const ViewOrderModal: React.FC<ViewOrderModalProps> = ({ 
    isOpen, 
    onClose, 
    order, 
    onBudgetClick, 
    onResendClick 
}) => {
  const [receptions, setReceptions] = useState<RecepcionOC[]>([]);
  const [receptionImages, setReceptionImages] = useState<ImagenRecepcion[]>([]);
  const [selectedImage, setSelectedImage] = useState<{src: string, label: string} | null>(null);

  useEffect(() => {
    if (isOpen && order) {
      const fetchReceptionData = async () => {
        try {
          const [receptionsData, imagesData] = await Promise.all([
            purchaseService.getRecepcionesOC(order.id),
            purchaseService.getImagenesRecepciones(order.id)
          ]);
          setReceptions(receptionsData);
          setReceptionImages(imagesData);
        } catch (error) {
          console.error("Error fetching reception data:", error);
        }
      };
      fetchReceptionData();
    } else {
      // Clear data when modal is closed
      setReceptions([]);
      setReceptionImages([]);
    }
  }, [isOpen, order]);

  if (!order) return null;

  const parseDate = (dateStr: string, timeStr: string) => {
    if (!dateStr) return 0;
    const [dd, mm, yyyy] = dateStr.split('/');
    const [hh, min] = (timeStr || '00:00').split(':');
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min)).getTime();
  };

  const groupedReceptions = receptions.reduce((acc, reception) => {
    const groupId = reception.IDRecepcionGrupal || reception.idRecepcionGrupal || 'default';
    if (!acc[groupId]) {
      acc[groupId] = {
        details: reception,
        items: [],
        images: receptionImages.filter(img => (img.IdRecepcion || img.idRecepcion || img.IdRecepcion_IR || img.idRecepcion_IR) === groupId)
      };
    }
    acc[groupId].items.push(reception);
    return acc;
  }, {} as Record<string, { details: RecepcionOC; items: RecepcionOC[]; images: ImagenRecepcion[] }>);

  const sortedGroups = (Object.entries(groupedReceptions) as [string, { details: RecepcionOC; items: RecepcionOC[]; images: ImagenRecepcion[] }][])
    .map(([groupId, group]) => {
      const dateStr = group.details.FechaRecepcion || group.details.fechaRecepcion || group.details.Fecha || group.details.fecha;
      const timeStr = group.details.Hora || group.details.hora;
      return {
        groupId,
        ...group,
        timestamp: parseDate(dateStr, timeStr)
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp);

  return (
    <>
      <Modal
          isOpen={isOpen}
        onClose={onClose}
        title={`Detalle de Orden #${order.sharepointId || order.id}`}
        description="Información completa de la solicitud de compra."
        maxWidth="3xl"
        footer={
           <Button onClick={onClose} variant="outline">Cerrar</Button>
        }
      >
         <div className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-2 gap-4 p-5 bg-muted/80 rounded-md border border-border shadow-sm">
               <div className="space-y-1.5">
                  <span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1.5 tracking-wider">
                     <User className="w-3.5 h-3.5" /> Proveedor
                  </span>
                  <p className="font-semibold text-foreground text-lg">{capitalizeFirst(order.providerName)}</p>
               </div>
               <div className="space-y-1.5">
                  <span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1.5 tracking-wider">
                     <Calendar className="w-3.5 h-3.5" /> Fecha
                  </span>
                  <p className="font-medium text-foreground">{order.date}</p>
               </div>
               <div className="space-y-2 col-span-2 pt-4 border-t border-border/60 mt-2">
                  <span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1.5 tracking-wider mb-2">
                     <FileText className="w-3.5 h-3.5" /> Estado actual
                  </span>
                  {getStatusBadge(order.status)}
               </div>
               {order.observaciones && (
                 <div className="col-span-2 pt-4 border-t border-border/60 mt-2">
                    <span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1.5 tracking-wider mb-2">
                       <FileText className="w-3.5 h-3.5" /> Observaciones {order.status === 'Rechazada' ? '(Motivo de Rechazo)' : ''}
                    </span>
                    <p className={`text-sm p-3 rounded-lg border ${order.status === 'Rechazada' ? 'bg-red-50 text-red-800 border-red-100' : 'bg-muted text-foreground border-border'}`}>
                        {order.observaciones}
                    </p>
                 </div>
               )}
            </div>

            {/* Items Table */}
            <div>
               <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                   Artículos Solicitados
                   <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs font-medium">{order.items.length} items</span>
               </h4>
               
               {/* MOBILE VIEW (Cards) */}
               <div className="md:hidden space-y-3">
                  {order.items.map((item, idx) => (
                     <div key={idx} className="bg-card border border-border rounded-md p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                           <div>
                              <span className="block font-bold text-foreground">{capitalizeFirst(item.description)}</span>
                              <span className="block text-xs text-muted-foreground mt-0.5">{item.sku}</span>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                           <div className="bg-muted p-2 rounded-lg">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Solicitado</span>
                              <span className="text-sm font-bold text-foreground">{item.quantity}</span>
                           </div>
                           <div className="bg-muted p-2 rounded-lg">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Recibido</span>
                              <span className="text-sm font-bold text-foreground">{item.receivedQuantity || 0}</span>
                           </div>
                           {order.status !== 'Presupuesto' && (
                              <>
                                 <div className="bg-muted p-2 rounded-lg">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Precio Unit.</span>
                                    <span className="text-sm font-bold text-foreground">{item.price ? formatCurrency(item.price) : '-'}</span>
                                 </div>
                                 <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                                    <span className="text-[10px] uppercase font-bold text-emerald-400 block">Subtotal</span>
                                    <span className="text-sm font-bold text-emerald-700">{item.price ? formatCurrency(item.price * item.quantity) : '-'}</span>
                                 </div>
                              </>
                           )}
                        </div>
                     </div>
                  ))}
                  {order.status !== 'Presupuesto' && (
                     <div className="bg-emerald-600 rounded-md p-4 text-white dark:text-emerald-950 shadow-md">
                        <div className="flex justify-between items-center">
                           <span className="text-xs uppercase font-bold opacity-80 tracking-wider">Total General</span>
                           <span className="text-xl font-bold">
                              {formatCurrency(order.items.reduce((acc, i) => acc + ((i.price || 0) * i.quantity), 0))}
                           </span>
                        </div>
                     </div>
                  )}
               </div>

               {/* DESKTOP VIEW (Table) */}
               <div className="hidden md:block border border-border rounded-md overflow-hidden shadow-sm">
                  <table className="w-full text-[13px]">
                     <thead className="sticky top-0 z-20 bg-muted border-b border-border">
                        <tr>
                           <th className="px-5 py-3 text-left text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Descripción</th>
                           <th className="px-5 py-3 text-right text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Cant.</th>
                           <th className="px-5 py-3 text-right text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Recibido</th>
                           {order.status !== 'Presupuesto' && (
                               <>
                                <th className="px-5 py-3 text-right whitespace-nowrap text-sm align-middle font-medium text-muted-foreground">Precio Unit.</th>
                                <th className="px-5 py-3 text-right whitespace-nowrap text-sm align-middle font-medium text-muted-foreground">Subtotal</th>
                               </>
                           )}
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-border [&_tr]:transition-colors [&_tr:hover]:bg-muted/40">
                        {order.items.map((item, idx) => (
                           <tr key={idx} className="bg-card hover:bg-accent/50 transition-colors">
                              <td className="h-16 px-4 py-3">
                                 <span className="block font-medium text-foreground">{capitalizeFirst(item.description)}</span>
                                 <span className="block text-xs text-muted-foreground mt-0.5">{item.sku}</span>
                              </td>
                              <td className="h-16 px-4 py-3 text-right font-bold text-foreground">
                                 {item.quantity}
                              </td>
                              <td className="h-16 px-4 py-3 text-right text-muted-foreground">
                                 {item.receivedQuantity || 0}
                              </td>
                              {order.status !== 'Presupuesto' && (
                                <>
                                    <td className="h-16 px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                                        {item.price ? formatCurrency(item.price) : '-'}
                                    </td>
                                    <td className="h-16 px-4 py-3 text-right font-medium text-foreground whitespace-nowrap">
                                        {item.price ? formatCurrency(item.price * item.quantity) : '-'}
                                    </td>
                                </>
                              )}
                           </tr>
                        ))}
                     </tbody>
                     <tfoot className="bg-muted/80 border-t border-border">
                        <tr>
                           <td className="h-16 px-4 py-3 font-bold text-foreground uppercase text-[11px] tracking-wider">Totales</td>
                           <td className="h-16 px-4 py-3 text-right font-bold text-foreground">
                              {order.items.reduce((acc, i) => acc + i.quantity, 0)}
                           </td>
                           <td className="h-16 px-4 py-3 text-right font-bold text-muted-foreground">
                              {order.items.reduce((acc, i) => acc + (i.receivedQuantity || 0), 0)}
                           </td>
                           {order.status !== 'Presupuesto' && (
                               <td colSpan={2} className="px-5 py-3 text-right font-bold text-emerald-700 whitespace-nowrap text-lg">
                                  {formatCurrency(order.items.reduce((acc, i) => acc + ((i.price || 0) * i.quantity), 0))}
                               </td>
                           )}
                        </tr>
                     </tfoot>
                  </table>
               </div>
            </div>
            
            {/* Receptions Section */}
            {sortedGroups.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-foreground mb-3 mt-6 flex items-center gap-2">
                  Recepciones Registradas
                </h4>
                <div className="space-y-4">
                  {sortedGroups.map((group, groupIndex) => (
                    <div key={group.groupId} className="border border-border rounded-md p-4 shadow-sm bg-card">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-3 pb-3 border-b border-border gap-2">
                        <div>
                          <p className="font-semibold text-foreground text-base">Recepción #{groupIndex + 1}</p>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <p><span className="font-semibold">Fecha:</span> {group.details.FechaRecepcion || group.details.fechaRecepcion || group.details.Fecha || group.details.fecha}</p>
                          <p><span className="font-semibold">Remito:</span> {group.details.NroRemito || group.details.nroRemito || '-'}</p>
                          <p><span className="font-semibold">Lote:</span> {group.details.Lote || group.details.lote || '-'}</p>
                        </div>
                      </div>
                      
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Artículos en esta entrega:</p>
                      <div className="divide-y divide-border mb-3">
                         {group.items.map((item, index) => (
                           <div key={index} className="py-2 flex justify-between items-center">
                             <div>
                               <span className="font-medium text-foreground text-xs">{item.DetalleArticulo || item.detalleArticulo || item.Articulo || item.articulo}</span>
                               <span className="block text-[10px] text-muted-foreground">{item.SKU || item.sku}</span>
                             </div>
                             <div className="text-right">
                               <span className="font-bold text-foreground text-sm">{item.CantidadRecepcion || item.cantidadRecepcion}</span>
                               <span className="text-[10px] text-muted-foreground ml-1">un.</span>
                             </div>
                           </div>
                         ))}
                      </div>

                      {group.images.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-border">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Imágenes Adjuntas:</p>
                          <div className="flex gap-4 flex-wrap">
                            {group.images.map((image, index) => {
                              const imgData = image.Imagen || image.imagen || image.Imagen_IR || image.imagen_IR;
                              const imgType = image.Tipo || image.tipo || image.Tipo_IR || image.tipo_IR;
                              const imgSrc = imgData?.startsWith('data:image') ? imgData : `data:image/jpeg;base64,${imgData}`;
                              
                              const detailId = image.IdDetalleCompra || image.idDetalleCompra || image.IdDetalleCompra_IR || image.idDetalleCompra_IR;
                              let label = imgType === 'Remito' ? 'Remito' : 'Recepción';
                              
                              if (imgType !== 'Remito' && detailId && detailId !== '-') {
                                const relatedItem = group.items.find(i => String(i.id) === String(detailId) || String(i.ID) === String(detailId) || String(i.IdDetalleCompra) === String(detailId));
                                if (relatedItem) {
                                  label = `Art: ${relatedItem.DetalleArticulo || relatedItem.detalleArticulo || relatedItem.Articulo || relatedItem.articulo}`;
                                } else {
                                  const orderItem = order.items.find(i => String(i.id) === String(detailId) || String(i.sharepointId) === String(detailId));
                                  if (orderItem) label = `Art: ${orderItem.description}`;
                                }
                              }

                              return (
                                <div key={index} className="flex flex-col items-center gap-1">
                                  <button 
                                    onClick={() => setSelectedImage({ src: imgSrc, label })}
                                    className="focus:outline-none"
                                    title={`Ver imagen: ${label}`}
                                  >
                                    <img 
                                      src={imgSrc}
                                      alt={`${label} - ${index + 1}`}
                                      className="w-24 h-24 object-cover rounded-lg border-2 border-border hover:border-brand transition-all shadow-sm cursor-pointer"
                                    />
                                  </button>
                                  <span className="text-[10px] font-medium text-muted-foreground max-w-[96px] text-center truncate" title={label}>
                                    {label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions inside detail view if needed */}
            {order.status === 'Presupuesto' && (
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                     <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => {
                            onClose();
                            onBudgetClick(order);
                        }}
                    >
                        <DollarSign className="w-3.5 h-3.5 mr-2" />
                        Cargar Presupuesto
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                            onClose();
                            onResendClick(order);
                        }}
                    >
                        <Send className="w-3.5 h-3.5 mr-2" />
                        Reenviar solicitud
                    </Button>
                </div>
            )}
         </div>
      </Modal>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-5xl w-full max-h-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <div className="w-full flex justify-between items-center mb-4">
              <h3 className="text-white font-medium text-lg">{selectedImage.label}</h3>
              <button 
                onClick={() => setSelectedImage(null)}
                className="p-2 bg-card/10 hover:bg-card/20 rounded-full text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <img 
              src={selectedImage.src} 
              alt={selectedImage.label} 
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
};
