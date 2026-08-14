
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { StockOnline } from './pages/StockOnline';
import { Compras } from './pages/Compras';
import { Aprobaciones } from './pages/Aprobaciones';
import { Configuracion } from './pages/Configuracion';
import { Inyecciones } from './pages/Inyecciones'; 
import { Modal } from './components/ui/Modal';
import { Button } from './components/ui/Button';
import { PurchaseOrder } from '@/types';
import { permissionsService } from './services/permissions';
import { AlertTriangle, Construction } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Legacy cleanup
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');

    const token = sessionStorage.getItem('auth_token');
    const timestamp = sessionStorage.getItem('login_timestamp');
    
    if (!token || !timestamp) return false;
    
    const now = Date.now();
    const loginTime = parseInt(timestamp, 10);
    const sevenHours = 7 * 60 * 60 * 1000;
    
    return (now - loginTime) < sevenHours;
  });
  const [currentView, setCurrentView] = useState('home');
  const [allowedModules, setAllowedModules] = useState<string[]>([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [sessionExpired, setSessionExpired] = useState(false);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [minutesRemaining, setMinutesRemaining] = useState(0);

  useEffect(() => {
    const fetchPermissions = async () => {
      const userDataStr = sessionStorage.getItem('user_data');
      if (userDataStr) {
        try {
          const userData = JSON.parse(userDataStr);
          console.log('User data for permissions:', userData);
          
          // Strictly use the 'perfil' property from the API response
          const profileToCheck = userData.perfil;

          if (profileToCheck) {
            console.log('Fetching permissions for profile:', profileToCheck);
            const modules = await permissionsService.getAllowedModules(profileToCheck);
            console.log('Fetched allowed modules:', modules);
            setAllowedModules(modules);
          } else {
            console.warn('No profile found in user data to check permissions');
            // Fallback to just Home if no profile is found
            setAllowedModules(['Home']);
          }
        } catch (e) {
          console.error('Error fetching permissions', e);
        }
      } else {
         console.warn('No user data found in sessionStorage');
         setAllowedModules(['Home']);
      }
    };

    if (isAuthenticated) {
      fetchPermissions();
    }

    // Session timeout check
    const interval = setInterval(() => {
      if (isAuthenticated) {
        const timestamp = sessionStorage.getItem('login_timestamp');
        if (!timestamp) {
           // No timestamp, force logout
           sessionStorage.clear();
           setIsAuthenticated(false);
           return;
        }
        
        const now = Date.now();
        const loginTime = parseInt(timestamp, 10);
        const sevenHours = 7 * 60 * 60 * 1000;
        const elapsed = now - loginTime;
        const timeLeft = sevenHours - elapsed;
        
        if (timeLeft <= 0) {
           // Expired
           sessionStorage.clear();
           setSessionExpired(true);
           setIsAuthenticated(false);
           setCurrentView('home');
           setShowSessionWarning(false);
        } else if (timeLeft <= 5 * 60 * 1000) {
           // Warning: 5 minutes or less remaining
           setShowSessionWarning(true);
           setMinutesRemaining(Math.ceil(timeLeft / 60000));
        } else {
           setShowSessionWarning(false);
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);

  const fetchOrders = async () => {
    if (!isAuthenticated) return;
    setIsRefreshingOrders(true);
    try {
      const { purchaseService } = await import('./services/purchaseService');
      const { configService } = await import('./services/configService');
      
      const ordenesPromise = purchaseService.getOrdenesCompra().catch(err => {
          console.warn("Failed to fetch orders:", err.message);
          return [];
      });

      const detallesPromise = purchaseService.getDetallesOC().catch(err => {
          console.warn("Failed to fetch order details:", err.message);
          return [];
      });

      const providersPromise = configService.getProveedores().catch(err => {
          console.warn("Failed to fetch providers:", err.message);
          return [];
      });

      const usersPromise = configService.getUsuarios().catch(err => {
          console.warn("Failed to fetch users:", err.message);
          return [];
      });

      const [ordenes, detalles, providers, users] = await Promise.all([
        ordenesPromise,
        detallesPromise,
        providersPromise,
        usersPromise
      ]);

      const mappedOrders: PurchaseOrder[] = ordenes
        .filter(oc => (oc.Status || oc.status) !== 'Baja')
        .map(oc => {
          const idUnivoco = oc.IDUnivoco || oc.idUnivoco || String(oc.id);
        const items = detalles
          .filter(d => (d.IdCompra || d.idCompra) === idUnivoco && (d.Status || d.status) !== 'Baja')
          .map(d => ({
            id: parseInt(String(d.IdArticulo || d.idArticulo || '0')),
            sku: d.SKU || d.sku,
            description: d.Articulo || d.articulo,
            quantity: parseInt(d.Cantidad || d.cantidad) || 0,
            receivedQuantity: parseInt(d.CantidadRecepcionada || d.cantidadRecepcionada) || 0,
            price: parseFloat(d.PrecioUnitario || d.precioUnitario) || 0
          }));

        const providerId = oc.Proveedor || oc.proveedor || '';
        const provider = providers.find(p => 
          p.id === providerId || 
          p.ID === providerId || 
          p.proveedor === providerId || 
          p.Proveedor_P === providerId
        );
        const providerName = provider ? (provider.proveedor || provider.Proveedor_P) : providerId;

        const getRequesterName = (userField: any) => {
          if (!userField) return null;
          if (typeof userField === 'string') return userField;
          if (typeof userField === 'object') {
            return userField.Title || userField.title || userField.Email || userField.email || userField.Name || userField.name || String(userField);
          }
          return String(userField);
        };

        const requesterName = getRequesterName(oc.Usuario_OC) || getRequesterName(oc.Usuario) || getRequesterName(oc.usuario) || 'Desconocido';

        const getRequesterProfile = (name: string) => {
           if (!name || name === 'Desconocido') return 'COMPRAS';
           // Normalize name for comparison
           const normalizedName = name.toLowerCase().trim();
           
           const user = users.find(u => 
             (u.UsuarioApp_Usr && u.UsuarioApp_Usr.toLowerCase() === normalizedName) || 
             (u.Title && u.Title.toLowerCase() === normalizedName) || 
             (u.ConcatName_Usr && u.ConcatName_Usr.toLowerCase() === normalizedName) ||
             (u.Nombre_Usr && u.Nombre_Usr.toLowerCase() === normalizedName) ||
             (u.Email && u.Email.toLowerCase() === normalizedName)
           );
           
           return user ? (user.Perfil_Usr || user.perfil || 'COMPRAS') : (oc.Perfil || oc.perfil || oc.Segmento || oc.segmento || oc.Area || oc.area || 'COMPRAS');
        };

        return {
          id: idUnivoco,
          sharepointId: String(oc.id || ''),
          date: oc.Fecha || oc.fecha || '',
          // The raw OC field sometimes holds the provider NAME instead of its id
          // (that is why the lookup above also tries `p.proveedor`). Store the
          // canonical id whenever we resolved one, so filtering by provider —
          // which compares against the providers list id — actually matches.
          providerId: provider ? String(provider.id || provider.ID || providerId) : providerId,
          providerName: providerName || 'Desconocido',
          requester: requesterName,
          requesterProfile: getRequesterProfile(requesterName),
          items: items,
          status: (oc.Status || oc.status) as any,
          observaciones: oc.Observaciones || oc.observaciones || ''
        };
      });

      // Sort by status priority, then by SharePoint ID descending
      const getStatusPriority = (status: string) => {
        if (!status) return 7;
        const s = status.toLowerCase();
        
        if (s.includes('recepcion') || s.includes('recepción')) return 1;
        if (s.includes('aprobada') || s.includes('aprobado') || s.includes('ingreso')) return 2;
        if ((s.includes('pendiente') && (s.includes('aprobacion') || s.includes('aprobación'))) || s === 'pendiente') return 3;
        if (s.includes('presupuesto')) return 4;
        if (s.includes('completada') || s.includes('completado')) return 5;
        if (s.includes('rechazada') || s.includes('rechazado') || s.includes('baja')) return 6;
        
        return 7;
      };

      mappedOrders.sort((a, b) => {
        const priorityA = getStatusPriority(a.status);
        const priorityB = getStatusPriority(b.status);
        
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        
        // If same priority, sort by SharePoint ID descending
        const idA = parseInt(a.sharepointId) || 0;
        const idB = parseInt(b.sharepointId) || 0;
        return idB - idA;
      });
      
      setOrders(mappedOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsRefreshingOrders(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [isAuthenticated]);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('user_data');
    sessionStorage.removeItem('login_timestamp');
    setIsAuthenticated(false);
    setCurrentView('home');
    setShowLogoutConfirm(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} sessionExpired={sessionExpired} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return <Home onViewChange={setCurrentView} orders={orders} />;
      case 'stock':
        return <StockOnline />;
      // case 'inyecciones':
      //   return <Inyecciones />;
      case 'compras':
        return <Compras orders={orders} setOrders={setOrders} onRefresh={fetchOrders} isRefreshing={isRefreshingOrders} />;
      case 'aprobaciones':
        return <Aprobaciones orders={orders} setOrders={setOrders} onRefresh={fetchOrders} isRefreshing={isRefreshingOrders} />;
      case 'config':
        return <Configuracion initialTab="PROVEEDORES" />; // Default to providers if parent clicked
      case 'config-proveedores':
        return <Configuracion initialTab="PROVEEDORES" />;
      case 'config-articulos':
        return <Configuracion initialTab="ARTICULOS" />;
      case 'configuracion': // Fallback if needed
         return <Configuracion />;
      default:
        return (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Construction className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Módulo en construcción</h2>
            <p className="mt-2 text-sm text-muted-foreground">Esta funcionalidad estará disponible pronto.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          setIsSidebarOpen(false);
        }}
        onLogout={handleLogout}
        allowedModules={allowedModules}
        isOpen={isSidebarOpen}
        onOpen={() => setIsSidebarOpen(true)}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Content area (§4.5): mt-16 clears the fixed mobile header. */}
      {/* OVERRIDE: kit says bg-secondary/30, which lands ~#fbfbfb over white and
          leaves white cards indistinguishable from the canvas. See docs/design-overrides.md. */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-muted mt-[calc(4rem+env(safe-area-inset-top))] md:mt-0">

        {showSessionWarning && (
          <div role="alert" className="flex shrink-0 items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-white animate-in slide-in-from-top duration-300">
            <AlertTriangle className="h-5 w-5 shrink-0 animate-pulse" aria-hidden="true" />
            <span className="text-center text-sm font-medium md:text-base">
              ¡ATENCIÓN! {minutesRemaining} {minutesRemaining === 1 ? 'minuto' : 'minutos'} para que finalice la sesión. Para reiniciarla, cerrá y volvé a iniciar sesión.
            </span>
          </div>
        )}

        <div className="relative min-h-0 flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </main>

      <Modal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="Cerrar sesión"
        description="¿Estás seguro que deseas cerrar la sesión actual?"
        maxWidth="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowLogoutConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmLogout}>
              Cerrar sesión
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Tendrás que volver a ingresar tus credenciales para acceder al sistema.
        </p>
      </Modal>
    </div>
  );
}
