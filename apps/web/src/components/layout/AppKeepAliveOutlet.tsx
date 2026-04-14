import { useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import NotFound from '@/pages/NotFound';
import { useAuth } from '@/contexts/AuthContext';
import DashboardPage from '@/pages/app/DashboardPage';
import ManagerDashboardPage from '@/pages/app/ManagerDashboardPage';
import CommercesPage from '@/pages/app/CommercesPage';
import ProduitsPage from '@/pages/app/ProduitsPage';
import GerantsPage from '@/pages/app/GerantsPage';
import SessionsPage from '@/pages/app/SessionsPage';
import FacturesPage from '@/pages/app/FacturesPage';
import CreditsPage from '@/pages/app/CreditsPage';
import DepensesPage from '@/pages/app/DepensesPage';
import ParrainagePage from '@/pages/app/ParrainagePage';
import AbonnementsPage from '@/pages/app/AbonnementsPage';
import ParametresPage from '@/pages/app/ParametresPage';
import NotificationsPage from '@/pages/app/NotificationsPage';
import NotificationSettingsPage from '@/pages/app/NotificationSettingsPage';
import MessagesPage from '@/pages/app/MessagesPage';
import FidelitePage from '@/pages/app/FidelitePage';
import BeneficePage from '@/pages/app/BeneficePage';

export type AppKeepAlivePanelId =
  | 'dashboard'
  | 'commerces'
  | 'produits'
  | 'gerants'
  | 'sessions'
  | 'factures'
  | 'credits'
  | 'depenses'
  | 'parrainage'
  | 'abonnements'
  | 'parametres'
  | 'notif-settings'
  | 'notifications'
  | 'messages'
  | 'benefice'
  | 'fidelite';

export function getAppKeepAlivePanelId(pathname: string): AppKeepAlivePanelId | null {
  const p = pathname.replace(/\/$/, '') || '/';
  if (p.startsWith('/app/notifications/settings')) return 'notif-settings';
  if (p.startsWith('/app/notifications')) return 'notifications';
  if (p.startsWith('/app/messages')) return 'messages';
  if (p.startsWith('/app/benefice')) return 'benefice';
  if (p.startsWith('/app/fidelite')) return 'fidelite';
  if (p.startsWith('/app/commerces')) return 'commerces';
  if (p.startsWith('/app/produits')) return 'produits';
  if (p.startsWith('/app/gerants')) return 'gerants';
  if (p.startsWith('/app/sessions') || p.startsWith('/app/caisse')) return 'sessions';
  if (p.startsWith('/app/factures')) return 'factures';
  if (p.startsWith('/app/credits')) return 'credits';
  if (p.startsWith('/app/depenses')) return 'depenses';
  if (p.startsWith('/app/parrainage')) return 'parrainage';
  if (p.startsWith('/app/abonnements')) return 'abonnements';
  if (p.startsWith('/app/parametres')) return 'parametres';
  if (p === '/app') return 'dashboard';
  if (p.startsWith('/app/')) return null;
  return null;
}

function KeepPanel({
  id,
  activeId,
  children,
}: {
  id: AppKeepAlivePanelId;
  activeId: AppKeepAlivePanelId | null;
  children: ReactNode;
}) {
  const active = id === activeId;
  return (
    <div className="min-h-0" hidden={!active} aria-hidden={!active}>
      {children}
    </div>
  );
}

export default function AppKeepAliveOutlet() {
  const { pathname } = useLocation();
  const { role } = useAuth();
  const activeId = useMemo(() => getAppKeepAlivePanelId(pathname), [pathname]);

  const Dashboard = role === 'gerant' ? ManagerDashboardPage : DashboardPage;

  if (activeId === null) {
    return <NotFound />;
  }

  return (
    <>
      <KeepPanel id="dashboard" activeId={activeId}>
        <Dashboard />
      </KeepPanel>
      <KeepPanel id="commerces" activeId={activeId}>
        <CommercesPage />
      </KeepPanel>
      <KeepPanel id="produits" activeId={activeId}>
        <ProduitsPage />
      </KeepPanel>
      <KeepPanel id="gerants" activeId={activeId}>
        <GerantsPage />
      </KeepPanel>
      <KeepPanel id="sessions" activeId={activeId}>
        <SessionsPage />
      </KeepPanel>
      <KeepPanel id="factures" activeId={activeId}>
        <FacturesPage />
      </KeepPanel>
      <KeepPanel id="credits" activeId={activeId}>
        <CreditsPage />
      </KeepPanel>
      <KeepPanel id="depenses" activeId={activeId}>
        <DepensesPage />
      </KeepPanel>
      <KeepPanel id="parrainage" activeId={activeId}>
        <ParrainagePage />
      </KeepPanel>
      <KeepPanel id="abonnements" activeId={activeId}>
        <AbonnementsPage />
      </KeepPanel>
      <KeepPanel id="parametres" activeId={activeId}>
        <ParametresPage />
      </KeepPanel>
      <KeepPanel id="notif-settings" activeId={activeId}>
        <NotificationSettingsPage />
      </KeepPanel>
      <KeepPanel id="notifications" activeId={activeId}>
        <NotificationsPage />
      </KeepPanel>
      <KeepPanel id="messages" activeId={activeId}>
        <MessagesPage />
      </KeepPanel>
      <KeepPanel id="benefice" activeId={activeId}>
        <BeneficePage />
      </KeepPanel>
      <KeepPanel id="fidelite" activeId={activeId}>
        <FidelitePage />
      </KeepPanel>
    </>
  );
}
