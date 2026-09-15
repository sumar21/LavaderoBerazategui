import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { MultiSelect } from '../ui/MultiSelect';
import { Provider, Article } from '@/types';
import { configService } from '../../services/configService';
import { Loader2, Plus, Trash2, Package, Box, Tag, FileText, DollarSign } from 'lucide-react';
import { notify } from '../ui/Notice';
import { capitalizeFirst } from '../../utils/text';
import { MAX_UNIT_PRICE, keepPriceText } from '../../utils/number';

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
      description="Agregue múltiples artículos manualmente al sistema."
      icon={Box}
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
      <div className="space-y-5">
        <MultiSelect
            label={<>Proveedores <span className="text-xs text-muted-foreground">(Estos proveedores se asociarán a TODOS los artículos de la lista)</span></>}
            placeholder="Seleccionar proveedores..."
            options={providers.map(p => ({ label: p.name, value: p.id }))}
            value={providerIds}
            onChange={setProviderIds}
        />

        <div className="rounded-xl border border-border bg-muted/50 p-4">
           <h4 className="text-sm font-semibold text-foreground">Agregar al listado</h4>
           <p className="mb-3 text-xs text-muted-foreground">Complete la información del artículo y añádalo a la lista.</p>
           <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-3">
                 <Input
                     label="Categoría / Familia"
                     icon={Box}
                     placeholder="Ej: INSUMOS"
                     value={category} 
                     onChange={e => setCategory(e.target.value)}
                     disabled={isSaving}
                 />
              </div>
              <div className="md:col-span-3">
                 <Input 
                     label="Código (SKU)"
                     icon={Tag}
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
                     icon={FileText}
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
                     icon={DollarSign}
                     placeholder="0.00"
                     min="0"
                     max={MAX_UNIT_PRICE}
                     step="0.01"
                     value={unitPriceStr} 
                     onChange={e => { const v = e.target.value; setUnitPriceStr(prev => keepPriceText(v, prev)); }}
                     disabled={isSaving}
                     onKeyDown={(e) => {
                         if (e.key === 'Enter') handleStageArticle();
                     }}
                 />
              </div>
              <div className="md:col-span-1 border-t md:border-t-0 pt-2 md:pt-0">
                  <button 
                      className={`w-full h-11 md:h-10 px-0 flex justify-center items-center rounded-lg bg-brand text-brand-foreground shadow-sm transition-colors ${
                        !isFormValidToStage || isSaving
                            ? 'cursor-not-allowed opacity-50'
                            : 'hover:bg-brand/90'
                      }`}
                      onClick={handleStageArticle}
                      disabled={!isFormValidToStage || isSaving}
                      title="Agregar a la grilla inferior"
                      aria-label="Agregar a la grilla inferior"
                  >
                      <Plus className="w-5 h-5 text-current" />
                  </button>
              </div>
           </div>
        </div>

        {stagedArticles.length > 0 ? (
          <>
           {/* Mobile: the 5-column table cannot fit a phone, so the same rows
               become cards — the pattern every other grid in the app uses (§5.4). */}
           <ul className="md:hidden space-y-2 max-h-[40vh] overflow-y-auto">
              {stagedArticles.map(a => (
                <li key={a.tempId} className="rounded-lg border border-border bg-card p-3 shadow-sm">
                   <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                         <p className="truncate text-[13px] font-medium text-foreground">{capitalizeFirst(a.name)}</p>
                         <p className="truncate text-[11px] text-muted-foreground">SKU: {a.code}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveStaged(a.tempId)}
                        aria-label={`Quitar ${a.name}`}
                        className="shrink-0 rounded-md border border-border bg-card p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                   </div>
                   <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
                      <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{a.category || '-'}</span>
                      <span className="text-[13px] font-bold tabular-nums text-foreground">${a.unitPrice.toFixed(2)}</span>
                   </div>
                </li>
              ))}
           </ul>

           <div className="hidden md:block border border-border rounded-lg bg-muted max-h-[40vh] overflow-auto">
               <table className="w-full table-fixed min-w-[640px] text-left text-[13px]">
                  <thead className="sticky top-0 z-20 bg-muted border-b border-border font-semibold">
                     <tr>
                         <th className="w-32 px-4 py-2 text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Categoría</th>
                         <th className="w-40 px-4 py-2 text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">SKU</th>
                         <th className="px-4 py-2 text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Artículo</th>
                         <th className="w-36 px-4 py-2 text-right text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Precio Unit.</th>
                         {/* w-10 minus px-3 left the button a 16px box to sit in, so it ended up
                             jammed against the table edge. w-16/px-2 gives it room to centre. */}
                         <th className="w-16 px-2 py-2 text-sm align-middle font-medium text-muted-foreground whitespace-nowrap"></th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                     {stagedArticles.map((a, idx) => (
                         <tr key={a.tempId} className="hover:bg-accent transition-colors">
                             <td className="px-4 py-2.5"><span className="text-[10px] bg-muted px-2 py-0.5 rounded uppercase font-bold tracking-wider text-muted-foreground">{a.category || '-'}</span></td>
                             <td className="px-4 py-2.5 truncate text-[11px] text-muted-foreground font-semibold">{a.code}</td>
                             <td className="px-4 py-2.5 truncate font-medium text-foreground" title={capitalizeFirst(a.name)}>{capitalizeFirst(a.name)}</td>
                             <td className="px-4 py-2.5 truncate text-right text-foreground font-bold tabular-nums">${a.unitPrice.toFixed(2)}</td>
                             <td className="w-16 px-2 py-2">
                                 <div className="flex justify-center">
                                   <button
                                     onClick={() => handleRemoveStaged(a.tempId)}
                                     title="Quitar del listado"
                                     aria-label={`Quitar ${a.name}`}
                                     className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                   >
                                     <Trash2 className="h-3.5 w-3.5" />
                                   </button>
                                 </div>
                             </td>
                         </tr>
                     ))}
                  </tbody>
               </table>
           </div>
          </>
        ) : (
           <div className="flex flex-col items-center justify-center py-10 bg-card border-2 border-dashed border-border rounded-xl">
               <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
                   <Package className="h-7 w-7" />
               </div>
               <p className="text-sm font-semibold text-foreground">No hay artículos en la lista.</p>
               <p className="text-xs text-muted-foreground mt-1 max-w-xs text-center">Complete los datos arriba y presione el botón "+" o la tecla Enter para ir añadiéndolos.</p>
           </div>
        )}
      </div>
    </Modal>
  );
};
