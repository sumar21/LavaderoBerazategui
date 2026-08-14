
import React, { useEffect, useState } from 'react';
import { 
    Shirt, 
    TrendingUp, 
    AlertTriangle, 
    Clock, 
    ArrowRight, 
    Package,
    Activity,
    Truck,
    ShoppingCart,
    Droplets
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { stockService } from '../services/stockService';
import { purchaseService } from '../services/purchaseService';
import { productionService } from '../services/productionService';
import { MovimientoStock, InyeccionPendiente } from '@/types';

interface HomeProps {
    onViewChange?: (view: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onViewChange }) => {
  const [totalStock, setTotalStock] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [recentInjections, setRecentInjections] = useState<InyeccionPendiente[]>([]);
  const [injectionsActive, setInjectionsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch data with individual error handling to prevent one failure from breaking the entire page
        const stockPromise = stockService.getStock().catch(err => {
            console.error("Failed to fetch stock:", err);
            return [];
        });
        
        const ordersPromise = purchaseService.getOrdenesCompra().catch(err => {
            console.error("Failed to fetch orders:", err);
            return [];
        });
        
        const injectionsPromise = productionService.getInyeccionesPendientes().catch(err => {
            console.error("Failed to fetch injections:", err);
            return [];
        });

        const [stock, orders, injections] = await Promise.all([
          stockPromise,
          ordersPromise,
          injectionsPromise
        ]);

        // Process Stock
        const activeStock = stock.filter(i => i.status === 'Activo' || i.Status === 'Activo');
        const calculatedTotalStock = activeStock.reduce((acc, item) => {
            const qty = parseFloat(item.stockFinal || item.StockFinal || '0');
            return acc + (isNaN(qty) ? 0 : qty);
        }, 0);
        setTotalStock(calculatedTotalStock);

        const calculatedLowStock = activeStock.filter(i => {
            const qty = parseFloat(i.stockFinal || i.StockFinal || '0');
            return !isNaN(qty) && qty < 50;
        }).length;
        setLowStockCount(calculatedLowStock);

        // Process Orders
        const pending = orders.filter(o => {
            const status = o.Status || o.status;
            return status === 'Pendiente' || status === 'Pendiente Aprobacion';
        }).length;
        setPendingOrdersCount(pending);

        // Process Injections
        setRecentInjections(injections.slice(0, 5));
        setInjectionsActive(injections.length > 0);

      } catch (error) {
        console.error("Error fetching home data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const timeAgo = (dateStr: string, timeStr: string) => {
    if (!dateStr) return '';
    try {
        // Try to parse DD/MM/YYYY
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const [day, month, year] = parts.map(Number);
            const now = new Date();
            const date = new Date(year, month - 1, day);
            
            if (timeStr) {
                const [hours, minutes] = timeStr.split(':').map(Number);
                date.setHours(hours || 0, minutes || 0);
            }

            const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
            
            if (diffInHours < 1) return 'Hace momentos';
            if (diffInHours < 24) return `Hace ${diffInHours}h`;
            return `Hace ${Math.floor(diffInHours / 24)}d`;
        }
        return dateStr;
    } catch (e) {
        return dateStr;
    }
  };

  return (
    <div className="h-full flex flex-col p-3 sm:p-6 space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1800px] mx-auto overflow-y-auto md:overflow-hidden bg-slate-50">
      
      {/* 1. Header (Compact) */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end shrink-0 gap-2">
        <div>
           <div className="inline-flex items-center gap-2 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white border border-slate-200 shadow-sm mb-1 sm:mb-2">
                <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isLoading ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`}></span>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 tracking-wide uppercase">
                    {isLoading ? 'Cargando...' : 'Sistema Operativo'}
                </span>
           </div>
           <h1 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-none">
             Panel de Control
           </h1>
        </div>
      </div>

      {/* 2. KPI Cards (Bento Grid Top) - Fixed Height */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 shrink-0">
          {/* Stock KPI */}
          <div 
            onClick={() => onViewChange?.('stock')}
            className="group relative bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all cursor-pointer overflow-hidden"
          >
              <div className="absolute top-0 right-0 p-3 sm:p-5 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                  <Shirt className="w-10 sm:w-20 h-10 sm:h-20 text-blue-600" />
              </div>
              <div className="flex flex-col h-full justify-between relative z-10">
                  <div className="p-1.5 bg-blue-50 w-fit rounded-lg sm:rounded-xl mb-1.5 sm:mb-3">
                      <Shirt className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                  <div>
                      <p className="text-[9px] sm:text-xs font-bold text-slate-500 uppercase tracking-wide">Stock Total</p>
                      <h3 className="text-base sm:text-2xl font-bold text-slate-900">
                        {isLoading ? '...' : totalStock.toLocaleString()} <span className="text-[9px] sm:text-xs font-medium text-slate-400">un.</span>
                      </h3>
                  </div>
              </div>
          </div>

          {/* Low Stock Warning */}
          <div 
            onClick={() => onViewChange?.('stock')}
            className="group relative bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all cursor-pointer overflow-hidden"
          >
               <div className="absolute top-0 right-0 p-3 sm:p-5 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                  <AlertTriangle className="w-10 sm:w-20 h-10 sm:h-20 text-amber-600" />
              </div>
              <div className="flex flex-col h-full justify-between relative z-10">
                  <div className="p-1.5 bg-amber-50 w-fit rounded-lg sm:rounded-xl mb-1.5 sm:mb-3">
                      <AlertTriangle className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-amber-600" />
                  </div>
                  <div>
                      <p className="text-[9px] sm:text-xs font-bold text-slate-500 uppercase tracking-wide">Alerta Stock</p>
                      <h3 className="text-base sm:text-2xl font-bold text-slate-900">
                        {isLoading ? '...' : lowStockCount} <span className="text-[9px] sm:text-xs font-medium text-slate-400">ítems</span>
                      </h3>
                  </div>
              </div>
          </div>

          {/* Pending Orders */}
          <div 
             onClick={() => onViewChange?.('aprobaciones')}
             className="group relative bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all cursor-pointer overflow-hidden"
          >
               <div className="absolute top-0 right-0 p-3 sm:p-5 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                  <Clock className="w-10 sm:w-20 h-10 sm:h-20 text-purple-600" />
              </div>
              <div className="flex flex-col h-full justify-between relative z-10">
                  <div className="p-1.5 bg-purple-50 w-fit rounded-lg sm:rounded-xl mb-1.5 sm:mb-3">
                      <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-purple-600" />
                  </div>
                  <div>
                      <p className="text-[9px] sm:text-xs font-bold text-slate-500 uppercase tracking-wide">Aprobaciones</p>
                      <h3 className="text-base sm:text-2xl font-bold text-slate-900">
                        {isLoading ? '...' : pendingOrdersCount} <span className="text-[9px] sm:text-xs font-medium text-slate-400">pend.</span>
                      </h3>
                  </div>
              </div>
          </div>
          

      </div>

      {/* 3. Main Content Grid - Flexible Height */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 flex-1 min-h-0">
        
        {/* Actions (Fixed List) */}
        <div className="flex flex-col gap-3 sm:gap-4 h-full overflow-y-auto custom-scrollbar pb-4">
            <h3 className="text-[10px] sm:text-sm font-bold text-slate-500 uppercase tracking-widest px-1">Accesos Rápidos</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
                <button 
                    onClick={() => onViewChange?.('stock')}
                    className="flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.05)] hover:border-blue-200 transition-all group text-left"
                >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Cargar Stock</h4>
                        <p className="text-[9px] sm:text-[10px] text-slate-500">Nuevo ingreso</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </button>

                <button 
                    onClick={() => onViewChange?.('compras')}
                    className="flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.05)] hover:border-indigo-200 transition-all group text-left"
                >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Nueva Compra</h4>
                        <p className="text-[9px] sm:text-[10px] text-slate-500">Crear orden</p>
                    </div>
                     <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};
