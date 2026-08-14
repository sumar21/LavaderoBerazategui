
import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, RefreshCcw, ArrowRightLeft, Edit, Trash2, AlertTriangle, AlertCircle, X, Package, LayoutGrid, List } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Combobox } from '../components/ui/Combobox';
import { Select } from '../components/ui/Select';
import { StockItem, ModalType, StockPayload, ArticuloAPI } from '@/types';
import { stockService } from '../services/stockService';
import { configService } from '../services/configService';
import { notify } from '../components/ui/Notice';

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
  const [filters, setFilters] = useState({
    subdeposit: 'ALL',
    sku: 'ALL'
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
    
    const matchesSubdeposit = filters.subdeposit === 'ALL' || item.subdeposit === filters.subdeposit;
    const matchesSku = filters.sku === 'ALL' || item.sku === filters.sku;

    return matchesSearch && matchesSubdeposit && matchesSku;
  });

  const totalQty = stock.reduce((acc, item) => acc + item.quantity, 0);
  const logisticsQty = stock.filter(i => i.subdeposit === 'LOGISTICA').reduce((acc, item) => acc + item.quantity, 0);
  const plantQty = stock.filter(i => i.subdeposit === 'DEPOSITO').reduce((acc, item) => acc + item.quantity, 0);
  
  const activeFiltersCount = (filters.subdeposit !== 'ALL' ? 1 : 0) + (filters.sku !== 'ALL' ? 1 : 0);

  return (
    <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-500 overflow-y-auto md:overflow-hidden bg-slate-50">
      
      {/* Header Area */}
      <div className="px-4 sm:px-8 py-4 sm:py-6 sticky top-0 z-20 shrink-0 bg-slate-50/80 backdrop-blur-md border-b border-slate-200/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
             <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Stock Online</h2>
             <div className="flex items-center gap-2 mt-1">
                 <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                 <p className="text-slate-500 text-xs sm:text-sm font-medium">Actualizado en tiempo real</p>
             </div>
          </div>
          
          <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3 w-full lg:w-auto items-center">
             <Button
               variant="outline"
               size="icon"
               onClick={fetchData}
               disabled={isLoading}
               className="rounded-full bg-white text-slate-700 border-slate-200 shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-colors shrink-0"
               title="Actualizar datos"
             >
               <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
             </Button>
             
             <div className="relative flex-1 sm:w-80 group">
               <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
               <input 
                 placeholder="Buscar..." 
                 className="w-full pl-10 h-10 rounded-full bg-white shadow-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
             </div>
             
             <div className="relative">
                <Button 
                    variant={activeFiltersCount > 0 ? "secondary" : "outline"} 
                    className={`h-10 rounded-full px-4 ${activeFiltersCount > 0 ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-white text-slate-700 border-slate-200 shadow-sm"}`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Filter className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">{activeFiltersCount > 0 ? `Filtros (${activeFiltersCount})` : 'Filtrar'}</span>
                    <span className="sm:hidden">{activeFiltersCount > 0 ? activeFiltersCount : ''}</span>
                </Button>

                {showFilters && (
                    <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowFilters(false)} />
                    <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl shadow-slate-300/50 ring-1 ring-slate-100 z-40 p-5 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-bold text-slate-900">Configurar Filtros</h3>
                            <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <Combobox
                                label="Subdepósito"
                                placeholder="Todos"
                                value={filters.subdeposit}
                                onChange={(val) => setFilters(prev => ({...prev, subdeposit: val}))}
                                options={[
                                    { value: 'ALL', label: 'Todos los depósitos' },
                                    { value: 'DEPOSITO', label: 'Depósito Planta' },
                                    { value: 'LOGISTICA', label: 'Logística' }
                                ]}
                            />
                            <Combobox
                                label="Artículo"
                                placeholder="Todos"
                                value={filters.sku}
                                onChange={(val) => setFilters(prev => ({...prev, sku: val}))}
                                options={[
                                    { value: 'ALL', label: 'Todos los productos' },
                                    ...catalogOptions
                                ]}
                            />
                        </div>
                        {(activeFiltersCount > 0) && (
                            <div className="pt-4 border-t border-slate-100 mt-4 flex justify-end">
                                <button 
                                    className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors flex items-center gap-1"
                                    onClick={() => {
                                        setFilters({ subdeposit: 'ALL', sku: 'ALL' });
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
                variant="primary" 
                className="w-full sm:w-auto h-10 rounded-full px-5 shadow-lg shadow-blue-900/20 hover:shadow-blue-900/30 bg-blue-600 text-white" 
                onClick={() => handleOpenModal('ADD')}
             >
              <Plus className="w-4 h-4 mr-2" />
              Ingresar
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-24 pt-2 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] animate-in fade-in zoom-in-95 duration-500">
             <RefreshCcw className="w-12 h-12 mb-4 animate-spin text-blue-500" />
             <h3 className="text-xl font-bold text-slate-900 tracking-tight">Cargando stock...</h3>
             <p className="text-slate-500 mt-2 text-center max-w-xs">Por favor espere mientras actualizamos la información.</p>
          </div>
        ) : filteredStock.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] animate-in fade-in zoom-in-95 duration-500">
             <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm ring-1 ring-slate-100">
                 <Search className="w-10 h-10 text-slate-400" />
             </div>
             <h3 className="text-xl font-bold text-slate-900 tracking-tight">Sin resultados</h3>
             <p className="text-slate-500 mt-2 text-center max-w-xs">No encontramos productos que coincidan con tu búsqueda.</p>
             {activeFiltersCount > 0 ? (
                 <Button variant="ghost" className="mt-6 text-blue-600 hover:bg-blue-50" onClick={() => setFilters({subdeposit: 'ALL', sku: 'ALL'})}>
                     Limpiar filtros
                 </Button>
             ) : (
                 <Button variant="primary" className="mt-6 rounded-xl shadow-lg shadow-blue-900/20" onClick={() => handleOpenModal('ADD')}>
                   <Plus className="w-4 h-4 mr-2" />
                   Ingresar Producto
                 </Button>
             )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block glass-panel rounded-3xl overflow-hidden min-h-[500px] shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 border-b border-white/50 sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Producto</th>
                    <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Ubicación</th>
                    <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Cantidad</th>
                    <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {filteredStock.map((item) => (
                    <tr key={item.id} className="hover:bg-white/60 transition-colors group">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors">
                            <Package className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="block font-bold text-slate-900 text-sm">{item.description}</span>
                            <span className="block font-mono text-[10px] text-slate-400 mt-0.5 bg-slate-100 px-1.5 rounded w-fit">{item.sku}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <Badge 
                            variant={item.subdeposit === 'DEPOSITO' ? 'default' : 'warning'}
                            className="shadow-sm border-0 py-1 px-3 rounded-full font-medium"
                        >
                          {item.subdeposit}
                        </Badge>
                      </td>
                      <td className="px-8 py-4 text-right">
                         <div className="flex flex-col items-end">
                            <span className={`text-base font-bold tabular-nums tracking-tight ${item.quantity < 50 ? 'text-amber-600' : 'text-slate-800'}`}>
                                {item.quantity} un.
                            </span>
                            {item.quantity < 50 && <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">Bajo Stock</span>}
                         </div>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                          <button 
                            onClick={() => handleOpenModal('TRANSFORM', item)}
                            title="Transformar"
                            className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          >
                            <RefreshCcw className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleOpenModal('TRANSFER', item)}
                            title="Transferir"
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleOpenModal('EDIT', item)}
                            title="Editar"
                            className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                             onClick={() => handleOpenModal('DELETE', item)}
                             title="Eliminar"
                             className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {filteredStock.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm truncate">{item.description}</h4>
                      <span className="inline-block font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 rounded mt-1">{item.sku}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-sm font-bold ${item.quantity < 50 ? 'text-amber-600' : 'text-slate-800'}`}>
                        {item.quantity} un.
                      </div>
                      {item.quantity < 50 && <span className="text-[9px] font-bold text-amber-500 uppercase">Bajo Stock</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2 border-y border-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ubicación</span>
                    <Badge 
                        variant={item.subdeposit === 'DEPOSITO' ? 'default' : 'warning'}
                        className="shadow-sm border-0 py-0.5 px-2.5 rounded-full text-[10px]"
                    >
                      {item.subdeposit}
                    </Badge>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 rounded-xl text-xs gap-2 min-w-[100px] border-purple-100 text-purple-600 bg-purple-50/50"
                      onClick={() => handleOpenModal('TRANSFORM', item)}
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                      Transformar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 rounded-xl text-xs gap-2 min-w-[100px] border-blue-100 text-blue-600 bg-blue-50/50"
                      onClick={() => handleOpenModal('TRANSFER', item)}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      Transferir
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-xl text-xs px-3 border-orange-100 text-orange-600 bg-orange-50/50"
                      onClick={() => handleOpenModal('EDIT', item)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-xl text-xs px-3 border-red-100 text-red-600 bg-red-50/50"
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

      {/* Floating Modern Footer Stats */}
      <div className="fixed md:absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-xl border border-white/40 p-1.5 pr-4 rounded-full shadow-2xl shadow-slate-400/20 flex items-center gap-4 sm:gap-6 z-30 max-w-[90vw]">
        <div className="bg-slate-900 text-white px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold shadow-md shrink-0">
            Total: {totalQty}
        </div>
        <div className="flex gap-3 sm:gap-4 text-[10px] sm:text-xs font-medium text-slate-600 overflow-hidden">
            <div className="flex items-center gap-1.5 shrink-0">
               <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
               <span className="hidden xs:inline">Logística:</span> <b className="text-slate-900">{logisticsQty}</b>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
               <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
               <span className="hidden xs:inline">Planta:</span> <b className="text-slate-900">{plantQty}</b>
            </div>
        </div>
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
            <div className="flex items-start gap-4 bg-amber-50 p-5 rounded-2xl border border-amber-100">
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
                    value={formData.quantity}
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
                 <div className="text-red-600 text-sm bg-red-50 p-4 rounded-xl flex items-center gap-3 border border-red-100 animate-in fade-in slide-in-from-top-1">
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
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center gap-5">
                <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center shrink-0 text-slate-400 shadow-sm">
                    <Package className="w-6 h-6" />
                </div>
                <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Origen</label>
                    <p className="text-base font-bold text-slate-900 leading-tight">{selectedItem?.description}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedItem?.sku}</p>
                    <div className="mt-1.5 text-xs font-medium text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-100 inline-block">
                        Stock: <span className="font-bold text-slate-900">{selectedItem?.quantity}</span>
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
                value={formData.quantity}
                onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
            />
            
            {validationError && (
                 <div className="text-red-600 text-sm bg-red-50 p-4 rounded-xl flex items-center gap-3 border border-red-100">
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
             <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-2xl border border-blue-100 flex justify-between items-center relative overflow-hidden">
                 <div className="relative z-10">
                    <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Origen</span>
                    <p className="text-lg font-bold text-blue-900">{selectedItem?.subdeposit}</p>
                 </div>
                 <div className="bg-white p-2.5 rounded-full shadow-md z-10 text-blue-600">
                    <ArrowRightLeft className="w-5 h-5" />
                 </div>
                 <div className="text-right relative z-10">
                    <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Destino</span>
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
                    value={formData.quantity}
                    onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
                 />
             </div>

             {validationError && (
                 <div className="text-red-600 text-sm bg-red-50 p-4 rounded-xl flex items-center gap-3 border border-red-100">
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
            <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100">
                Está editando el stock para <b className="text-slate-900">{selectedItem?.description}</b>. Esta acción quedará registrada.
            </p>
            <Input 
                label="Nueva Cantidad Total" 
                placeholder="Ingrese cantidad" 
                type="number"
                min="0"
                value={formData.quantity}
                onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
            />
            {validationError && (
                 <div className="text-red-600 text-sm bg-red-50 p-4 rounded-xl flex items-center gap-3 border border-red-100">
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
                <Button variant="danger" onClick={initiateAction}>Continuar</Button>
            </>
        }
      >
        <div className="flex items-start gap-4 text-slate-600 bg-red-50 p-6 rounded-2xl border border-red-100">
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
