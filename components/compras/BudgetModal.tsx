
import React, { useState, useEffect } from 'react';
import { DollarSign, Loader2, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { PurchaseOrder } from '@/types';
import { capitalizeFirst } from '../../utils/text';
import { MAX_UNIT_PRICE, toCount, toPrice } from '../../utils/number';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder | null;
  onSave: (orderId: string, prices: {[sku: string]: number}, quantities: {[sku: string]: number}, itemsToRemove: string[]) => void;
  isLoading?: boolean;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};

export const BudgetModal: React.FC<BudgetModalProps> = ({ isOpen, onClose, order, onSave, isLoading = false }) => {
  const [budgetPrices, setBudgetPrices] = useState<{[sku: string]: number}>({});
  const [budgetQuantities, setBudgetQuantities] = useState<{[sku: string]: number}>({});
  const [itemsToRemove, setItemsToRemove] = useState<string[]>([]);

  useEffect(() => {
    if (order && isOpen) {
        const initialPrices: {[sku: string]: number} = {};
        const initialQuantities: {[sku: string]: number} = {};
        order.items.forEach(item => {
            initialPrices[item.sku] = item.price || 0;
            initialQuantities[item.sku] = item.quantity || 0;
        });
        setBudgetPrices(initialPrices);
        setBudgetQuantities(initialQuantities);
        setItemsToRemove([]);
    }
  }, [order, isOpen]);

  const handlePriceChange = (sku: string, price: number) => {
    setBudgetPrices(prev => ({ ...prev, [sku]: price }));
  };

  const handleQuantityChange = (sku: string, qty: number) => {
    setBudgetQuantities(prev => ({ ...prev, [sku]: qty }));
  };

  const handleRemoveItem = (sku: string) => {
    setItemsToRemove(prev => [...prev, sku]);
  };

  const handleSave = () => {
    if (order) {
        onSave(order.id, budgetPrices, budgetQuantities, itemsToRemove);
    }
  };

  if (!order) return null;

  const activeItems = order.items.filter(item => !itemsToRemove.includes(item.sku));

  const totalEstimated = activeItems.reduce((acc, item) => {
    const price = budgetPrices[item.sku] || 0;
    const qty = budgetQuantities[item.sku] || 0;
    return acc + (qty * price);
  }, 0);

  return (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Cargar Presupuesto"
        description={`Ingrese los precios y cantidades finales para la OC #${order.sharepointId || order.id}. La orden pasará a estado de aprobación.`}
        maxWidth="3xl"
        loading={isLoading}
        loadingText="Guardando presupuesto…"
        footer={
           <>
              <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
              <Button onClick={handleSave} variant="default" disabled={totalEstimated <= 0 || isLoading}>
                  {isLoading ? (
                      <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Guardando...
                      </>
                  ) : (
                      'Guardar y Enviar a Aprobación'
                  )}
              </Button>
           </>
        }
      >
        <div className="space-y-5">
           <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-md flex items-start gap-3">
              <div className="p-2 bg-emerald-100 rounded-full">
                  <DollarSign className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="text-sm text-emerald-900 mt-1">
                 <p className="font-semibold">Instrucciones</p>
                 <p className="opacity-80">Puede ajustar las cantidades y precios unitarios. El sistema actualizará los totales de la orden automáticamente.</p>
              </div>
           </div>

           {/* MOBILE VIEW (Cards) */}
           <div className="md:hidden space-y-3">
              {activeItems.map((item, idx) => {
                  const price = budgetPrices[item.sku] || 0;
                  const qty = budgetQuantities[item.sku] || 0;
                  const subtotal = price * qty;
                  return (
                     <div key={idx} className="bg-card border border-border rounded-md p-4 shadow-sm relative">
                        <button 
                           onClick={() => handleRemoveItem(item.sku)}
                           className="absolute top-3 right-3 text-muted-foreground hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                           title="Eliminar artículo"
                        >
                           <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="mb-3 pr-8">
                           <span className="block font-bold text-foreground">{capitalizeFirst(item.description)}</span>
                           <span className="block text-xs text-muted-foreground mt-0.5">{item.sku}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                           <div>
                              <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Cantidad</label>
                              <input 
                                 type="number"
                                 min="0"
                                 className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none bg-card text-foreground shadow-sm"
                                 value={qty || ''}
                                 placeholder="0"
                                 onChange={(e) => handleQuantityChange(item.sku, toCount(e.target.value))}
                              />
                           </div>
                           <div>
                              <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Precio Unit.</label>
                              <div className="relative">
                                 <span className="absolute left-3 top-2.5 text-muted-foreground text-xs">$</span>
                                 <input 
                                    type="number"
                                    min="0"
                                    max={MAX_UNIT_PRICE}
                                    className="w-full pl-6 pr-3 py-2 border border-border rounded-lg text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none bg-card text-foreground shadow-sm"
                                    value={price || ''}
                                    placeholder="0.00"
                                    onChange={(e) => handlePriceChange(item.sku, toPrice(e.target.value))}
                                 />
                              </div>
                           </div>
                        </div>
                        <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100 flex justify-between items-center gap-2">
                           <span className="shrink-0 text-[10px] uppercase font-bold text-emerald-600">Subtotal</span>
                           <span className="min-w-0 truncate text-sm font-bold text-emerald-700" title={formatCurrency(subtotal)}>{formatCurrency(subtotal)}</span>
                        </div>
                     </div>
                  );
              })}
              <div className="bg-emerald-600 rounded-md p-4 text-white dark:text-emerald-950 shadow-md">
                 <div className="flex justify-between items-center gap-2">
                    <span className="shrink-0 text-xs uppercase font-bold opacity-80 tracking-wider">Total Estimado</span>
                    <span className="min-w-0 truncate text-xl font-bold" title={formatCurrency(totalEstimated)}>{formatCurrency(totalEstimated)}</span>
                 </div>
              </div>
           </div>

           {/* DESKTOP VIEW (Table) */}
           <div className="hidden md:block border rounded-md overflow-hidden border-border shadow-sm">
              {/* table-fixed: without it the w-* below are only hints, so a long
                  subtotal widened its own column and shoved every other one left
                  as you typed. Fixed layout makes the widths binding — the article
                  column absorbs the remainder and nothing moves while editing. */}
              <table className="w-full table-fixed min-w-[720px] text-[13px]">
                 <thead className="sticky top-0 z-20 bg-muted border-b border-border">
                    <tr>
                       <th className="px-4 py-3 text-left text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Artículo</th>
                       <th className="px-4 py-3 text-right w-28 text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Cant.</th>
                       <th className="px-4 py-3 text-right w-36 text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Precio Unit.</th>
                       <th className="px-4 py-3 text-right w-44 text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Subtotal</th>
                       <th className="px-2 py-3 w-10 text-sm align-middle font-medium text-muted-foreground whitespace-nowrap"></th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-border [&_tr]:transition-colors [&_tr:hover]:bg-muted/40">
                    {activeItems.map((item, idx) => {
                        const price = budgetPrices[item.sku] || 0;
                        const qty = budgetQuantities[item.sku] || 0;
                        const subtotal = price * qty;
                        return (
                           <tr key={idx} className="bg-card hover:bg-accent/50 transition-colors">
                              <td className="h-16 px-4 py-3">
                                 <span className="block truncate font-medium text-foreground">{capitalizeFirst(item.description)}</span>
                                 <span className="block truncate text-xs text-muted-foreground">{item.sku}</span>
                              </td>
                              <td className="h-16 px-4 py-3">
                                 <input 
                                    type="number"
                                    min="0"
                                    className="w-full px-3 py-1.5 border border-border rounded-lg text-right text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none bg-card text-foreground shadow-sm appearance-none"
                                    value={qty || ''}
                                    placeholder="0"
                                    onChange={(e) => handleQuantityChange(item.sku, toCount(e.target.value))}
                                 />
                              </td>
                              <td className="h-16 px-4 py-3">
                                 <div className="relative">
                                    <span className="absolute left-3 top-2 text-muted-foreground text-xs">$</span>
                                    <input 
                                       type="number"
                                       min="0"
                                       max={MAX_UNIT_PRICE}
                                       className="w-full pl-6 pr-3 py-1.5 border border-border rounded-lg text-right text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none bg-card text-foreground shadow-sm appearance-none"
                                       value={price || ''}
                                       placeholder="0.00"
                                       onChange={(e) => handlePriceChange(item.sku, toPrice(e.target.value))}
                                    />
                                 </div>
                              </td>
                              {/* The span is what clips. A fixed column width stops the
                                  cell from growing but not the text inside it from
                                  painting over the neighbouring one, which is how a
                                  long subtotal ended up on top of the delete button. */}
                              <td className="h-16 px-4 py-3 text-right font-bold text-foreground tabular-nums">
                                 <span className="block truncate" title={formatCurrency(subtotal)}>
                                    {formatCurrency(subtotal)}
                                 </span>
                              </td>
                              <td className="px-2 py-3 text-center">
                                 <button 
                                    onClick={() => handleRemoveItem(item.sku)}
                                    className="text-muted-foreground hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors inline-flex justify-center items-center"
                                    title="Eliminar artículo"
                                 >
                                    <Trash2 className="w-4 h-4" />
                                 </button>
                              </td>
                           </tr>
                        );
                    })}
                 </tbody>
                 <tfoot className="bg-muted/80 border-t border-border">
                    <tr>
                       <td colSpan={3} className="px-4 py-4 text-right font-bold text-foreground uppercase text-xs tracking-wider">Total Estimado</td>
                       <td className="px-4 py-4 text-right font-bold text-emerald-700 text-base tabular-nums">
                          <span className="block truncate" title={formatCurrency(totalEstimated)}>
                             {formatCurrency(totalEstimated)}
                          </span>
                       </td>
                       {/* The header declares five columns and this row was drawing
                           four, so the footer's background stopped short of the right
                           edge and left a white notch under the delete column. */}
                       <td className="px-2 py-4" />
                    </tr>
                 </tfoot>
              </table>
           </div>
        </div>
      </Modal>
  );
};
