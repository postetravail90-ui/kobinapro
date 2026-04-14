import { useState, useMemo, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Package, Users, Receipt, CreditCard,
  Crown, Settings, LogOut, Bell, Menu, X, ChefHat, Wallet, Shield, Store,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useManagerPermissions, type ManagerPermissionKey } from '@/hooks/useManagerPermissions';
import { useNotifications, usePushRouting } from '@/hooks/useNotifications';
import kobinaLogo from '@/assets/kobina-pro-logo.png';
import OfflineBanner from '@/components/OfflineBanner';
import SyncStatusBar from '@/components/SyncStatusBar';
import InstallBanner from '@/components/pwa/InstallBanner';
import { useDesktopShortcuts } from '@/hooks/useDesktopShortcuts';
import { useCurrentBusiness } from '@/hooks/useCurrentBusiness';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { prefetchAllAppData, prefetchAppNavTarget } from '@/lib/prefetch/prefetchAppData';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
  permKey?: ManagerPermissionKey;
}

// Propriétaire (navigation plate, sans groupes repliables)
const ownerSidebarItems: NavItem[] = [
  { to: '/app', icon: LayoutDashboard, label: 'Accueil', end: true },
  { to: '/app/commerces', icon: Store, label: 'Commerces' },
  { to: '/app/caisse', icon: ChefHat, label: 'Vente' },
  { to: '/app/produits', icon: Package, label: 'Produits' },
  { to: '/app/credits', icon: CreditCard, label: 'Crédits' },
  { to: '/app/depenses', icon: Wallet, label: 'Dépenses' },
  { to: '/app/gerants', icon: Users, label: 'Gérants' },
  { to: '/app/abonnements', icon: Crown, label: 'Abonnement' },
  { to: '/app/parametres', icon: Settings, label: 'Paramètres' },
];

// Gérant : liste courte + permissions
const managerSidebarItems: NavItem[] = [
  { to: '/app', icon: LayoutDashboard, label: 'Accueil', end: true },
  { to: '/app/caisse', icon: ChefHat, label: 'Vente', permKey: 'can_sell' },
  { to: '/app/produits', icon: Package, label: 'Produits', permKey: 'can_manage_products' },
  { to: '/app/sessions', icon: Receipt, label: 'Session', permKey: 'can_use_sessions' },
  { to: '/app/depenses', icon: Wallet, label: 'Dépenses', permKey: 'can_add_expenses' },
  { to: '/app/parametres', icon: Settings, label: 'Paramètres' },
];

const ownerMobileNav: NavItem[] = [
  { to: '/app', icon: LayoutDashboard, label: 'Accueil', end: true },
  { to: '/app/caisse', icon: ChefHat, label: 'Vente' },
  { to: '/app/produits', icon: Package, label: 'Produits' },
  { to: '/app/credits', icon: CreditCard, label: 'Crédits' },
  { to: '/app/parametres', icon: Settings, label: 'Plus' },
];

const managerMobileNav: NavItem[] = [
  { to: '/app', icon: LayoutDashboard, label: 'Accueil', end: true },
  { to: '/app/caisse', icon: ChefHat, label: 'Vente', permKey: 'can_sell' },
  { to: '/app/produits', icon: Package, label: 'Produits', permKey: 'can_manage_products' },
  { to: '/app/sessions', icon: Receipt, label: 'Session', permKey: 'can_use_sessions' },
  { to: '/app/parametres', icon: Settings, label: 'Plus' },
];

// ===== NAV ITEM COMPONENT =====
function SidebarItem({
  item,
  onNav,
  onPrefetch,
}: {
  item: NavItem;
  onNav: () => void;
  onPrefetch?: () => void;
}) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNav}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      onTouchStart={onPrefetch}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`
      }
    >
      <item.icon size={18} strokeWidth={1.8} />
      <span>{item.label}</span>
    </NavLink>
  );
}

function SidebarFlatList({
  items,
  onNav,
  onPrefetchItem,
}: {
  items: NavItem[];
  onNav: () => void;
  onPrefetchItem?: (to: string) => void;
}) {
  return (
    <div className="space-y-0.5">
      {items.map(item => (
        <SidebarItem
          key={item.to}
          item={item}
          onNav={onNav}
          onPrefetch={onPrefetchItem ? () => onPrefetchItem(item.to) : undefined}
        />
      ))}
    </div>
  );
}

function AppSidebarHeader({
  showClose,
  onClose,
  isManager,
}: {
  showClose?: boolean;
  onClose?: () => void;
  isManager: boolean;
}) {
  return (
    <div className="p-4 border-b border-border flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img src={kobinaLogo} alt="Kobina" className="h-9 w-9 rounded-xl object-cover" loading="eager" decoding="async" />
        <div>
          <span className="font-bold text-base text-foreground tracking-tight">Kobina</span>
          <p className="text-[10px] text-muted-foreground font-medium">{isManager ? 'Gérant' : 'Propriétaire'}</p>
        </div>
      </div>
      {showClose && onClose && (
        <button type="button" onClick={onClose} className="text-muted-foreground p-1 rounded-lg hover:bg-muted" aria-label="Fermer le menu">
          <X size={18} />
        </button>
      )}
    </div>
  );
}

function AppSignOutButton({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="p-2.5 border-t border-border">
      <button
        type="button"
        onClick={onSignOut}
        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-destructive hover:bg-destructive/8 w-full transition-colors"
      >
        <LogOut size={18} strokeWidth={1.8} />
        Déconnexion
      </button>
    </div>
  );
}

export default function AppLayout() {
  useDesktopShortcuts();
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();
  const { commerceIds, loading: commerceLoading } = useCurrentBusiness();
  const { permissions, isManager } = useManagerPermissions();
  const { unreadCount } = useNotifications();
  usePushRouting();
  useScrollToTop(mainScrollRef);

  const prefetchNav = (to: string) => {
    prefetchAppNavTarget(queryClient, to, user?.id, commerceIds);
  };

  useEffect(() => {
    if (!user?.id || commerceLoading || commerceIds.length === 0) return;
    void prefetchAllAppData(queryClient, user.id, commerceIds).catch(() => {});
  }, [user?.id, commerceLoading, commerceIds.join(','), queryClient]);

  const filteredManagerItems = useMemo(() => {
    return managerSidebarItems.filter(item =>
      !item.permKey || permissions[item.permKey]
    );
  }, [permissions]);

  const mobileNav = useMemo(() => {
    if (!isManager) return ownerMobileNav;
    return managerMobileNav.filter(item =>
      !item.permKey || permissions[item.permKey]
    );
  }, [isManager, permissions]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth/login');
  };

  const closeSidebar = () => setSidebarOpen(false);
  const sidebarItems = isManager ? filteredManagerItems : ownerSidebarItems;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[260px] bg-card border-r border-border shrink-0">
        <AppSidebarHeader isManager={isManager} />
        <nav className="flex-1 p-2.5 overflow-y-auto scrollbar-hide">
          <SidebarFlatList items={sidebarItems} onNav={() => {}} onPrefetchItem={prefetchNav} />
        </nav>
        <AppSignOutButton onSignOut={handleSignOut} />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-foreground/30 z-40 lg:hidden"
              onClick={closeSidebar}
            />
            <motion.aside
              key="sidebar-panel"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'tween', duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              className="fixed left-0 top-0 bottom-0 w-[280px] max-w-[85vw] bg-card border-r border-border z-50 lg:hidden flex flex-col shadow-xl"
            >
              <AppSidebarHeader showClose onClose={closeSidebar} isManager={isManager} />
              <nav className="flex-1 p-2.5 overflow-y-auto overscroll-contain">
                <SidebarFlatList items={sidebarItems} onNav={closeSidebar} />
              </nav>
              <AppSignOutButton onSignOut={handleSignOut} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-[52px] bg-card/80 glass border-b border-border flex items-center px-4 gap-3 shrink-0 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground p-1 rounded-lg">
            <Menu size={20} />
          </button>
          <img src={kobinaLogo} alt="Kobina Pro" className="h-7 rounded-lg object-contain lg:hidden" loading="eager" decoding="async" />
          <div className="flex-1" />
          {role === 'super_admin' && (
            <NavLink
              to="/admin"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline px-2"
            >
              <Shield size={16} />
              Admin
            </NavLink>
          )}
          <NavLink
            to="/app/notifications"
            onMouseEnter={() => prefetchNav('/app/notifications')}
            onFocus={() => prefetchNav('/app/notifications')}
            onTouchStart={() => prefetchNav('/app/notifications')}
            className="relative text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted"
          >
            <Bell size={18} strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center min-w-[18px]">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
          <NavLink
            to="/app/parametres"
            onMouseEnter={() => prefetchNav('/app/parametres')}
            onFocus={() => prefetchNav('/app/parametres')}
            onTouchStart={() => prefetchNav('/app/parametres')}
            className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs"
          >
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </NavLink>
        </header>

        <SyncStatusBar />
        <OfflineBanner />

        {/* Page content */}
        <main ref={mainScrollRef} className="flex-1 overflow-y-auto pb-20 lg:pb-6 contain-layout">
          {role === 'proprietaire' && <OnboardingWizard />}
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/90 glass border-t border-border flex items-center justify-around h-[60px] z-30 safe-area-bottom">
        {mobileNav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onMouseEnter={() => prefetchNav(item.to)}
            onFocus={() => prefetchNav(item.to)}
            onTouchStart={() => prefetchNav(item.to)}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 min-w-[52px] py-1.5 transition-all duration-150 ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <motion.div
                  animate={isActive ? { scale: 1, y: -1 } : { scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <item.icon size={22} strokeWidth={isActive ? 2 : 1.5} />
                </motion.div>
                <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <InstallBanner />
    </div>
  );
}
