
import React, { useState, useEffect } from 'react';
import { Search, Filter, ArrowDownToLine, Package, CheckCircle, AlertCircle, Trash2, Truck, RefreshCcw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Injection } from '@/types';
import { RECENT_INJECTIONS } from '../constants';
import { productionService } from '../services/productionService';

export const Inyecciones: React.FC = () => {
  // State
  const [injections, setInjections] = useState<Injection[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
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
    
    return inj.status === 'PENDIENTE' && (
      desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inj.id.toString().includes(searchTerm)
    );
  });

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
    <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-500 bg-slate-50/50 overflow-hidden relative">
      
      {/* Header */}
      <div className="px-4 sm:px-8 py-4 sm:py-6 sticky top-0 z-10 bg-slate-50/80 backdrop-blur-md border-b border-slate-200/60 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Inyecciones</h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5 sm:mt-1">Recepción de procesos externos</p>
          </div>
          
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto items-center">
             <Button
               variant="outline"
               size="icon"
               onClick={fetchInjections}
               disabled={isLoading}
               className="rounded-xl bg-white text-slate-700 border-slate-200 shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-colors h-9 w-9 sm:h-10 sm:w-10"
               title="Actualizar datos"
             >
               <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
             </Button>
             
             <div className="relative flex-1 sm:w-72 group">
               <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
               <Input 
                 placeholder="Buscar..." 
                 className="pl-9 sm:pl-10 h-9 sm:h-10 bg-white shadow-sm border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl text-sm"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
             </div>
             
             <Button variant="outline" className="rounded-xl bg-white shadow-sm border-slate-200 text-slate-700 h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm">
                <Filter className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Filtrar</span>
             </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto px-4 sm:px-8 py-4 sm:py-6 custom-scrollbar pb-32 sm:pb-24">
        {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] sm:min-h-[400px] animate-in fade-in zoom-in-95 duration-500">
                <RefreshCcw className="w-10 h-10 sm:w-12 sm:h-12 mb-4 animate-spin text-blue-500" />
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Cargando inyecciones...</h3>
                <p className="text-slate-500 mt-2 text-center max-w-xs text-sm sm:text-base">Por favor espere mientras actualizamos la información.</p>
            </div>
        ) : filteredInjections.length > 0 ? (
            <div className="space-y-4">
                {/* Desktop Table View */}
                <div className="hidden lg:block bg-white rounded-2xl shadow-xl shadow-slate-200/60 ring-1 ring-slate-900/5 overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">N°</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Artículo</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Subdepósito</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Origen</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Cantidad</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredInjections.map((inj) => (
                                <tr key={inj.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">
                                            {inj.status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-sm font-mono">{inj.id}</td>
                                    <td className="px-6 py-4 font-semibold text-slate-900 text-sm">{inj.client}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-900">{inj.description}</span>
                                            <span className="text-xs text-slate-400 font-mono">{inj.sku}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant={inj.subdeposit === 'DEPOSITO' ? 'default' : 'warning'}>
                                            {inj.subdeposit}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 text-sm">{inj.origin}</td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-900 text-base">{inj.quantity}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => handleRemoveItem(inj.id)}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
                        <div key={inj.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 text-[10px] px-1.5 py-0">
                                            {inj.status}
                                        </Badge>
                                        <span className="text-slate-400 text-[10px] font-mono">#{inj.id}</span>
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-sm">{inj.client}</h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-slate-900">{inj.quantity}</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Unidades</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1 py-2 border-y border-slate-50">
                                <span className="text-xs font-medium text-slate-900">{inj.description}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{inj.sku}</span>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                                <div className="flex gap-2">
                                    <Badge variant={inj.subdeposit === 'DEPOSITO' ? 'default' : 'warning'} className="text-[10px] px-2 py-0.5">
                                        {inj.subdeposit}
                                    </Badge>
                                    <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{inj.origin}</span>
                                </div>
                                <button 
                                    onClick={() => handleRemoveItem(inj.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-slate-100 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-inner animate-in zoom-in-50 duration-500">
                    <div className="w-18 h-18 sm:w-24 sm:h-24 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <ArrowDownToLine className="w-8 h-8 sm:w-10 sm:h-10 text-slate-300" />
                    </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Sin inyecciones</h3>
                <p className="text-slate-500 mt-2 max-w-md text-center text-sm sm:text-base px-4">
                    No se registraron inyecciones en proceso actualmente. Los nuevos ingresos aparecerán aquí automáticamente.
                </p>
                <Button variant="outline" className="mt-6 sm:mt-8" onClick={() => setInjections(RECENT_INJECTIONS)}>
                    Simular Carga (Demo)
                </Button>
            </div>
        )}
      </div>

      {/* Bottom Actions Bar - Sticky Footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 sm:p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
         <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
             
             {/* Totals */}
             <div className="flex items-center gap-2 sm:gap-6 w-full sm:w-auto justify-between sm:justify-start overflow-x-auto no-scrollbar">
                 <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 flex flex-col min-w-[80px] sm:min-w-0">
                     <span className="text-[8px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total</span>
                     <span className="text-base sm:text-xl font-bold text-slate-900 leading-none mt-0.5 sm:mt-1">{totalQuantity}</span>
                 </div>
                 
                 <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

                 <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 flex flex-col min-w-[80px] sm:min-w-0">
                     <span className="text-[8px] sm:text-[10px] uppercase font-bold text-amber-600/70 tracking-wider">Logística</span>
                     <span className="text-sm sm:text-lg font-bold text-amber-700 leading-none mt-0.5 sm:mt-1">{totalLogistica}</span>
                 </div>

                 <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 flex flex-col min-w-[80px] sm:min-w-0">
                     <span className="text-[8px] sm:text-[10px] uppercase font-bold text-blue-600/70 tracking-wider">Planta</span>
                     <span className="text-sm sm:text-lg font-bold text-blue-700 leading-none mt-0.5 sm:mt-1">{totalPlanta}</span>
                 </div>
             </div>

             {/* Action Button */}
             <div className="w-full sm:w-auto">
                 <Button 
                    className="w-full sm:w-auto h-10 sm:h-12 px-6 sm:px-8 text-sm sm:text-base shadow-xl shadow-blue-900/10" 
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
        <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="bg-white p-2.5 rounded-full border border-slate-200 shadow-sm shrink-0">
                <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
                <h4 className="font-bold text-slate-900">Resumen de Inyección</h4>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Está a punto de ingresar <b>{totalQuantity} unidades</b> al stock activo.
                </p>
                <ul className="mt-3 space-y-1 text-sm text-slate-500">
                    <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        <b>{totalLogistica}</b> un. a Logística
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        <b>{totalPlanta}</b> un. a Depósito Planta
                    </li>
                </ul>
                <p className="text-xs text-slate-400 mt-3 border-t border-slate-200 pt-2">
                    Esta acción actualizará el inventario y marcará estas inyecciones como procesadas.
                </p>
            </div>
        </div>
      </Modal>

    </div>
  );
};
