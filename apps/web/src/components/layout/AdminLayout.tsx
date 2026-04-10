import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAdminScopes, type AdminScopeKey } from '@/hooks/useAdminScopes';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, UserCog, Store, CreditCard, BarChart3, ShieldAlert, Activity,
  Settings, LogOut, Menu, X, ChevronDown, FileText, Shield, Headphones,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import kobinaLogo from '@/assets/kobina-logo.jpg';
import type { LucideIcon } from 'lucide-react';

interface NavGroup {
  label: string;
  items: { to: string; icon: LucideIcon; label: string; end?: boolean }[];
}

const PATH_SCOPE: Record<string, AdminScopeKey> = {
  '/admin': 'dashboard',
  '/admin/team': 'dashboard',
  '/admin/users': 'users',
  '/admin/commerces': 'commerces',
  '/admin/abonnements': 'billing',
  '/admin/analytics': 'analytics',
  '/admin/revenue': 'billing',
  '/admin/fraude': 'fraude',
  '/admin/security': 'security',
  '/admin/logs': 'logs',
  '/admin/support': 'support',
  '/admin/monitoring': 'monitoring',
  '/admin/settings': 'settings',
};

const navGroups: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    ],
  },
  {
    label: 'Équipe',
    items: [{ to: '/admin/team', icon: UserCog, label: 'Administrateurs délégués' }],
  },
  {
    label: 'Gestion',
    items: [
      { to: '/admin/users', icon: Users, label: 'Utilisateurs' },
      { to: '/admin/commerces', icon: Store, label: 'Commerces' },
      { to: '/admin/abonnements', icon: CreditCard, label: 'Abonnements' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
      { to: '/admin/revenue', icon: CreditCard, label: 'Revenus' },
    ],
  },
  {
    label: 'Sécurité',
    items: [
      { to: '/admin/fraude', icon: ShieldAlert, label: 'Alertes Fraude' },
      { to: '/admin/security', icon: Shield, label: 'Sécurité' },
      { to: '/admin/logs', icon: FileText, label: 'Logs & Audit' },
    ],
  },
  {
    label: 'Support',
    items: [
      { to: '/admin/support', icon: Headphones, label: 'Tickets Support' },
    ],
  },
  {
    label: 'Système',
    items: [
      { to: '/admin/monitoring', icon: Activity, label: 'Monitoring' },
      { to: '/admin/settings', icon: Settings, label: 'Paramètres' },
    ],
  },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, role } = useAuth();
  const { can, loading: scopesLoading, isSuper } = useAdminScopes();

  useEffect(() => {
    if (scopesLoading || !role) return;
    const path = location.pathname;
    if (path === '/admin/team' && !isSuper) {
      navigate('/admin', { replace: true });
      return;
    }
    const scoped = PATH_SCOPE[path] ?? 'dashboard';
    if (role === 'admin_staff' && !can(scoped)) {
      navigate('/admin', { replace: true });
    }
  }, [location.pathname, scopesLoading, role, can, navigate, isSuper]);

  const filteredGroups = navGroups
    .map((g) => {
      if (g.label === 'Équipe' && !isSuper) return { ...g, items: [] };
      return {
        ...g,
        items: g.items.filter((item) => isSuper || can(PATH_SCOPE[item.to] ?? 'dashboard')),
      };
    })
    .filter((g) => g.items.length > 0);

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const SidebarNav = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex-1 p-3 space-y-4 overflow-y-auto scrollbar-hide">
      {filteredGroups.map(group => {
        const isCollapsed = collapsedGroups.has(group.label);
        const hasActive = group.items.some(i => location.pathname === i.to || (!i.end && location.pathname.startsWith(i.to + '/')));
        return (
          <div key={group.label}>
            <button
              onClick={() => toggleGroup(group.label)}
              className="flex items-center justify-between w-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              {group.label}
              <ChevronDown size={12} className={`transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-0.5 mt-1">
                    {group.items.map(item => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          }`
                        }
                      >
                        <item.icon size={18} />
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border shrink-0">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <img src={kobinaLogo} alt="Kobina Admin" className="h-10 w-10 rounded-xl object-cover" />
          <div>
            <span className="font-bold text-foreground">Kobina</span>
            <span className="block text-[10px] font-bold text-destructive uppercase tracking-wider">
              {role === 'super_admin' ? 'Super Admin' : 'Admin délégué'}
            </span>
          </div>
        </div>
        <SidebarNav />
        <div className="p-3 border-t border-border">
          <button
            onClick={async () => { await signOut(); navigate('/auth/login'); }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 w-full transition-colors"
          >
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)} />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-card border-r border-border z-50 lg:hidden flex flex-col"
            >
              <div className="p-4 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-3">
                  <img src={kobinaLogo} alt="Kobina" className="h-8 w-8 rounded-lg object-cover" />
                  <div>
                    <span className="font-bold text-foreground">Kobina</span>
                    <span className="block text-[10px] font-bold text-destructive uppercase">Admin</span>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-muted-foreground"><X size={20} /></button>
              </div>
              <SidebarNav onNavigate={() => setSidebarOpen(false)} />
              <div className="p-3 border-t border-border">
                <button
                  onClick={async () => { await signOut(); navigate('/auth/login'); }}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 w-full"
                >
                  <LogOut size={18} /> Déconnexion
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-card border-b border-border flex items-center px-4 gap-3 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground">
            <Menu size={22} />
          </button>
          <img src={kobinaLogo} alt="Kobina" className="h-8 w-8 rounded-lg object-cover lg:hidden" />
          <span className="font-bold text-foreground lg:hidden">Admin</span>
          <div className="flex-1" />
          {role === 'super_admin' && (
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="hidden sm:inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline"
            >
              <Store size={14} />
              Vue commerçants
            </button>
          )}
          <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Système en ligne
          </div>
        </header>
        <main className="flex-1 overflow-y-auto pb-6">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }} className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
