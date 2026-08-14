import React, { useState, useEffect } from 'react';
import {
  Home, Shirt, ShoppingCart, Check, Settings, ChevronDown, Package, Users,
  LogOut, Menu, X, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Logo } from './ui/Logo';
import { cn, useModalAnimation } from './ui/UIComponents';
import { Z } from './ui/zLayers';
import { useUserProfile } from './useUserProfile';
import { capitalizeFirst } from '../utils/text';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  allowedModules: string[];
  isOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  subItems?: { id: string; label: string; icon?: React.ElementType }[];
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'stock', label: 'Stock Online', icon: Shirt },
  { id: 'compras', label: 'Compras', icon: ShoppingCart },
  { id: 'aprobaciones', label: 'Aprobaciones', icon: Check },
  {
    id: 'config',
    label: 'Configuración',
    icon: Settings,
    subItems: [
      { id: 'config-proveedores', label: 'Proveedores', icon: Users },
      { id: 'config-articulos', label: 'Artículos', icon: Package },
    ],
  },
];

export const MODULE_LABELS: Record<string, string> = {
  home: 'Home',
  stock: 'Stock Online',
  compras: 'Compras',
  aprobaciones: 'Aprobaciones',
  config: 'Configuración',
  'config-proveedores': 'Proveedores',
  'config-articulos': 'Artículos',
};

const COLLAPSE_KEY = 'sidebar_collapsed';

const normalize = (str: string) =>
  str.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').toUpperCase();

/**
 * Nav item on the brand-coloured shell. Active is a lighter step of the same
 * hue (`sidebar-accent`) plus a left indicator bar; idle labels are a pale tint
 * that still clears contrast on the blue.
 */
const navItemClass = (active: boolean, collapsed: boolean) =>
  cn(
    'group relative flex w-full items-center rounded-md text-sm font-medium transition-colors',
    collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5 md:py-2',
    active
      ? 'bg-sidebar-accent text-sidebar-foreground shadow-sm'
      : 'text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground'
  );

/** Left indicator bar on the active item. Decorative — state is already conveyed by colour + aria. */
const ActiveBar: React.FC = () => (
  <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-foreground" aria-hidden="true" />
);

export const Sidebar: React.FC<SidebarProps> = ({
  currentView, onNavigate, onLogout, allowedModules, isOpen = false, onClose, onOpen,
}) => {
  const [openSubMenus, setOpenSubMenus] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1');
  const drawer = useModalAnimation(isOpen);
  const user = useUserProfile();

  useEffect(() => { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); }, [collapsed]);

  const items = MENU_ITEMS.filter(item => {
    if (item.id === 'home') return true;
    if (item.id === 'config') {
      return allowedModules.some(m => ['CONFIGURACION', 'ADMINISTRACION'].includes(normalize(m)));
    }
    return allowedModules.some(m => normalize(m) === normalize(item.label));
  });

  useEffect(() => {
    items.forEach(item => {
      if (item.subItems?.some(sub => sub.id === currentView) && !openSubMenus.includes(item.id)) {
        setOpenSubMenus(prev => [...prev, item.id]);
      }
    });
  }, [currentView, allowedModules]);

  const toggleSubMenu = (id: string) =>
    setOpenSubMenus(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));


  /** `isCollapsed` only ever applies to the desktop aside — the drawer is always full. */
  const renderNav = (isCollapsed: boolean) => (
    <>
      {/* Collapsed, the toggle stacks under the logo but stays INSIDE this band,
          above the divider — the shape the studio's other apps use. */}
      <div className={cn('flex shrink-0 border-b border-sidebar-border', isCollapsed ? 'flex-col items-center gap-1 px-2 py-3' : 'h-16 items-center justify-between px-4')}>
        {isCollapsed ? (
          <>
            <img src="/favicon.svg" alt="Lavadero Berazategui" className="h-8 w-8 object-contain" />
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              title="Expandir menú"
              aria-label="Expandir menú"
              className="flex w-full justify-center rounded-md py-1.5 text-sidebar-muted transition-colors hover:bg-white/10 hover:text-sidebar-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : (
          <Logo variant="light" size="sm" />
        )}

        {/* Collapse toggle sits beside the logo — desktop only. */}
        {!isCollapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Contraer menú"
            className="hidden rounded-md p-1.5 text-sidebar-muted transition-colors hover:bg-white/10 hover:text-sidebar-foreground md:block"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {onClose && !isCollapsed && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="md:hidden flex h-11 w-11 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-white/10 hover:text-sidebar-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {!isCollapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted/70">
            Menú principal
          </p>
        )}

        {items.map(item => {
          const hasSubItems = !!item.subItems;
          const childActive = hasSubItems && item.subItems!.some(sub => sub.id === currentView);
          const active = currentView === item.id || childActive;
          const expanded = openSubMenus.includes(item.id);

          return (
            <div key={item.id}>
              <button
                type="button"
                // Collapsed + submenu: open the rail first, then the submenu — a
                // flyout would be a second popover system for one menu.
                onClick={() => {
                  if (!hasSubItems) return onNavigate(item.id);
                  if (isCollapsed) setCollapsed(false);
                  toggleSubMenu(item.id);
                }}
                aria-expanded={hasSubItems ? expanded : undefined}
                title={isCollapsed ? item.label : undefined}
                className={navItemClass(active && !hasSubItems, isCollapsed)}
              >
                {active && !hasSubItems && <ActiveBar />}
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {hasSubItems && (
                      <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', expanded && 'rotate-180')} aria-hidden="true" />
                    )}
                  </>
                )}
              </button>

              {hasSubItems && expanded && !isCollapsed && (
                <div className="mt-1 space-y-1 pl-4">
                  {item.subItems!.map(sub => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => onNavigate(sub.id)}
                      className={navItemClass(currentView === sub.id, false)}
                    >
                      {currentView === sub.id && <ActiveBar />}
                      {sub.icon && <sub.icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                      <span className="flex-1 text-left">{sub.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div className={cn('mb-2 flex items-center', isCollapsed ? 'justify-center' : 'gap-3 px-1')}>
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-sidebar-foreground"
            title={isCollapsed ? `${capitalizeFirst(user.name)} · ${user.role}` : undefined}
          >
            {user.initials}
          </div>
          {!isCollapsed && (
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold leading-tight text-sidebar-foreground">{capitalizeFirst(user.name)}</span>
              <span className="truncate text-[11px] text-sidebar-muted">{user.role}</span>
            </div>
          )}
        </div>

        {/* red-300 rather than `destructive`: #ef4444 on the brand blue measures
            2.60:1 — below the 4.5 AA floor — while red-300 reaches 5.15:1. */}
        <button
          type="button"
          onClick={onLogout}
          title={isCollapsed ? 'Cerrar sesión' : undefined}
          className={cn(
            'flex w-full items-center rounded-md text-sm font-medium text-red-300 transition-colors hover:bg-red-400/15 hover:text-red-200',
            isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5 md:py-2'
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          {!isCollapsed && 'Cerrar sesión'}
        </button>

        {!isCollapsed && <p className="mt-2 px-3 text-[10px] text-sidebar-muted/60">v20251223_1.0.10</p>}
      </div>
    </>
  );

  return (
    <>
      {/* Fixed mobile header (§5.10) */}
      <header
        className="fixed inset-x-0 top-0 flex h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] items-center justify-between border-b border-sidebar-border bg-sidebar px-4 text-sidebar-foreground md:hidden"
        style={{ zIndex: Z.nav }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpen}
            aria-label="Abrir menú"
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-md transition-colors hover:bg-white/10"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="truncate text-lg font-bold">{MODULE_LABELS[currentView] ?? 'Lavadero'}</span>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card/15 text-xs font-semibold">
          {user.initials}
        </div>
      </header>

      {/* Desktop aside */}
      <aside
        className={cn(
          'hidden h-screen shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-in-out md:flex',
          collapsed ? 'w-16' : 'w-64'
        )}
        style={{ zIndex: Z.nav }}
      >
        {renderNav(collapsed)}
      </aside>

      {/* Mobile drawer (§5.10) */}
      {drawer.visible && (
        <div className="fixed inset-0 md:hidden" style={{ zIndex: Z.drawer }}>
          <div className={cn('absolute inset-0 bg-black/60 backdrop-blur-sm', drawer.overlayClass)} onClick={onClose} />
          <div
            className={cn(
              'absolute left-0 top-0 flex h-full w-[280px] max-w-[85vw] flex-col bg-sidebar text-sidebar-foreground shadow-2xl',
              isOpen ? 'drawer-enter-left' : 'drawer-exit-left'
            )}
          >
            {renderNav(false)}
          </div>
        </div>
      )}
    </>
  );
};
