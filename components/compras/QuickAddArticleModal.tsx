import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { MultiSelect } from '../ui/MultiSelect';
import { Provider, Article } from '@/types';
import { configService } from '../../services/configService';
import { Loader2, Plus, Trash2, Package } from 'lucide-react';
import { notify } from '../ui/Notice';

interface QuickAddArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: Provider[];
  articles: Article[];
  defaultProviderId?: string;
  onArticleCreated: (newArticle: Article) => void;
}

interface StagedArticle {
  tempId: string;
  name: string;
  category: string;
  code: string;
  unitPrice: number;
}

export const QuickAddArticleModal: React.FC<QuickAddArticleModalProps> = ({
  isOpen,
  onClose,
  providers,
  articles,
  defaultProviderId,
  onArticleCreated
}) => {
  const [providerIds, setProviderIds] = useState<string[]>([]);
  const [stagedArticles, setStagedArticles] = useState<StagedArticle[]>([]);
  
  // Current Form
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [code, setCode] = useState('');
  const [unitPriceStr, setUnitPriceStr] = useState<string>('');
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProviderIds(defaultProviderId ? [defaultProviderId] : []);
      setStagedArticles([]);
      setName('');
      setCategory('');
      setCode('');
      setUnitPriceStr('');
    }
  }, [isOpen, defaultProviderId]);

  const isFormValidToStage = 
    providerIds.length > 0 &&
    name.trim() !== '' && 
    code.trim() !== '' && 
    category.trim() !== '' && 
    unitPriceStr.trim() !== '' && 
    !isNaN(parseFloat(unitPriceStr)) && 
    parseFloat(unitPriceStr) >= 0;

  const handleStageArticle = () => {
    if (!isFormValidToStage) return;
    
    setStagedArticles(prev => [...prev, {
      tempId: Date.now().toString() + Math.random().toString(),
      name,
      category,
      code,
      unitPrice: parseFloat(unitPriceStr)
    }]);
    
    // Clear specific fields so users can keep adding quickly
    setName('');
    setCode('');
    setCategory('');
    setUnitPriceStr('');
  };

  const handleRemoveStaged = (tempId: string) => {
    setStagedArticles(prev => prev.filter(a => a.tempId !== tempId));
  };

  const handleSaveAll = async () => {
    if (stagedArticles.length === 0 || providerIds.length === 0) {
        notify.warning("Debe seleccionar al menos un proveedor y cargar al menos un artículo a la lista.");
        return;
    }
    setIsSaving(true);
    
    try {
      const proveedoresStr = providerIds.join(';');
      
      let currentMaxNOrden = articles.reduce((max, art) => {
          const currentNOrden = parseInt(art.nOrden || '0');
          return !isNaN(currentNOrden) && currentNOrden > max ? currentNOrden : max;
      }, 0);

      // Loop and create each individually
      for (const staged of stagedArticles) {
          currentMaxNOrden++;
          const newNOrden = currentMaxNOrden.toString();

          const skuParts = staged.code.split('-');
          const derivedClientCode = skuParts.length >= 3 ? skuParts[2] : 'AC';
          
          const newArticleAPI = await configService.createArticulo({
              Titulo: '[sumar]',
              SKU: staged.code,
              Concat: `${staged.code} - ${staged.name}`,
              TipoPrenda: staged.category,
              Descripcion: staged.name,
              Status: 'ALTA',
              Principal: 'SUMAR',
              Familia: staged.category,
              CodigoCliente: derivedClientCode,
              NOrden: newNOrden, 
              Proveedores: proveedoresStr,
              Precio: staged.unitPrice.toString()
          });

          const newArticle: Article = {
              id: parseInt(newArticleAPI.id || newArticleAPI.ID || '0'),
              providerIds: providerIds,
              name: staged.name,
              category: staged.category,
              code: staged.code,
              unitPrice: staged.unitPrice
          };

          if (onArticleCreated) {
              onArticleCreated(newArticle);
          }
      }

      onClose();
    } catch (error) {
      console.error("Error creating articles:", error);
      notify.error("Error al cargar los artículos de forma masiva.");
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = stagedArticles.length > 0 && providerIds.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Carga Masiva de Artículos"
      maxWidth="4xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button onClick={handleSaveAll} disabled={!canSave || isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Guardar {stagedArticles.length} Artículos
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <MultiSelect 
            label="Proveedores (Estos proveedores se asociarán a TODOS los artículos de la lista)"
            placeholder="Seleccionar proveedores..."
            options={providers.map(p => ({ label: p.name, value: p.id }))}
            value={providerIds}
            onChange={setProviderIds}
        />
        
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
           <h4 className="text-sm font-semibold text-slate-800 mb-3">Agregar al listado</h4>
           <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-3">
                 <Input 
                     label="Categoría / Familia" 
                     placeholder="Ej: INSUMOS"
                     value={category} 
                     onChange={e => setCategory(e.target.value)}
                     disabled={isSaving}
                 />
              </div>
              <div className="md:col-span-3">
                 <Input 
                     label="Código (SKU)" 
                     placeholder="SKU-0000"
                     value={code} 
                     onChange={e => setCode(e.target.value)}
                     disabled={isSaving}
                     onKeyDown={(e) => {
                         if (e.key === 'Enter') handleStageArticle();
                     }}
                 />
              </div>
              <div className="md:col-span-3">
                 <Input 
                     label="Nombre y Descripción" 
                     placeholder="Nombre del artículo"
                     value={name} 
                     onChange={e => setName(e.target.value)}
                     disabled={isSaving}
                     onKeyDown={(e) => {
                         if (e.key === 'Enter') handleStageArticle();
                     }}
                 />
              </div>
              <div className="md:col-span-2">
                 <Input 
                     type="number"
                     label="Precio Unitario" 
                     placeholder="0.00"
                     min="0"
                     step="0.01"
                     value={unitPriceStr} 
                     onChange={e => setUnitPriceStr(e.target.value)}
                     disabled={isSaving}
                     onKeyDown={(e) => {
                         if (e.key === 'Enter') handleStageArticle();
                     }}
                 />
              </div>
              <div className="md:col-span-1 border-t md:border-t-0 pt-2 md:pt-0">
                  <button 
                      className={`w-full h-[42px] px-0 flex justify-center items-center rounded-lg transition-colors shadow-sm ${
                        !isFormValidToStage || isSaving 
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-70' 
                            : 'bg-slate-800 text-white hover:bg-slate-700'
                      }`}
                      onClick={handleStageArticle} 
                      disabled={!isFormValidToStage || isSaving}
                      title="Agregar a la grilla inferior"
                  >
                      <Plus className="w-5 h-5 text-current" />
                  </button>
              </div>
           </div>
        </div>

        {stagedArticles.length > 0 ? (
           <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[40vh] overflow-y-auto">
               <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0 z-10 shadow-sm border-b border-slate-200">
                     <tr>
                         <th className="px-4 py-2">Categoría</th>
                         <th className="px-4 py-2">SKU</th>
                         <th className="px-4 py-2">Artículo</th>
                         <th className="px-4 py-2 text-right">Precio Unit.</th>
                         <th className="px-3 py-2 w-10"></th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                     {stagedArticles.map((a, idx) => (
                         <tr key={a.tempId} className="hover:bg-slate-50 transition-colors">
                             <td className="px-4 py-2"><span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded uppercase font-bold tracking-wider text-slate-600">{a.category || '-'}</span></td>
                             <td className="px-4 py-2 font-mono text-xs text-slate-500 font-semibold">{a.code}</td>
                             <td className="px-4 py-2 font-medium text-slate-900">{a.name}</td>
                             <td className="px-4 py-2 text-right font-mono text-slate-700 font-bold">${a.unitPrice.toFixed(2)}</td>
                             <td className="px-3 py-2 text-center">
                                 <button onClick={() => handleRemoveStaged(a.tempId)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shadow-sm bg-white border border-slate-100">
                                     <Trash2 className="w-3.5 h-3.5" />
                                 </button>
                             </td>
                         </tr>
                     ))}
                  </tbody>
               </table>
           </div>
        ) : (
           <div className="flex flex-col items-center justify-center py-10 bg-white border-2 border-dashed border-slate-200 rounded-xl">
               <Package className="w-10 h-10 text-slate-200 mb-3" />
               <p className="text-sm font-medium text-slate-500">No hay artículos en la lista.</p>
               <p className="text-xs text-slate-400 mt-1 max-w-xs text-center">Complete los datos arriba y presione el botón "+" o la tecla Enter para ir añadiéndolos.</p>
           </div>
        )}
      </div>
    </Modal>
  );
};
