
import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, RefreshCcw, ArrowRightLeft, Edit, Trash2, AlertTriangle, AlertCircle, X, Package, LayoutGrid, List } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Combobox } from '../components/ui/Combobox';
import { Select } from '../components/ui/Select';
import { MultiSelect } from '../components/ui/MultiSelect';
import { StockItem, ModalType, StockPayload, ArticuloAPI } from '@/types';
import { stockService } from '../services/stockService';
import { configService } from '../services/configService';
import { notify } from '../components/ui/Notice';
import { Loader } from '../components/ui/Loader';
import { PageHeader } from '../components/ui/PageHeader';
import { capitalizeFirst } from '../utils/text';

export const StockOnline: React.FC = () => {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [catalog, setCatalog] = useState<ArticuloAPI[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [apiStock, apiArticles] = await Promise.all([
        stockService.getStock(),
        configService.getArticulos(undefined, 'Alta')
      ]);

      // Filter only active items and exclude invalid data (#N/D)
      const activeStock = apiStock.filter(item => 
        item.status === 'Activo' && 
        !item.sku?.includes('#N/D') && 
        !item.articulo?.includes('#N/D')
      );
      
      const mappedStock: StockItem[] = activeStock.map(item => {
        const subdeposit = (item.subdeposito && item.subdeposito.toUpperCase().includes('LOGISTICA')) ? 'LOGISTICA' : 'DEPOSITO';
        
        // Generate a base ID
        const baseId = `${item.id}-${subdeposit}`;
        
        return {
          id: baseId,
          originalId: item.id,
          sku: item.sku,
          description: item.articulo,
          subdeposit: subdeposit,
          quantity: parseFloat(item.stockFinal)
        };
      });

      // Ensure uniqueness of IDs to prevent key collisions
      const uniqueStock: StockItem[] = [];
      const idMap = new Set<string>();

      mappedStock.forEach(item => {
          let uniqueId = item.id;
          let counter = 1;
          while (idMap.has(uniqueId)) {
              uniqueId = `${item.id}-${counter}`;
              counter++;
          }
          idMap.add(uniqueId);
          uniqueStock.push({ ...item, id: uniqueId });
      });

      setStock(uniqueStock);

      // Filter catalog to exclude invalid data (#N/D)
      const validArticles = apiArticles.filter(item => 
        !item.sku?.includes('#N/D') && 
        !item.titulo?.includes('#N/D') &&
        !item.descripcion?.includes('#N/D')
      );
      setCatalog(validArticles);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{ subdeposit: string[]; sku: string[] }>({
    subdeposit: [],
    sku: [],
  });
  
  // UI States
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form States
  const [formData, setFormData] = useState({
    sku: '',
    description: '',
    quantity: 0,
    subdeposit: 'DEPOSITO',
    targetDeposit: 'LOGISTICA'
  });

  const catalogOptions = Array.from(
    new Map<string, { value: string; label: string; description: string }>(
      catalog.map(p => [
        p.sku,
        {
          value: p.sku,
          label: p.concat || `${p.sku} - ${p.descripcion || p.titulo}`,
          description: p.sku
        }
      ])
    ).values()
  );

  // --- HANDLERS ---
  const handleOpenModal = (type: ModalType, item: StockItem | null = null) => {
    setSelectedItem(item);
    setActiveModal(type);
    setValidationError(null);
    setShowConfirmation(false);

    if (item) {
      setFormData({
        sku: item.sku,
        description: item.description,
        quantity: 0,
        subdeposit: item.subdeposit,
        targetDeposit: item.subdeposit === 'DEPOSITO' ? 'LOGISTICA' : 'DEPOSITO'
      });
      if (type === 'EDIT') {
         setFormData(prev => ({ ...prev, quantity: item.quantity }));
      }
    } else {
      setFormData({ 
        sku: '', 
        description: '', 
        quantity: 0, 
        subdeposit: 'DEPOSITO', 
        targetDeposit: 'LOGISTICA' 
      });
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedItem(null);
    setShowConfirmation(false);
    setValidationError(null);
  };

  const validateForm = (): boolean => {
    setValidationError(null);
    if (formData.quantity < 0) {
        setValidationError("La cantidad no puede ser negativa.");
        return false;
    }
    if (activeModal === 'ADD') {
        if (!formData.sku) {
            setValidationError("Debe seleccionar un producto.");
            return false;
        }
        if (formData.quantity <= 0) {
            setValidationError("La cantidad debe ser mayor a 0.");
            return false;
        }
    }
    if (selectedItem) {
        if (activeModal === 'TRANSFER' || activeModal === 'TRANSFORM') {
            if (formData.quantity <= 0) {
                setValidationError("La cantidad a mover debe ser mayor a 0.");
                return false;
            }
            if (formData.quantity > selectedItem.quantity) {
                setValidationError(`La cantidad excede el stock disponible (${selectedItem.quantity}).`);
                return false;
            }
        }
        if (activeModal === 'TRANSFORM') {
             if(!formData.sku) {
                 setValidationError("Debe seleccionar el nuevo tipo de prenda.");
                 return false;
             }
             if(formData.sku === selectedItem.sku) {
                 setValidationError("El producto destino debe ser diferente al actual.");
                 return false;
             }
        }
    }
    return true;
  };

  const initiateAction = () => {
      if (validateForm()) {
          setShowConfirmation(true);
      }
  };

  const recordMovement = async (
    tipo: string,
    sku: string,
    description: string,
    qty: number,
    stockInicial: number,
    stockFinal: number,
    subdepositOrigen: string,
    subdepositDestino: string,
    accionCode: string,
    timestampOverride?: Date
  ) => {
    const now = timestampOverride || new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const fecha = `${year}-${month}-${day}`;
    const hora = `${hours}:${minutes}`;
    const mesAnio = `${month}/${year}`;
    
    const idUnivoco = `ADM_${accionCode}_${day}${month}${year}${hours}${minutes}`;
    const concat = `${sku} - ${description}`;
    const usuario = 'Admin';
    const versionApp = 'v20251223_1.0.10';
    
    const baseData = {
      Titulo: '[sumar]',
      titulo: '[sumar]',
      Status: 'Activo',
      VersionApp: versionApp,
      versionApp: versionApp,
      Usuario: usuario,
      Fecha: fecha,
      Mes: month,
      Anio: String(year),
      MesAnio: mesAnio,
      MesAno: mesAnio,
      Hora: hora,
    };

    try {
      const promises: Promise<any>[] = [];

      if (accionCode !== 'EDI' && accionCode !== 'ANU') {
        promises.push(
          stockService.createResumenIngresoEgreso({
            ...baseData,
            IDUnivoco: idUnivoco,
            Tipo: tipo,
            Articulos: '1',
            Total: String(qty),
            Subdeposito: subdepositOrigen === 'LOGISTICA' ? 'Logistica' : 'Deposito'
          })
        );
        promises.push(
          stockService.createDetalleIngresoEgreso({
            ...baseData,
            IDUnivoco: idUnivoco,
            Tipo: tipo,
            Articulo: description,
            Subdeposito: subdepositOrigen === 'LOGISTICA' ? 'Logistica' : 'Deposito',
            Cantidad: String(qty),
            StockInicial: String(stockInicial),
            StockFinal: String(stockFinal),
            Concat: concat
          })
        );
      }

      promises.push(
        stockService.createMovimientoStock({
          ...baseData,
          IDUnivoco: idUnivoco,
          Tipo: tipo,
          Articulo: description,
          Concat: concat,
          StockInicial: String(stockInicial),
          StockFinal: String(stockFinal),
          SubdepositoActual: subdepositOrigen === 'LOGISTICA' ? 'Logistica' : 'Deposito',
          SubdepositoFinal: subdepositDestino === 'LOGISTICA' ? 'Logistica' : 'Deposito'
        } as any)
      );

      await Promise.all(promises);
    } catch (error) {
      console.error("Error recording movement:", error);
    }
  };

  const executeAction = async () => {
    const qty = Number(formData.quantity);
    const today = new Date().toISOString().split('T')[0];
    const actionTimestamp = new Date();
    
    try {
        if (activeModal === 'DELETE' && selectedItem) {
            await stockService.updateStock({
                id: selectedItem.originalId || selectedItem.id,
                Status: 'Inactivo',
                Titulo: '[sumar]',
                titulo: '[sumar]'
            });
            setStock(stock.filter(i => i.id !== selectedItem.id));
            
            await recordMovement('Anulacion', selectedItem.sku, selectedItem.description, selectedItem.quantity, selectedItem.quantity, 0, selectedItem.subdeposit, selectedItem.subdeposit, 'ANU', actionTimestamp);
        } 
        else if (activeModal === 'ADD') {
            const productInfo = catalog.find(p => p.sku === formData.sku);
            const description = productInfo ? (productInfo.descripcion || productInfo.titulo) : 'DESCONOCIDO';
            
            const existingItem = stock.find(i => i.sku === formData.sku && i.subdeposit === formData.subdeposit);
            
            if (existingItem) {
                const newQty = existingItem.quantity + qty;
                await stockService.updateStock({
                    id: existingItem.originalId || existingItem.id,
                    StockFinal: newQty.toString(),
                    Status: 'Activo',
                    Titulo: '[sumar]',
                    titulo: '[sumar]'
                });
                setStock(stock.map(i => i.id === existingItem.id ? {...i, quantity: newQty} : i));
                
                await recordMovement('Ingreso', formData.sku, description, qty, existingItem.quantity, newQty, formData.subdeposit, formData.subdeposit, 'ING', actionTimestamp);
            } else {
                const subdepositoName = formData.subdeposit === 'LOGISTICA' ? 'Logistica' : 'Deposito';
                const idSubdeposito = `${subdepositoName} - ${formData.sku}`;
                
                const newItemPayload: StockPayload = {
                    Fecha: today,
                    IDSubdeposito: idSubdeposito,
                    Subdeposito: subdepositoName,
                    SKU: formData.sku,
                    Articulo: description,
                    Concat: `${formData.sku} - ${description}`,
                    StockFinal: qty.toString(),
                    StockPendiente: '0',
                    Status: 'Activo',
                    Titulo: '[sumar]',
                    titulo: '[sumar]'
                } as any;
                
                const createdItem = await stockService.createStock(newItemPayload);
                // Use response data if available, otherwise fallback to form data to prevent UI issues
                const newItemId = createdItem.id || Math.random().toString(36).substr(2, 9);
                const newItemSubdeposit = formData.subdeposit as 'DEPOSITO' | 'LOGISTICA';
                const newItem: StockItem = {
                    id: `${newItemId}-${newItemSubdeposit}`,
                    originalId: newItemId,
                    sku: createdItem.sku || formData.sku,
                    description: createdItem.articulo || description,
                    subdeposit: newItemSubdeposit,
                    quantity: createdItem.stockFinal ? parseFloat(createdItem.stockFinal) : qty
                };
                setStock([newItem, ...stock]);
                
                await recordMovement('Ingreso', formData.sku, description, qty, 0, qty, formData.subdeposit, formData.subdeposit, 'ING', actionTimestamp);
            }
        } 
        else if (activeModal === 'EDIT' && selectedItem) {
            await stockService.updateStock({
                id: selectedItem.originalId || selectedItem.id,
                StockFinal: qty.toString(),
                Status: 'Activo',
                Titulo: '[sumar]',
                titulo: '[sumar]'
            });
            setStock(stock.map(i => i.id === selectedItem.id ? {...i, quantity: qty} : i));
            
            await recordMovement('Edicion', selectedItem.sku, selectedItem.description, Math.abs(qty - selectedItem.quantity), selectedItem.quantity, qty, selectedItem.subdeposit, selectedItem.subdeposit, 'EDI', actionTimestamp);
        }
        else if (activeModal === 'TRANSFER' && selectedItem) {
            const targetDeposit = formData.targetDeposit as 'DEPOSITO' | 'LOGISTICA';
            const newSourceQty = selectedItem.quantity - qty;
            
            await stockService.updateStock({
                id: selectedItem.originalId || selectedItem.id,
                StockFinal: newSourceQty.toString(),
                Titulo: '[sumar]'
            });
            
            const existingTarget = stock.find(i => i.sku === selectedItem.sku && i.subdeposit === targetDeposit);
            
            if (existingTarget) {
                const newTargetQty = existingTarget.quantity + qty;
                await stockService.updateStock({
                    id: existingTarget.originalId || existingTarget.id,
                    StockFinal: newTargetQty.toString(),
                    Titulo: '[sumar]',
                    titulo: '[sumar]'
                });
                
                let newStock = stock.map(i => {
                    if (i.id === selectedItem.id) return { ...i, quantity: newSourceQty };
                    if (i.id === existingTarget.id) return { ...i, quantity: newTargetQty };
                    return i;
                });
                if (newSourceQty <= 0) newStock = newStock.filter(i => i.id !== selectedItem.id);
                setStock(newStock);
                
                await recordMovement('Egreso por Transferencia', selectedItem.sku, selectedItem.description, qty, selectedItem.quantity, newSourceQty, selectedItem.subdeposit, targetDeposit, 'TRFER', actionTimestamp);
                await recordMovement('Ingreso por Transferencia', selectedItem.sku, selectedItem.description, qty, existingTarget.quantity, newTargetQty, targetDeposit, targetDeposit, 'TRFER', actionTimestamp);
            } else {
                const subdepositoName = targetDeposit === 'LOGISTICA' ? 'Logistica' : 'Deposito';
                const idSubdeposito = `${subdepositoName} - ${selectedItem.sku}`;
                
                const newItemPayload: StockPayload = {
                    Fecha: today,
                    IDSubdeposito: idSubdeposito,
                    Subdeposito: subdepositoName,
                    SKU: selectedItem.sku,
                    Articulo: selectedItem.description,
                    Concat: `${selectedItem.sku} - ${selectedItem.description}`,
                    StockFinal: qty.toString(),
                    StockPendiente: '0',
                    Status: 'Activo',
                    Titulo: '[sumar]',
                    titulo: '[sumar]'
                } as any;
                const createdItem = await stockService.createStock(newItemPayload);
                const newItemId = createdItem.id || Math.random().toString(36).substr(2, 9);
                const newTarget: StockItem = {
                    id: `${newItemId}-${targetDeposit}`,
                    originalId: newItemId,
                    sku: createdItem.sku || selectedItem.sku,
                    description: createdItem.articulo || selectedItem.description,
                    subdeposit: targetDeposit,
                    quantity: createdItem.stockFinal ? parseFloat(createdItem.stockFinal) : qty
                };
                
                let newStock = stock.map(i => i.id === selectedItem.id ? { ...i, quantity: newSourceQty } : i);
                newStock.push(newTarget);
                if (newSourceQty <= 0) newStock = newStock.filter(i => i.id !== selectedItem.id);
                setStock(newStock);
                
                await recordMovement('Egreso por Transferencia', selectedItem.sku, selectedItem.description, qty, selectedItem.quantity, newSourceQty, selectedItem.subdeposit, targetDeposit, 'TRFER', actionTimestamp);
                await recordMovement('Ingreso por Transferencia', selectedItem.sku, selectedItem.description, qty, 0, qty, targetDeposit, targetDeposit, 'TRFER', actionTimestamp);
            }
        }
        else if (activeModal === 'TRANSFORM' && selectedItem) {
            const newSourceQty = selectedItem.quantity - qty;
            
            // 1. Restar del origen
            await stockService.updateStock({
                id: selectedItem.originalId || selectedItem.id,
                StockFinal: newSourceQty.toString(),
                Titulo: '[sumar]',
                titulo: '[sumar]'
            });
            
            const targetSku = formData.sku;
            const targetProductInfo = catalog.find(p => p.sku === targetSku);
            const targetDesc = targetProductInfo ? (targetProductInfo.descripcion || targetProductInfo.titulo) : 'TRANSFORMADO';
            
            const existingTarget = stock.find(i => i.sku === targetSku && i.subdeposit === selectedItem.subdeposit);
            
            if (existingTarget) {
                 // 2a. Sumar al destino existente
                 const newTargetQty = existingTarget.quantity + qty;
                 await stockService.updateStock({
                     id: existingTarget.originalId || existingTarget.id,
                     StockFinal: newTargetQty.toString(),
                     Titulo: '[sumar]',
                     titulo: '[sumar]'
                 });
                 
                 let newStock = stock.map(i => {
                     if (i.id === selectedItem.id) return { ...i, quantity: newSourceQty };
                     if (i.id === existingTarget.id) return { ...i, quantity: newTargetQty };
                     return i;
                 });
                 if (newSourceQty <= 0) newStock = newStock.filter(i => i.id !== selectedItem.id);
                 setStock(newStock);
                 
                 await recordMovement('Egreso por Transformacion', selectedItem.sku, selectedItem.description, qty, selectedItem.quantity, newSourceQty, selectedItem.subdeposit, selectedItem.subdeposit, 'TRFOR', actionTimestamp);
                 await recordMovement('Ingreso por Transformacion', targetSku, targetDesc, qty, existingTarget.quantity, newTargetQty, selectedItem.subdeposit, selectedItem.subdeposit, 'TRFOR', actionTimestamp);
            } else {
                 // 2b. Crear destino si no existe
                 const subdepositoName = selectedItem.subdeposit === 'LOGISTICA' ? 'Logistica' : 'Deposito';
                 const idSubdeposito = `${subdepositoName} - ${targetSku}`;
                 
                 const newItemPayload: StockPayload = {
                    Fecha: today,
                    IDSubdeposito: idSubdeposito,
                    Subdeposito: subdepositoName,
                    SKU: targetSku,
                    Articulo: targetDesc,
                    Concat: `${targetSku} - ${targetDesc}`,
                    StockFinal: qty.toString(),
                    StockPendiente: '0',
                    Status: 'Activo',
                    Titulo: '[sumar]',
                    titulo: '[sumar]'
                 } as any;
                 const createdItem = await stockService.createStock(newItemPayload);
                 const newItemId = createdItem.id || Math.random().toString(36).substr(2, 9);
                 const newTarget: StockItem = {
                    id: `${newItemId}-${selectedItem.subdeposit}`,
                    originalId: newItemId,
                    sku: createdItem.sku || targetSku,
                    description: createdItem.articulo || targetDesc,
                    subdeposit: selectedItem.subdeposit,
                    quantity: createdItem.stockFinal ? parseFloat(createdItem.stockFinal) : qty
                 };
                 
                 let newStock = stock.map(i => i.id === selectedItem.id ? { ...i, quantity: newSourceQty } : i);
                 newStock.push(newTarget);
                 if (newSourceQty <= 0) newStock = newStock.filter(i => i.id !== selectedItem.id);
                 setStock(newStock);
                 
                 await recordMovement('Egreso por Transformacion', selectedItem.sku, selectedItem.description, qty, selectedItem.quantity, newSourceQty, selectedItem.subdeposit, selectedItem.subdeposit, 'TRFOR', actionTimestamp);
                 await recordMovement('Ingreso por Transformacion', targetSku, targetDesc, qty, 0, qty, selectedItem.subdeposit, selectedItem.subdeposit, 'TRFOR', actionTimestamp);
            }
            notify.success(`Transformación realizada con éxito.\n\nSe transformaron ${qty} unidades de "${selectedItem.description}" a "${targetDesc}".`);
        }
        closeModal();
    } catch (error) {
        console.error("Error executing action:", error);
        setValidationError("Error al procesar la solicitud. Intente nuevamente.");
    }
  };

  const filteredStock = stock.filter(item => {
    const sku = item.sku || '';
    const desc = item.description || '';
    const matchesSearch = sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          desc.toLowerCase().includes(searchTerm.toLowerCase());
    
    // An empty selection means "no filter", the same contract MultiSelect uses.
    const matchesSubdeposit = filters.subdeposit.length === 0 || filters.subdeposit.includes(item.subdeposit);
    const matchesSku = filters.sku.length === 0 || filters.sku.includes(item.sku);

    return matchesSearch && matchesSubdeposit && matchesSku;
  });

  // Totals count the rows on screen, not the whole warehouse: the bar sits under
  // the grid now, and a footer that disagrees with the rows above it reads as a
  // bug the moment any filter is applied.
  const totalQty = filteredStock.reduce((acc, item) => acc + item.quantity, 0);
  const logisticsQty = filteredStock.filter(i => i.subdeposit === 'LOGISTICA').reduce((acc, item) => acc + item.quantity, 0);
  const plantQty = filteredStock.filter(i => i.subdeposit === 'DEPOSITO').reduce((acc, item) => acc + item.quantity, 0);

  const totalsBar = (
    <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 px-4 py-2.5 text-xs">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
        Logística: <b className="tabular-nums text-foreground">{logisticsQty}</b>
      </div>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" aria-hidden="true" />
        Planta: <b className="tabular-nums text-foreground">{plantQty}</b>
      </div>
      <div className="font-semibold text-foreground">
        Total: <span className="tabular-nums">{totalQty}</span>
      </div>
    </div>
  );

  const activeFiltersCount = filters.subdeposit.length + filters.sku.length;

  return (
    <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-500 overflow-y-auto md:overflow-hidden bg-muted">
      
      {/* Header Area */}
      <div className="shrink-0 border-b border-border bg-muted px-4 py-4 sm:px-8">
        <PageHeader
          title="Stock Online"
          subtitle={
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
              Actualizado en tiempo real
            </span>
          }
          actions={
          <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3 w-full lg:w-auto items-center">
             <Button
               variant="outline"
               size="icon"
               onClick={fetchData}
               disabled={isLoading}
               className="rounded-full bg-card text-foreground border-border shadow-sm hover:bg-accent hover:text-brand transition-colors shrink-0"
               title="Actualizar datos"
             >
               <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand' : ''}`} />
             </Button>
             
             <div className="relative flex-1 sm:w-80 group">
               <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-brand transition-colors" />
               <input 
                 placeholder="Buscar..." 
                 className="w-full pl-10 h-10 rounded-md bg-card shadow-sm border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all text-sm"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
             </div>
             
             <div className="relative">
                <Button 
                    variant={activeFiltersCount > 0 ? "secondary" : "outline"} 
                    className={`h-10 rounded-md px-4 ${activeFiltersCount > 0 ? "bg-brand/10 text-brand border-brand/20" : "bg-card text-foreground border-border shadow-sm"}`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Filter className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">{activeFiltersCount > 0 ? `Filtros (${activeFiltersCount})` : 'Filtrar'}</span>
                    <span className="sm:hidden">{activeFiltersCount > 0 ? activeFiltersCount : ''}</span>
                </Button>

                {showFilters && (
                    <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowFilters(false)} />
                    <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-card rounded-lg shadow-sm ring-1 ring-border z-40 p-5 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-bold text-foreground">Configurar Filtros</h3>
                            <button onClick={() => setShowFilters(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <MultiSelect
                                label="Subdepósito"
                                placeholder="Todos"
                                value={filters.subdeposit}
                                onChange={(val) => setFilters(prev => ({...prev, subdeposit: val}))}
                                options={[
                                    { value: 'DEPOSITO', label: 'Depósito Planta' },
                                    { value: 'LOGISTICA', label: 'Logística' }
                                ]}
                            />
                            <MultiSelect
                                label="Artículo"
                                placeholder="Todos"
                                value={filters.sku}
                                onChange={(val) => setFilters(prev => ({...prev, sku: val}))}
                                options={catalogOptions.map(o => ({ value: o.value, label: o.label }))}
                            />
                        </div>
                        {(activeFiltersCount > 0) && (
                            <div className="pt-4 border-t border-border mt-4 flex justify-end">
                                <button 
                                    className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors flex items-center gap-1"
                                    onClick={() => {
                                        setFilters({ subdeposit: [], sku: [] });
                                    }}
                                >
                                    <Trash2 className="w-3 h-3" /> Limpiar filtros
                                </button>
                            </div>
                        )}
                    </div>
                    </>
                )}
             </div>

             <Button 
                variant="default" 
                className="w-full sm:w-auto h-10 rounded-md px-5 shadow-sm" 
                onClick={() => handleOpenModal('ADD')}
             >
              <Plus className="w-4 h-4 mr-2" />
              Ingresar
            </Button>
          </div>
          }
        />
      </div>

      {/* Main Content Area */}
      <div className="flex min-h-0 flex-1 flex-col px-4 sm:px-8 pb-4 pt-5 md:overflow-hidden overflow-y-auto">
        {isLoading ? (
          <div className="flex h-full min-h-[400px] items-center justify-center">
            <Loader text="Cargando stock…" />
          </div>
        ) : filteredStock.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] animate-in fade-in zoom-in-95 duration-500">
             <div className="w-20 h-20 bg-muted rounded-md flex items-center justify-center mb-6 shadow-sm ring-1 ring-border">
                 <Search className="w-10 h-10 text-muted-foreground" />
             </div>
             <h3 className="text-xl font-bold text-foreground tracking-tight">Sin resultados</h3>
             <p className="text-muted-foreground mt-2 text-center max-w-xs">No encontramos productos que coincidan con tu búsqueda.</p>
             {activeFiltersCount > 0 ? (
                 <Button variant="ghost" className="mt-6 text-brand hover:bg-brand/10" onClick={() => setFilters({ subdeposit: [], sku: [] })}>
                     Limpiar filtros
                 </Button>
             ) : (
                 <Button variant="default" className="mt-6 rounded-md" onClick={() => handleOpenModal('ADD')}>
                   <Plus className="w-4 h-4 mr-2" />
                   Ingresar Producto
                 </Button>
             )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:flex min-h-0 flex-1 flex-col bg-card rounded-lg border border-border shadow-sm"><div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead className="sticky top-0 z-20 bg-muted border-b border-border">
                  <tr>
                    <th className="h-12 px-4 text-left text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Producto</th>
                    <th className="h-12 px-4 text-left text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Ubicación</th>
                    <th className="h-12 px-4 text-right text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Cantidad</th>
                    <th className="h-12 px-4 text-right text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredStock.map((item) => (
                    <tr key={item.id} className="hover:bg-card/60 transition-colors group">
                      <td className="h-16 px-4 py-3">
                        {/* No icon tile and no chip around the SKU: both inflated the
                            row well past the reference grid's height. */}
                        <div className="min-w-0">
                          <span className="block truncate text-[13px] font-medium text-foreground">{capitalizeFirst(item.description)}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">SKU: {item.sku}</span>
                        </div>
                      </td>
                      <td className="h-16 px-4 py-3">
                        <Badge 
                            variant={item.subdeposit === 'DEPOSITO' ? 'info' : 'warning'}
                            className="border-0 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        >
                          {item.subdeposit}
                        </Badge>
                      </td>
                      <td className="h-16 px-4 py-3 text-right">
                         <div className="flex flex-col items-end">
                            <span className={`text-base font-bold tabular-nums tracking-tight ${item.quantity < 50 ? 'text-amber-600' : 'text-foreground'}`}>
                                {item.quantity} un.
                            </span>
                            {item.quantity < 50 && <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">Bajo Stock</span>}
                         </div>
                      </td>
                      <td className="h-16 px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => handleOpenModal('TRANSFORM', item)}
                            title="Transformar"
                            className="p-2 text-muted-foreground hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          >
                            <RefreshCcw className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleOpenModal('TRANSFER', item)}
                            title="Transferir"
                            className="p-2 text-muted-foreground hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleOpenModal('EDIT', item)}
                            title="Editar"
                            className="p-2 text-muted-foreground hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                             onClick={() => handleOpenModal('DELETE', item)}
                             title="Eliminar"
                             className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Totals plinth: last child of the card and shrink-0, so it holds the
                bottom edge while the table scrolls above it. It used to be a pill
                floating over the middle of the grid, which meant it covered rows
                and needed a mousemove listener to fade itself out of the way. */}
            <div className="shrink-0 rounded-b-lg border-t border-border bg-muted/60">
              {totalsBar}
            </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              <div className="sticky top-0 z-10 rounded-lg border border-border bg-card shadow-sm">
                {totalsBar}
              </div>
              {filteredStock.map((item) => (
                <div key={item.id} className="bg-card rounded-lg border border-border shadow-sm p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground text-[13px] truncate">{capitalizeFirst(item.description)}</h4>
                      <span className="block truncate text-[11px] text-muted-foreground mt-0.5">SKU: {item.sku}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-sm font-bold ${item.quantity < 50 ? 'text-amber-600' : 'text-foreground'}`}>
                        {item.quantity} un.
                      </div>
                      {item.quantity < 50 && <span className="text-[9px] font-bold text-amber-500 uppercase">Bajo Stock</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2 border-y border-border">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ubicación</span>
                    <Badge 
                        variant={item.subdeposit === 'DEPOSITO' ? 'info' : 'warning'}
                        className="border-0 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    >
                      {item.subdeposit}
                    </Badge>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 rounded-md text-xs gap-2 min-w-[100px] border-purple-100 text-purple-600 bg-purple-50/50"
                      onClick={() => handleOpenModal('TRANSFORM', item)}
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                      Transformar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 rounded-md text-xs gap-2 min-w-[100px] border-brand/20 text-brand bg-brand/10/50"
                      onClick={() => handleOpenModal('TRANSFER', item)}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      Transferir
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-md text-xs px-3 border-orange-100 text-orange-600 bg-orange-50/50"
                      onClick={() => handleOpenModal('EDIT', item)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-md text-xs px-3 border-red-100 text-red-600 bg-red-50/50"
                      onClick={() => handleOpenModal('DELETE', item)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Confirmation & Actions Modals (Logic remains identical, just ensuring imports work) */}
      <Modal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        title="Confirmar Acción"
        footer={
            <>
                <Button variant="outline" onClick={() => setShowConfirmation(false)}>Cancelar</Button>
                <Button onClick={executeAction} variant={activeModal === 'DELETE' ? 'danger' : 'primary'}>
                    Confirmar
                </Button>
            </>
        }
      >
        <div className="flex flex-col gap-3">
            <div className="flex items-start gap-4 bg-amber-50 p-5 rounded-lg border border-amber-100">
                <AlertCircle className="text-amber-600 w-6 h-6 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                    <p className="font-bold text-base mb-1">¿Está seguro?</p>
                    <ul className="list-disc pl-4 space-y-1 opacity-90 leading-relaxed">
                        {activeModal === 'ADD' && <li>Se agregará stock al inventario general.</li>}
                        {activeModal === 'DELETE' && <li>Se eliminará permanentemente el registro.</li>}
                        {activeModal === 'TRANSFER' && (
                            <li>
                                Mover <b>{formData.quantity}</b> u. de <b>{selectedItem?.subdeposit}</b> a <b>{formData.targetDeposit}</b>.
                            </li>
                        )}
                        {activeModal === 'TRANSFORM' && (
                             <li>
                                Transformar <b>{formData.quantity}</b> u. en <b>{catalog.find(p => p.sku === formData.sku)?.descripcion || catalog.find(p => p.sku === formData.sku)?.titulo}</b>.
                             </li>
                        )}
                        {activeModal === 'EDIT' && <li>Modificación manual de cantidad (Auditoría).</li>}
                    </ul>
                </div>
            </div>
        </div>
      </Modal>

      {/* Add Stock Modal */}
      <Modal 
        isOpen={activeModal === 'ADD' && !showConfirmation} 
        onClose={closeModal} 
        title="Agregar stock"
        description="Seleccione producto y destino."
        footer={
            <>
                <Button variant="outline" onClick={closeModal}>Cancelar</Button>
                <Button onClick={initiateAction}>Siguiente</Button>
            </>
        }
      >
        <div className="space-y-6">
            <Combobox 
                label="Producto"
                options={catalogOptions}
                value={formData.sku}
                onChange={(val) => setFormData({...formData, sku: val})}
                placeholder="Buscar por nombre o SKU..."
            />
            
            <div className="grid grid-cols-2 gap-5">
                <Input 
                    label="Cantidad" 
                    type="number" 
                    min="1"
                    placeholder="0" 
                    value={formData.quantity || ""}
                    onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
                />
                <div className="w-full">
                    <Select 
                        label="Subdepósito"
                        value={formData.subdeposit}
                        onChange={(val) => setFormData({...formData, subdeposit: val as any})}
                        options={[
                            { value: 'DEPOSITO', label: 'DEPOSITO (Planta)' },
                            { value: 'LOGISTICA', label: 'LOGISTICA' }
                        ]}
                    />
                </div>
            </div>
            {validationError && (
                 <div className="text-red-600 text-sm bg-red-50 p-4 rounded-md flex items-center gap-3 border border-red-100 animate-in fade-in slide-in-from-top-1">
                     <AlertCircle className="w-5 h-5"/> {validationError}
                 </div>
            )}
        </div>
      </Modal>

      {/* Transform Modal */}
      <Modal 
        isOpen={activeModal === 'TRANSFORM' && !showConfirmation} 
        onClose={closeModal} 
        title="Transformar prenda"
        footer={
            <>
                <Button variant="outline" onClick={closeModal}>Cancelar</Button>
                <Button onClick={initiateAction}>Transformar</Button>
            </>
        }
      >
        <div className="space-y-6">
            <div className="bg-muted p-5 rounded-lg border border-border flex items-center gap-5">
                <div className="w-12 h-12 bg-card rounded-md border border-border flex items-center justify-center shrink-0 text-muted-foreground shadow-sm">
                    <Package className="w-6 h-6" />
                </div>
                <div>
                    <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Origen</label>
                    <p className="text-base font-bold text-foreground leading-tight">{selectedItem?.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedItem?.sku}</p>
                    <div className="mt-1.5 text-xs font-medium text-muted-foreground bg-card px-2 py-0.5 rounded-md border border-border inline-block">
                        Stock: <span className="font-bold text-foreground">{selectedItem?.quantity}</span>
                    </div>
                </div>
            </div>

            <Combobox 
                label="Producto destino (Nueva prenda)"
                options={catalogOptions.filter(opt => opt.value !== selectedItem?.sku)}
                value={formData.sku}
                onChange={(val) => setFormData({...formData, sku: val})}
                placeholder="Seleccionar en qué se transforma..."
            />
            
            <Input 
                label="Cantidad a transformar" 
                placeholder="0" 
                type="number" 
                min="1"
                value={formData.quantity || ""}
                onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
            />
            
            {validationError && (
                 <div className="text-red-600 text-sm bg-red-50 p-4 rounded-md flex items-center gap-3 border border-red-100">
                     <AlertCircle className="w-5 h-5"/> {validationError}
                 </div>
            )}
        </div>
      </Modal>

      {/* Transfer Modal */}
      <Modal 
        isOpen={activeModal === 'TRANSFER' && !showConfirmation} 
        onClose={closeModal} 
        title="Transferencia interna"
        footer={
            <>
                <Button variant="outline" onClick={closeModal}>Cancelar</Button>
                <Button onClick={initiateAction}>Transferir</Button>
            </>
        }
      >
        <div className="space-y-6">
             <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-lg border border-brand/20 flex justify-between items-center relative overflow-hidden">
                 <div className="relative z-10">
                    <span className="text-[10px] text-brand font-bold uppercase tracking-wider">Origen</span>
                    <p className="text-lg font-bold text-brand">{selectedItem?.subdeposit}</p>
                 </div>
                 <div className="bg-card p-2.5 rounded-full shadow-md z-10 text-brand">
                    <ArrowRightLeft className="w-5 h-5" />
                 </div>
                 <div className="text-right relative z-10">
                    <span className="text-[10px] text-brand font-bold uppercase tracking-wider">Destino</span>
                    <p className="text-lg font-bold text-indigo-900">{formData.targetDeposit}</p>
                 </div>
             </div>

             <div className="w-full">
                <Select 
                    label="Sub-Depósito Destino"
                    value={formData.targetDeposit}
                    onChange={(val) => setFormData({...formData, targetDeposit: val})}
                    options={[
                        ...(selectedItem?.subdeposit !== 'LOGISTICA' ? [{ value: 'LOGISTICA', label: 'LOGISTICA' }] : []),
                        ...(selectedItem?.subdeposit !== 'DEPOSITO' ? [{ value: 'DEPOSITO', label: 'DEPOSITO' }] : [])
                    ]}
                />
             </div>
             
             <div className="relative">
                 <Input 
                    label={`Cantidad (Máx: ${selectedItem?.quantity})`}
                    placeholder="Ingrese cantidad" 
                    type="number"
                    min="1"
                    value={formData.quantity || ""}
                    onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
                 />
             </div>

             {validationError && (
                 <div className="text-red-600 text-sm bg-red-50 p-4 rounded-md flex items-center gap-3 border border-red-100">
                     <AlertCircle className="w-5 h-5"/> {validationError}
                 </div>
            )}
        </div>
      </Modal>

      {/* Edit Modal */}
       <Modal 
        isOpen={activeModal === 'EDIT' && !showConfirmation} 
        onClose={closeModal} 
        title="Ajuste manual de stock"
        footer={
            <>
                <Button variant="outline" onClick={closeModal}>Cancelar</Button>
                <Button onClick={initiateAction}>Guardar Cambios</Button>
            </>
        }
      >
        <div className="space-y-5">
            <p className="text-sm text-muted-foreground bg-muted p-4 rounded-md border border-border">
                Está editando el stock para <b className="text-foreground">{selectedItem?.description}</b>. Esta acción quedará registrada.
            </p>
            <Input 
                label="Nueva Cantidad Total" 
                placeholder="Ingrese cantidad" 
                type="number"
                min="0"
                value={formData.quantity || ""}
                onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
            />
            {validationError && (
                 <div className="text-red-600 text-sm bg-red-50 p-4 rounded-md flex items-center gap-3 border border-red-100">
                     <AlertCircle className="w-5 h-5"/> {validationError}
                 </div>
            )}
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal 
        isOpen={activeModal === 'DELETE' && !showConfirmation} 
        onClose={closeModal} 
        title="Anular SKU"
        footer={
            <>
                <Button variant="outline" onClick={closeModal}>Cancelar</Button>
                <Button variant="destructive" onClick={initiateAction}>Continuar</Button>
            </>
        }
      >
        <div className="flex items-start gap-4 text-muted-foreground bg-red-50 p-6 rounded-lg border border-red-100">
            <div className="bg-red-100 p-2.5 rounded-full shrink-0">
                <AlertTriangle className="text-red-600 w-6 h-6" />
            </div>
            <div>
                <p className="font-bold text-red-900 text-lg">Atención</p>
                <p className="text-sm mt-2 text-red-800/90 leading-relaxed">
                    ¿Está seguro de que desea anular este SKU del inventario? Esta acción es irreversible y eliminará el historial inmediato de este ítem en esta vista.
                </p>
            </div>
        </div>
      </Modal>

    </div>
  );
};
