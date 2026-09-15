
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ShoppingCart, Building2, Box, Search, CirclePlus, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input, FIELD_LABEL } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Combobox } from '../ui/Combobox';
import { OrderItem, Provider, Article } from '@/types';
import { QuickAddArticleModal } from './QuickAddArticleModal';
import { notify } from '../ui/Notice';
import { capitalizeFirst } from '../../utils/text';
import { MAX_QUANTITY, toCount } from '../../utils/number';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (providerId: string, items: OrderItem[]) => void;
  providers: Provider[];
  articles: Article[];
  isLoading?: boolean;
  onArticleCreated?: (newArticle: Article) => void;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave,
  providers,
  articles,
  isLoading = false,
  onArticleCreated
}) => {
  const [providerId, setProviderId] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  
  // Temp item state
  const [tempArticleId, setTempArticleId] = useState('');
  const [tempQty, setTempQty] = useState(0);

  // Reset tempArticleId when provider changes
  useEffect(() => {
    setTempArticleId('');
  }, [providerId]);

  // Reset internal state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setProviderId('');
      setItems([]);
      setTempArticleId('');
      setTempQty(0);
    }
  }, [isOpen]);

  // Only active providers
  const activeProviders = providers.filter(p => p.status === 'Activo' || p.status === 'ALTA' || !p.status);
  const providerOptions = Array.from(
    new Map(activeProviders.map(p => [p.id, { value: p.id, label: p.name }])).values()
  );
  
  // Only active articles, filtered by selected provider
  const activeArticles = articles.filter(a => {
    if (a.status === 'Inactivo' || a.status === 'BAJA') return false;
    if (providerId) {
      const cleanProviderId = String(providerId).trim();
      return a.providerIds.some(id => String(id).trim() === cleanProviderId);
    }
    return true;
  });
  
  const productOptions = Array.from(
    new Map(
      activeArticles.map(p => [
        String(p.id),
        { value: String(p.id), label: p.name, description: p.code }
      ])
    ).values()
  );

  const handleAddItem = () => {
    if (!tempArticleId || tempQty <= 0) return;
    const product = activeArticles.find(p => String(p.id) === tempArticleId);
    if (!product) return;

    const existingIndex = items.findIndex(i => String(i.id) === String(product.id));
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += tempQty;
      setItems(updated);
    } else {
      const newItem: OrderItem = {
        id: product.id,
        sku: product.code,
        description: product.name,
        quantity: tempQty,
        receivedQuantity: 0
      };
      setItems([...items, newItem]);
    }
    setTempArticleId('');
    setTempQty(0);
  };

  const handleRemoveItem = (id: string | number) => {
    setItems(items.filter(i => String(i.id) !== String(id)));
  };

  const handleItemQtyChange = (id: string | number, quantity: number) => {
    setItems(items.map(i => (String(i.id) === String(id) ? { ...i, quantity } : i)));
  };

  const handleSubmit = () => {
    onSave(providerId, items);
    // Reset internal state
    setProviderId('');
    setItems([]);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generar nueva OC"
      description="Complete los datos para crear una solicitud de compra."
      icon={ShoppingCart}
      maxWidth="2xl"
      loading={isLoading}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!providerId || items.length === 0 || items.some(i => i.quantity < 1) || isLoading}>
            Guardar y Notificar
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="relative">
           <div className="flex items-center justify-between gap-2">
               <label className={FIELD_LABEL}>Proveedor</label>
               {items.length > 0 && (
                   <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                       <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                       Bloqueado (elimine los artículos para cambiar)
                   </span>
               )}
           </div>
           <Combobox
             icon={Building2}
             options={providerOptions}
             value={providerId}
             onChange={setProviderId}
             placeholder="Seleccionar proveedor..."
             disabled={items.length > 0}
           />
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-muted/50 p-4 sm:p-5">
           <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand" aria-hidden="true">
                      <Box className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-foreground sm:text-base">Agregar Artículos</h4>
                      <p className="text-xs text-muted-foreground">Busque y agregue artículos del proveedor a la orden de compra.</p>
                  </div>
              </div>
              <button
                type="button"
                onClick={() => {
                    if (!providerId) {
                        notify.warning("Por favor, seleccione un proveedor primero.");
                        return;
                    }
                    setIsQuickAddOpen(true);
                }}
                className={`flex shrink-0 items-center gap-1.5 text-sm font-medium ${
                    providerId ? 'text-brand hover:underline' : 'text-muted-foreground cursor-not-allowed'
                }`}
              >
                <CirclePlus className="h-4 w-4" aria-hidden="true" />
                Nuevo Artículo
              </button>
           </div>
           <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="w-full sm:flex-1 min-w-0">
                <Combobox
                  icon={Search}
                  options={productOptions}
                  value={tempArticleId}
                  onChange={setTempArticleId}
                  placeholder={providerId ? "Buscar artículo del proveedor..." : "Seleccione un proveedor primero"}
                  disabled={!providerId}
                />
              </div>
              <div className="flex gap-3 w-full sm:w-auto shrink-0">
                <div className="flex-1 sm:w-28">
                  <Input
                    type="number"
                    placeholder="Cant."
                    min="1"
                    max={MAX_QUANTITY}
                    className="md:h-10"
                    value={tempQty || ''}
                    onChange={(e) => setTempQty(toCount(e.target.value))}
                    disabled={!tempArticleId}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddItem();
                      }
                    }}
                  />
                </div>
                <div className="shrink-0">
                  <Button
                    className="h-11 md:h-10 w-12 px-0 bg-brand/10 text-brand hover:bg-brand/15"
                    variant="secondary"
                    onClick={handleAddItem}
                    disabled={!tempArticleId || tempQty <= 0}
                    aria-label="Agregar artículo"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </div>
           </div>

           {providerId && productOptions.length === 0 && (
             <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex flex-col gap-2">
               <p className="text-xs text-amber-700 font-medium italic">
                 No se encontraron artículos vinculados a este proveedor.
               </p>
             </div>
           )}

           <div className="mt-4 max-h-[50vh] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground border-2 border-dashed border-border rounded-lg bg-card/50">
                    <span className="text-xs italic text-center px-4">
                      {providerId ? "Busca un artículo y presiona Enter o (+) para agregarlo a la orden." : "Selecciona un proveedor para comenzar."}
                    </span>
                </div>
              ) : (
                items.map((item, idx) => (
                  <div key={item.id + '-' + idx} className="flex justify-between items-center gap-3 bg-card px-4 py-3 rounded-lg border border-border text-sm shadow-sm hover:border-brand/20 transition-colors">
                     <div className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-foreground">{capitalizeFirst(item.description)}</span>
                        <span className="block truncate text-xs text-muted-foreground">{item.sku}</span>
                     </div>
                     <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min="1"
                          max={MAX_QUANTITY}
                          aria-label={`Cantidad de ${item.description}`}
                          className="h-10 md:h-10 w-20 text-center font-medium"
                          value={item.quantity || ''}
                          onChange={(e) => handleItemQtyChange(item.id, toCount(e.target.value))}
                        />
                        <span className="text-xs text-muted-foreground">un.</span>
                        <button onClick={() => handleRemoveItem(item.id)} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600" title="Quitar" aria-label={`Quitar ${item.description}`}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>
      </div>
      
      {isQuickAddOpen && (
        <QuickAddArticleModal
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          providers={providers}
          articles={articles}
          defaultProviderId={providerId}
          onArticleCreated={(newArticle) => {
            if (onArticleCreated) {
              onArticleCreated(newArticle);
            }
            // Optional: Automatically select the new article
            setTempArticleId(String(newArticle.id));
          }}
        />
      )}
    </Modal>
  );
};
