
import React, { useState } from 'react';
import { MessageCircle, Mail, ChevronDown, ChevronUp, Package, Hash } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { PurchaseOrder, OrderItem, Provider } from '@/types';
import { capitalizeFirst } from '../../utils/text';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderToResend?: PurchaseOrder | null;
  tempOrderData?: { providerId: string, items: OrderItem[] } | null;
  provider?: Provider | null;
  onSendWhatsApp: (notes: string) => void;
  onSendEmail: (notes: string) => void;
  onSendAutomatedEmail?: (notes: string) => void;
  hasPhone?: boolean;
  hasEmail?: boolean;
  isLoading?: boolean;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ 
    isOpen, 
    onClose, 
    orderToResend,
    tempOrderData,
    provider,
    onSendWhatsApp,
    onSendEmail,
    onSendAutomatedEmail,
    hasPhone = true,
    hasEmail = true,
    isLoading = false
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setNotes('');
      setShowPreview(false);
    }
  }, [isOpen]);

  const displayId = orderToResend?.sharepointId || orderToResend?.id;
  
  const items = orderToResend?.items || tempOrderData?.items || [];
  const providerName = orderToResend?.providerName || provider?.name || tempOrderData?.providerId || 'Proveedor';

  return (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={orderToResend ? "Reenviar solicitud" : "Notificar compra"}
        description={orderToResend ? `¿Por donde desea reenviar la OC #${displayId}?` : "¿Por donde desea notificar la orden de compra al proveedor?"}
        maxWidth="lg"
        loading={isLoading}
        loadingText="Enviando notificación…"
        footer={
           <Button variant="outline" onClick={onClose} className="w-full" disabled={isLoading}>Cancelar</Button>
        }
      >
        <div className="mb-4">
          <label className="block text-sm font-semibold text-foreground mb-1">
            Aclaraciones (Opcional)
          </label>
          <textarea
            className="w-full border border-border rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition-all"
            rows={2}
            placeholder="Escriba aquí alguna nota o aclaración para el proveedor..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 pb-4">
           <button 
             onClick={() => onSendWhatsApp(notes)}
             disabled={!hasPhone || isLoading}
             className={`flex flex-col items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all group shadow-sm ${
               hasPhone && !isLoading 
                 ? 'border-border hover:border-emerald-500 hover:bg-emerald-50 hover:shadow-md cursor-pointer' 
                 : 'border-border bg-muted opacity-50 cursor-not-allowed'
             }`}
           >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform shadow-inner ${
                hasPhone && !isLoading ? 'bg-emerald-100 group-hover:scale-110' : 'bg-muted'
              }`}>
                 <MessageCircle className={`w-6 h-6 ${hasPhone ? 'text-emerald-600' : 'text-muted-foreground'}`} />
              </div>
              <div className="text-center">
                 <span className="block font-bold text-foreground text-sm">WhatsApp</span>
                 <span className="text-[10px] text-muted-foreground mt-1 font-medium">
                   {hasPhone ? 'Abrir Web WhatsApp' : 'Sin teléfono'}
                 </span>
              </div>
           </button>

           <button 
             onClick={() => onSendAutomatedEmail?.(notes)}
             disabled={!hasEmail || isLoading}
             className={`flex flex-col items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all group shadow-sm relative overflow-hidden ${
               hasEmail && !isLoading 
                 ? 'border-border hover:border-brand hover:bg-brand/10 hover:shadow-md cursor-pointer' 
                 : 'border-border bg-muted opacity-50 cursor-not-allowed'
             }`}
           >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform shadow-inner ${
                hasEmail && !isLoading ? 'bg-brand/10 group-hover:scale-110' : 'bg-muted'
              }`}>
                 <Mail className={`w-6 h-6 ${hasEmail ? 'text-brand' : 'text-muted-foreground'}`} />
              </div>
              <div className="text-center">
                 <span className="block font-bold text-foreground text-sm">Email Automático</span>
                 <span className="text-[10px] text-muted-foreground mt-1 font-medium">
                   {hasEmail ? 'Envío directo' : 'Sin email'}
                 </span>
              </div>
           </button>
        </div>

        {/* PREVIEW SECTION */}
        <div className="mt-2 border border-border rounded-md overflow-hidden bg-muted">
           <button 
             onClick={() => setShowPreview(!showPreview)}
             className="w-full flex items-center justify-between p-3 bg-card hover:bg-accent transition-colors"
           >
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                 <Package className="w-4 h-4 text-muted-foreground" />
                 Previsualizar Orden de Compra
              </div>
              {showPreview ? (
                 <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                 <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
           </button>
           
           {showPreview && (
              <div className="p-4 border-t border-border text-sm">
                 <div className="mb-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Proveedor</p>
                    <p className="font-medium text-foreground">{capitalizeFirst(providerName)}</p>
                 </div>
                 
                 <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Artículos ({items.length})</p>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
                       {items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-card p-2 border border-border rounded-lg shadow-sm">
                             <div className="flex flex-col">
                                <span className="font-medium text-foreground line-clamp-1">{(item as any).description || (item as any).name || (item as any).articleName || item.sku}</span>
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                   <Hash className="w-3 h-3" />
                                   <span>{item.sku}</span>
                                </div>
                             </div>
                             <div className="bg-muted px-2 py-1 rounded text-xs font-bold text-foreground">
                                {item.quantity} un.
                             </div>
                          </div>
                       ))}
                       {items.length === 0 && (
                          <p className="text-muted-foreground text-xs italic">No hay artículos en esta orden.</p>
                       )}
                    </div>
                 </div>
              </div>
           )}
        </div>
      </Modal>
  );
};
