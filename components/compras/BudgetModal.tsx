
import React, { useState, useEffect } from 'react';
import { DollarSign, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { PurchaseOrder } from '@/types';

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
        footer={
           <>
              <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
              <Button onClick={handleSave} variant="primary" disabled={totalEstimated <= 0 || isLoading}>
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
        <div className="space-y-5 relative">
           {isLoading && (
               <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-xl">
                   <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                   <span className="text-sm font-medium text-slate-600">Guardando presupuesto...</span>
               </div>
           )}
           <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-start gap-3">
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
                     <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative">
                        <button 
                           onClick={() => handleRemoveItem(item.sku)}
                           className="absolute top-3 right-3 text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                           title="Eliminar artículo"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                        </button>
                        <div className="mb-3 pr-8">
                           <span className="block font-bold text-slate-900">{item.description}</span>
                           <span className="block text-xs text-slate-400 font-mono mt-0.5">{item.sku}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                           <div>
                              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Cantidad</label>
                              <input 
                                 type="number"
                                 min="0"
                                 className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none bg-white text-slate-900 shadow-sm"
                                 value={qty || ''}
                                 placeholder="0"
                                 onChange={(e) => handleQuantityChange(item.sku, parseInt(e.target.value) || 0)}
                              />
                           </div>
                           <div>
                              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Precio Unit.</label>
                              <div className="relative">
                                 <span className="absolute left-3 top-2.5 text-slate-400 text-xs">$</span>
                                 <input 
                                    type="number"
                                    min="0"
                                    className="w-full pl-6 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none bg-white text-slate-900 shadow-sm"
                                    value={price || ''}
                                    placeholder="0.00"
                                    onChange={(e) => handlePriceChange(item.sku, parseFloat(e.target.value) || 0)}
                                 />
                              </div>
                           </div>
                        </div>
                        <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100 flex justify-between items-center">
                           <span className="text-[10px] uppercase font-bold text-emerald-600">Subtotal</span>
                           <span className="text-sm font-bold text-emerald-700">{formatCurrency(subtotal)}</span>
                        </div>
                     </div>
                  );
              })}
              <div className="bg-emerald-600 rounded-xl p-4 text-white shadow-md">
                 <div className="flex justify-between items-center">
                    <span className="text-xs uppercase font-bold opacity-80 tracking-wider">Total Estimado</span>
                    <span className="text-xl font-bold">{formatCurrency(totalEstimated)}</span>
                 </div>
              </div>
           </div>

           {/* DESKTOP VIEW (Table) */}
           <div className="hidden md:block border rounded-xl overflow-hidden border-slate-200 shadow-sm">
              <table className="w-full text-sm">
                 <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                       <th className="px-5 py-3 text-left font-semibold text-slate-700">Artículo</th>
                       <th className="px-5 py-3 text-right font-semibold text-slate-700 w-28">Cant.</th>
                       <th className="px-5 py-3 text-right font-semibold text-slate-700 w-36">Precio Unit.</th>
                       <th className="px-5 py-3 text-right font-semibold text-slate-700 w-36">Subtotal</th>
                       <th className="px-2 py-3 w-10"></th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {activeItems.map((item, idx) => {
                        const price = budgetPrices[item.sku] || 0;
                        const qty = budgetQuantities[item.sku] || 0;
                        const subtotal = price * qty;
                        return (
                           <tr key={idx} className="bg-white hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-3">
                                 <span className="block font-medium text-slate-900">{item.description}</span>
                                 <span className="text-xs text-slate-500 font-mono">{item.sku}</span>
                              </td>
                              <td className="px-5 py-3">
                                 <input 
                                    type="number"
                                    min="0"
                                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-right text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none bg-white text-slate-900 shadow-sm appearance-none"
                                    value={qty || ''}
                                    placeholder="0"
                                    onChange={(e) => handleQuantityChange(item.sku, parseInt(e.target.value) || 0)}
                                 />
                              </td>
                              <td className="px-5 py-3">
                                 <div className="relative">
                                    <span className="absolute left-3 top-2 text-slate-400 text-xs">$</span>
                                    <input 
                                       type="number"
                                       min="0"
                                       className="w-full pl-6 pr-3 py-1.5 border border-slate-300 rounded-lg text-right text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none bg-white text-slate-900 shadow-sm appearance-none"
                                       value={price || ''}
                                       placeholder="0.00"
                                       onChange={(e) => handlePriceChange(item.sku, parseFloat(e.target.value) || 0)}
                                    />
                                 </div>
                              </td>
                              <td className="px-5 py-3 text-right font-bold text-slate-800">
                                 {formatCurrency(subtotal)}
                              </td>
                              <td className="px-2 py-3 text-center">
                                 <button 
                                    onClick={() => handleRemoveItem(item.sku)}
                                    className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors inline-flex justify-center items-center"
                                    title="Eliminar artículo"
                                 >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                 </button>
                              </td>
                           </tr>
                        );
                    })}
                 </tbody>
                 <tfoot className="bg-slate-50/80 border-t border-slate-200">
                    <tr>
                       <td colSpan={3} className="px-5 py-4 text-right font-bold text-slate-700 uppercase text-xs tracking-wider">Total Estimado</td>
                       <td className="px-5 py-4 text-right font-bold text-emerald-700 text-lg">
                          {formatCurrency(totalEstimated)}
                       </td>
                    </tr>
                 </tfoot>
              </table>
           </div>
        </div>
      </Modal>
  );
};
