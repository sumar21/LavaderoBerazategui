
import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Combobox } from '../ui/Combobox';
import { OrderItem, Provider, Article } from '@/types';
import { QuickAddArticleModal } from './QuickAddArticleModal';
import { notify } from '../ui/Notice';
import { capitalizeFirst } from '../../utils/text';

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
      <div className="space-y-6">
        <div className="space-y-1 relative">
           <div className="flex items-center justify-between">
               <label className="text-sm font-medium text-foreground">Proveedor</label>
               {items.length > 0 && (
                   <span className="text-[10px] text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                       Bloqueado (elimine los artículos para cambiar)
                   </span>
               )}
           </div>
           <Combobox 
             options={providerOptions}
             value={providerId}
             onChange={setProviderId}
             placeholder="Seleccionar proveedor..."
             disabled={items.length > 0}
           />
        </div>

        <div className="bg-muted/80 p-5 rounded-md border border-border space-y-4 shadow-sm">
           <h4 className="text-sm font-semibold text-foreground flex items-center justify-between">
              <span>Agregar Artículos</span>
              <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                        if (!providerId) {
                            notify.warning("Por favor, seleccione un proveedor primero.");
                            return;
                        }
                        setIsQuickAddOpen(true);
                    }}
                    className={`text-xs font-medium underline flex items-center gap-1 ${
                        providerId ? 'text-emerald-600 hover:text-emerald-700' : 'text-muted-foreground cursor-not-allowed no-underline'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    Nuevo Artículo
                  </button>
              </div>
           </h4>
           <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="w-full sm:flex-1 min-w-0">
                <Combobox 
                  options={productOptions}
                  value={tempArticleId}
                  onChange={setTempArticleId}
                  placeholder={providerId ? "Buscar artículo del proveedor..." : "Seleccione un proveedor primero"}
                  disabled={!providerId}
                />
              </div>
              <div className="flex gap-3 w-full sm:w-auto shrink-0">
                <div className="flex-1 sm:w-24">
                  <Input 
                    type="number" 
                    placeholder="Cant." 
                    min="1"
                    className="h-[42px]" 
                    value={tempQty || ''}
                    onChange={(e) => setTempQty(Number(e.target.value))}
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
                    className="h-[42px] px-4 w-full sm:w-auto" 
                    variant="secondary" 
                    onClick={handleAddItem}
                    disabled={!tempArticleId || tempQty <= 0}
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
                  <div key={item.id + '-' + idx} className="flex justify-between items-center bg-card p-3 rounded-lg border border-border text-sm shadow-sm hover:border-brand/20 transition-colors">
                     <div className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-foreground">{capitalizeFirst(item.description)}</span>
                        <span className="block truncate text-xs text-muted-foreground">{item.sku}</span>
                     </div>
                     <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min="1"
                          aria-label={`Cantidad de ${item.description}`}
                          className="h-9 w-20 text-right"
                          value={item.quantity || ''}
                          onChange={(e) => handleItemQtyChange(item.id, Number(e.target.value))}
                        />
                        <span className="text-xs text-muted-foreground">un.</span>
                        <button onClick={() => handleRemoveItem(item.id)} className="text-muted-foreground hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded" title="Quitar">
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
