
import React, { useState, useEffect } from 'react';
import { Search, Filter, X, ArrowDownToLine, Package, CheckCircle, AlertCircle, Trash2, Truck, RefreshCcw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { MultiSelect } from '../components/ui/MultiSelect';
import { Injection } from '@/types';
import { RECENT_INJECTIONS } from '../constants';
import { productionService } from '../services/productionService';
import { Loader } from '../components/ui/Loader';
import { PageHeader } from '../components/ui/PageHeader';
import { capitalizeFirst } from '../utils/text';

export const Inyecciones: React.FC = () => {
  // State
  const [injections, setInjections] = useState<Injection[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  // The "Filtrar" button used to have no onClick at all — a control that looked
  // live and did nothing. Empty arrays mean "no filter" (same as every other page).
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{ subdeposit: string[]; client: string[] }>({ subdeposit: [], client: [] });
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const fetchInjections = async () => {
    setIsLoading(true);
    try {
      const [pendientes, detalles] = await Promise.all([
        productionService.getInyeccionesPendientes(),
        productionService.getDetalleInyecciones()
      ]);

      const mappedInjections: Injection[] = [];

      detalles.forEach(detalle => {
        const header = pendientes.find(p => p.idUnivoco === detalle.idUnivoco);
        if (header) {
          mappedInjections.push({
            id: parseInt(detalle.id),
            timestamp: `${detalle.fecha}T${detalle.hora}`,
            client: header.cliente,
            sku: detalle.sku,
            description: detalle.articulo,
            subdeposit: detalle.subdeposito as 'DEPOSITO' | 'LOGISTICA',
            origin: detalle.origen,
            quantity: parseFloat(detalle.cantidad),
            status: detalle.status as 'PENDIENTE' | 'PROCESADO'
          });
        }
      });

      setInjections(mappedInjections);
    } catch (error) {
      console.error("Error fetching injections:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInjections();
  }, []);

  // Derived State
  const filteredInjections = injections.filter(inj => {
    const desc = inj.description || '';
    const client = inj.client || '';
    const sku = inj.sku || '';
    
    const matchesSearch =
      desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inj.id.toString().includes(searchTerm);

    const matchesSubdeposit = filters.subdeposit.length === 0 || filters.subdeposit.includes(inj.subdeposit);
    const matchesClient = filters.client.length === 0 || filters.client.includes(client);

    return inj.status === 'PENDIENTE' && matchesSearch && matchesSubdeposit && matchesClient;
  });

  const clientOptions = Array.from(new Set(injections.map(i => i.client).filter(Boolean)))
    .sort()
    .map(c => ({ value: c as string, label: c as string }));

  const activeFiltersCount = filters.subdeposit.length + filters.client.length;

  const totalQuantity = filteredInjections.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalLogistica = filteredInjections.filter(i => i.subdeposit === 'LOGISTICA').reduce((acc, curr) => acc + curr.quantity, 0);
  const totalPlanta = filteredInjections.filter(i => i.subdeposit === 'DEPOSITO').reduce((acc, curr) => acc + curr.quantity, 0);

  // Handlers
  const handleDeliver = () => {
    setIsProcessing(true);
    // Simulate API call
    setTimeout(() => {
        // In a real app, this would update the backend and likely clear this list or move them to history
        setInjections([]); 
        setIsProcessing(false);
        setShowDeliveryModal(false);
    }, 1500);
  };

  const handleRemoveItem = (id: number) => {
    // This is just for local UI management if needed, though usually these are read-only syncs
    setInjections(injections.filter(i => i.id !== id));
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-500 bg-muted/50 overflow-hidden relative">
      
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-muted px-4 py-4 sm:px-8">
        <PageHeader
          title="Inyecciones"
          subtitle="Recepción de procesos externos"
          actions={
          
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto items-center">
             <Button
               variant="outline"
               size="icon"
               onClick={fetchInjections}
               disabled={isLoading}
               className="rounded-md bg-card text-foreground border-border shadow-sm hover:bg-accent hover:text-brand transition-colors h-9 w-9 sm:h-10 sm:w-10"
               title="Actualizar datos"
             >
               <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand' : ''}`} />
             </Button>
             
             <div className="relative flex-1 sm:w-72 group">
               <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-brand transition-colors" />
               <Input 
                 placeholder="Buscar..." 
                 className="pl-9 sm:pl-10 h-9 sm:h-10 bg-card shadow-sm border-border focus:border-primary focus:ring-ring/20 rounded-md text-sm"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
             </div>
             
             <div className="relative shrink-0">
               <Button
                 variant={activeFiltersCount > 0 ? 'secondary' : 'outline'}
                 className={`rounded-md shadow-sm h-9 sm:h-10 px-3 sm:px-4 ${activeFiltersCount > 0 ? 'bg-brand/10 text-brand border-brand/20' : 'bg-card border-border text-foreground'}`}
                 onClick={() => setShowFilters(!showFilters)}
               >
                  <Filter className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{activeFiltersCount > 0 ? `Filtros (${activeFiltersCount})` : 'Filtrar'}</span>
                  <span className="sm:hidden">{activeFiltersCount > 0 ? activeFiltersCount : ''}</span>
               </Button>

               {showFilters && (
                 <>
                   <div className="fixed inset-0 z-30" onClick={() => setShowFilters(false)} />
                   <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-card rounded-lg shadow-sm ring-1 ring-border z-40 p-5">
                     <div className="flex items-center justify-between mb-5">
                       <h3 className="font-bold text-foreground">Configurar Filtros</h3>
                       <button onClick={() => setShowFilters(false)} aria-label="Cerrar filtros" className="text-muted-foreground hover:text-foreground">
                         <X className="w-4 h-4" />
                       </button>
                     </div>
                     <div className="space-y-4">
                       <MultiSelect
                         label="Subdepósito"
                         placeholder="Todos"
                         value={filters.subdeposit}
                         onChange={val => setFilters(prev => ({ ...prev, subdeposit: val }))}
                         options={[
                           { value: 'DEPOSITO', label: 'Depósito Planta' },
                           { value: 'LOGISTICA', label: 'Logística' },
                         ]}
                       />
                       <MultiSelect
                         label="Cliente"
                         placeholder="Todos"
                         value={filters.client}
                         onChange={val => setFilters(prev => ({ ...prev, client: val }))}
                         options={clientOptions}
                       />
                     </div>
                     {activeFiltersCount > 0 && (
                       <div className="pt-4 border-t border-border mt-4 flex justify-end">
                         <button
                           className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
                           onClick={() => setFilters({ subdeposit: [], client: [] })}
                         >
                           Limpiar filtros
                         </button>
                       </div>
                     )}
                   </div>
                 </>
               )}
             </div>
          </div>
          }
        />
      </div>

      {/* Content Area */}
      <div className="flex min-h-0 flex-1 flex-col px-4 sm:px-8 pb-4 pt-5 md:overflow-hidden overflow-y-auto">
        {isLoading ? (
            <div className="flex h-full min-h-[400px] items-center justify-center">
            <Loader text="Cargando inyecciones…" />
          </div>
        ) : filteredInjections.length > 0 ? (
            <div className="space-y-4">
                {/* Desktop Table View */}
                <div className="hidden lg:block bg-muted rounded-lg shadow-sm ring-1 ring-ring/5 overflow-auto">
                    <table className="w-full table-fixed min-w-[1120px] text-left text-[13px]">
                        <thead className="sticky top-0 z-20 bg-muted border-b border-border">
                            <tr className="border-b border-border bg-muted/50">
                                <th className="h-12 w-36 px-4 text-left text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Status</th>
                                <th className="h-12 w-24 px-4 text-left text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">N°</th>
                                <th className="h-12 w-48 px-4 text-left text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Cliente</th>
                                <th className="h-12 px-4 text-left text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Artículo</th>
                                <th className="h-12 w-40 px-4 text-left text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Subdepósito</th>
                                <th className="h-12 w-40 px-4 text-left text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Origen</th>
                                <th className="h-12 w-32 px-4 text-right text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Cantidad</th>
                                <th className="h-12 w-32 px-4 text-right text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card [&_tr]:transition-colors [&_tr:hover]:bg-muted/40">
                            {filteredInjections.map((inj) => (
                                <tr key={inj.id} className="hover:bg-brand/10/30 transition-colors group">
                                    <td className="h-16 px-4 py-3">
                                        <Badge variant="secondary" className="bg-brand/10 text-brand border-brand/20">
                                            {inj.status}
                                        </Badge>
                                    </td>
                                    <td className="h-16 px-4 py-3 truncate text-muted-foreground">{inj.id}</td>
                                    <td className="h-16 px-4 py-3 truncate font-semibold text-foreground" title={inj.client}>{inj.client}</td>
                                    <td className="h-16 px-4 py-3">
                                        <div className="flex min-w-0 flex-col">
                                            <span className="truncate text-sm font-medium text-foreground" title={capitalizeFirst(inj.description)}>{capitalizeFirst(inj.description)}</span>
                                            <span className="truncate text-xs text-muted-foreground">{inj.sku}</span>
                                        </div>
                                    </td>
                                    <td className="h-16 px-4 py-3">
                                        <Badge variant={inj.subdeposit === 'DEPOSITO' ? 'default' : 'warning'}>
                                            {inj.subdeposit}
                                        </Badge>
                                    </td>
                                    <td className="h-16 px-4 py-3 truncate text-muted-foreground">{inj.origin}</td>
                                    <td className="h-16 px-4 py-3 text-right font-bold text-foreground tabular-nums">{inj.quantity}</td>
                                    <td className="h-16 px-4 py-3 text-right">
                                        <button 
                                            onClick={() => handleRemoveItem(inj.id)}
                                            className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Eliminar de la lista"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile/Tablet Card View */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
                    {filteredInjections.map((inj) => (
                        <div key={inj.id} className="bg-card rounded-lg p-4 shadow-sm border border-border flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="bg-brand/10 text-brand border-brand/20 text-[10px] px-1.5 py-0">
                                            {inj.status}
                                        </Badge>
                                        <span className="text-muted-foreground text-[10px]">#{inj.id}</span>
                                    </div>
                                    <h3 className="font-bold text-foreground text-sm">{inj.client}</h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-foreground">{inj.quantity}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Unidades</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1 py-2 border-y border-border">
                                <span className="text-xs font-medium text-foreground">{capitalizeFirst(inj.description)}</span>
                                <span className="text-[10px] text-muted-foreground">{inj.sku}</span>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                                <div className="flex gap-2">
                                    <Badge variant={inj.subdeposit === 'DEPOSITO' ? 'default' : 'warning'} className="text-[10px] px-2 py-0.5">
                                        {inj.subdeposit}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">{inj.origin}</span>
                                </div>
                                <button 
                                    onClick={() => handleRemoveItem(inj.id)}
                                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ) : (
            <div className="h-full flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px]">
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-muted rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-inner animate-in zoom-in-50 duration-500">
                    <div className="w-18 h-18 sm:w-24 sm:h-24 bg-card rounded-full flex items-center justify-center shadow-sm">
                        <ArrowDownToLine className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
                    </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Sin inyecciones</h3>
                <p className="text-muted-foreground mt-2 max-w-md text-center text-sm sm:text-base px-4">
                    No se registraron inyecciones en proceso actualmente. Los nuevos ingresos aparecerán aquí automáticamente.
                </p>
                <Button variant="outline" className="mt-6 sm:mt-8" onClick={() => setInjections(RECENT_INJECTIONS)}>
                    Simular Carga (Demo)
                </Button>
            </div>
        )}
      </div>

      {/* Bottom Actions Bar - Sticky Footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-card border-t border-border p-3 sm:p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
         <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
             
             {/* Totals */}
             <div className="flex items-center gap-2 sm:gap-6 w-full sm:w-auto justify-between sm:justify-start overflow-x-auto no-scrollbar">
                 <div className="bg-muted border border-border rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 flex flex-col min-w-[80px] sm:min-w-0">
                     <span className="text-[8px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total</span>
                     <span className="text-base sm:text-xl font-bold text-foreground leading-none mt-0.5 sm:mt-1">{totalQuantity}</span>
                 </div>
                 
                 <div className="h-8 w-px bg-muted hidden sm:block"></div>

                 <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 flex flex-col min-w-[80px] sm:min-w-0">
                     <span className="text-[8px] sm:text-[10px] uppercase font-bold text-amber-600/70 tracking-wider">Logística</span>
                     <span className="text-sm sm:text-lg font-bold text-amber-700 leading-none mt-0.5 sm:mt-1">{totalLogistica}</span>
                 </div>

                 <div className="bg-brand/10 border border-brand/20 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 flex flex-col min-w-[80px] sm:min-w-0">
                     <span className="text-[8px] sm:text-[10px] uppercase font-bold text-brand/70 tracking-wider">Planta</span>
                     <span className="text-sm sm:text-lg font-bold text-brand leading-none mt-0.5 sm:mt-1">{totalPlanta}</span>
                 </div>
             </div>

             {/* Action Button */}
             <div className="w-full sm:w-auto">
                 <Button 
                    className="w-full sm:w-auto h-10 sm:h-12 px-6 sm:px-8 text-sm sm:text-base shadow-sm" 
                    disabled={filteredInjections.length === 0}
                    onClick={() => setShowDeliveryModal(true)}
                 >
                    <Truck className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Entregar ({totalQuantity})
                 </Button>
             </div>
         </div>
      </div>

      {/* Delivery Confirmation Modal */}
      <Modal
        isOpen={showDeliveryModal}
        onClose={() => setShowDeliveryModal(false)}
        title="Confirmar Entrega"
        footer={
            <>
                <Button variant="outline" onClick={() => setShowDeliveryModal(false)}>Cancelar</Button>
                <Button onClick={handleDeliver} isLoading={isProcessing}>Confirmar e Ingresar</Button>
            </>
        }
      >
        <div className="flex items-start gap-4 p-4 bg-muted rounded-md border border-border">
            <div className="bg-card p-2.5 rounded-full border border-border shadow-sm shrink-0">
                <Package className="w-6 h-6 text-brand" />
            </div>
            <div>
                <h4 className="font-bold text-foreground">Resumen de Inyección</h4>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    Está a punto de ingresar <b>{totalQuantity} unidades</b> al stock activo.
                </p>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        <b>{totalLogistica}</b> un. a Logística
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        <b>{totalPlanta}</b> un. a Depósito Planta
                    </li>
                </ul>
                <p className="text-xs text-muted-foreground mt-3 border-t border-border pt-2">
                    Esta acción actualizará el inventario y marcará estas inyecciones como procesadas.
                </p>
            </div>
        </div>
      </Modal>

    </div>
  );
};
