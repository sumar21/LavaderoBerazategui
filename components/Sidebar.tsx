
import React, { useState, useEffect } from 'react';
import { Home, Shirt, LogOut, ShoppingCart, Check, Settings, ChevronRight, LayoutDashboard, ChevronDown, Package, Users } from 'lucide-react';
import { Logo } from './ui/Logo';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  allowedModules: string[];
  isOpen?: boolean;
  onClose?: () => void;
}

interface MenuItem {
    id: string;
    label: string;
    icon: React.ElementType;
    subItems?: { id: string; label: string; icon?: React.ElementType }[];
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, onLogout, allowedModules, isOpen, onClose }) => {
  const [openSubMenus, setOpenSubMenus] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<{name: string, role: string} | null>(null);

  useEffect(() => {
    const userDataStr = localStorage.getItem('user_data');
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        setUserProfile({
          name: userData.name || userData.email || userData.username || 'User',
          role: userData.perfil || userData.role || 'Usuario'
        });
      } catch (e) {
        console.error('Error parsing user data', e);
      }
    }
  }, []);

  const menuItems: MenuItem[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'stock', label: 'Stock Online', icon: Shirt },
    // { id: 'inyecciones', label: 'Inyecciones', icon: LogOut },
    { id: 'compras', label: 'Compras', icon: ShoppingCart },
    { id: 'aprobaciones', label: 'Aprobaciones', icon: Check }, 
    { 
        id: 'config', 
        label: 'Configuración', 
        icon: Settings,
        subItems: [
            { id: 'config-proveedores', label: 'Proveedores', icon: Users },
            { id: 'config-articulos', label: 'Artículos', icon: Package }
        ]
    },
  ];

  // Filter menu items based on permissions
  const filteredMenuItems = menuItems.filter(item => {
    // Always show Home
    if (item.id === 'home') return true;
    
    // Normalize function to remove accents, spaces and convert to uppercase
    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toUpperCase();

    const normalizedLabel = normalize(item.label);
    
    // Check if any allowed module matches the label
    const isAllowed = allowedModules.some(m => normalize(m) === normalizedLabel);
    
    // Special case for 'Configuración' which might be 'Configuracion' or 'Administracion' in DB
    if (item.id === 'config') {
        const configAllowed = allowedModules.some(m => normalize(m) === 'CONFIGURACION');
        const adminAllowed = allowedModules.some(m => normalize(m) === 'ADMINISTRACION');
        return configAllowed || adminAllowed;
    }
    
    return isAllowed;
  });

  // Auto-expand menu if current view is a child
  useEffect(() => {
    filteredMenuItems.forEach(item => {
        if (item.subItems && item.subItems.some(sub => sub.id === currentView)) {
            if (!openSubMenus.includes(item.id)) {
                setOpenSubMenus(prev => [...prev, item.id]);
            }
        }
    });
  }, [currentView, allowedModules]); // Add allowedModules dependency

  const toggleSubMenu = (id: string) => {
      setOpenSubMenus(prev => 
          prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <div className={`flex flex-col w-[260px] md:w-[220px] h-screen fixed left-0 top-0 z-50 md:z-30 transition-all duration-300 ease-in-out transform ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
      
      {/* Background & Ambient Lighting */}
      <div className="absolute inset-0 bg-[#0B0F19] border-r border-slate-800/50 overflow-hidden">
         {/* Top-Left Blue Glow */}
         <div className="absolute top-[-10%] -left-1/2 w-[150%] h-[50%] bg-gradient-to-br from-blue-600/20 to-transparent rounded-full blur-3xl opacity-60 pointer-events-none" />
         {/* Bottom-Right Indigo Glow */}
         <div className="absolute bottom-[-10%] -right-1/2 w-[150%] h-[50%] bg-gradient-to-tl from-indigo-600/20 to-transparent rounded-full blur-3xl opacity-60 pointer-events-none" />
         {/* Noise Texture */}
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 brightness-100 contrast-150 pointer-events-none"></div>
      </div>
      
      {/* Content */}
      <div className="relative flex flex-col h-full z-10 py-6 px-4">
        
        {/* Logo */}
        <div className="mb-10 px-2 pt-2 flex justify-between items-center">
             <Logo size="lg" variant="light" showText={false} />
             {onClose && (
               <button 
                 onClick={onClose}
                 className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
               </button>
             )}
        </div>

        {/* Navigation */}
        <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Menu Principal</p>
          {filteredMenuItems.map((item) => {
            const hasSubItems = !!item.subItems;
            // Parent is active if current view matches ID OR one of its children matches current view
            const isParentActive = currentView === item.id || (hasSubItems && item.subItems?.some(sub => sub.id === currentView));
            const isOpen = openSubMenus.includes(item.id);

            return (
              <div key={item.id}>
                  <button
                    onClick={() => {
                        if (hasSubItems) {
                            toggleSubMenu(item.id);
                        } else {
                            onNavigate(item.id);
                        }
                    }}
                    className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 ease-out relative ${
                      (isParentActive && !hasSubItems)
                        ? 'bg-blue-600 shadow-lg shadow-blue-900/40 text-white' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    } ${isOpen && hasSubItems ? 'text-slate-200 bg-white/5' : ''}`}
                  >
                     <div className="flex items-center gap-3">
                        <item.icon 
                            className={`w-4.5 h-4.5 transition-colors duration-200 ${
                                (isParentActive && !hasSubItems) ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                            }`} 
                            strokeWidth={(isParentActive && !hasSubItems) ? 2.5 : 2}
                        />
                        <span className="text-sm font-medium tracking-wide">
                            {item.label}
                        </span>
                     </div>
                     {hasSubItems && (
                         <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                     )}
                  </button>

                  {/* Sub Menu */}
                  {hasSubItems && isOpen && (
                      <div className="mt-1 space-y-1 pl-4 relative">
                          {item.subItems!.map((sub) => {
                              const isSubActive = currentView === sub.id;
                              return (
                                  <button
                                    key={sub.id}
                                    onClick={() => onNavigate(sub.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                                        isSubActive 
                                            ? 'text-blue-400 font-semibold bg-blue-500/10' 
                                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                    }`}
                                  >
                                      {sub.icon && <sub.icon className={`w-3.5 h-3.5 ${isSubActive ? 'text-blue-400' : 'text-slate-600'}`} />}
                                      <span>{sub.label}</span>
                                  </button>
                              )
                          })}
                      </div>
                  )}
              </div>
            );
          })}
        </div>

        {/* User Profile */}
        <div className="mt-auto pt-4 border-t border-slate-800/50">
            <div className="p-3 rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-md shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-md shrink-0 border-2 border-[#0B0F19]">
                        {userProfile?.name.substring(0, 2).toUpperCase() || 'US'}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white leading-none truncate">{userProfile?.name || 'User'}</span>
                        <span className="text-[10px] text-slate-400 mt-1 truncate">{userProfile?.role || 'Usuario'}</span>
                    </div>
                </div>
                <button 
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-red-500/10 hover:border-red-500/20 border border-transparent rounded-lg transition-all duration-200 group"
                >
                    <span className="text-xs font-medium text-slate-400 group-hover:text-red-400 transition-colors">Cerrar Sesión</span>
                </button>
            </div>
            <p className="text-center mt-4 text-[10px] text-slate-600 font-medium opacity-60">v20251223_1.0.10 &copy; {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  </>
);
};
