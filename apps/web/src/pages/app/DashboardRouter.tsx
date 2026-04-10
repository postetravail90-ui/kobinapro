import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const OwnerDashboard = lazy(() => import('@/pages/app/DashboardPage'));
const ManagerDashboard = lazy(() => import('@/pages/app/ManagerDashboardPage'));

function DashboardFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground gap-2">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <span className="text-sm font-medium">Chargement du tableau de bord…</span>
    </div>
  );
}

export default function DashboardRouter() {
  const { role } = useAuth();

  if (role === 'gerant') {
    return (
      <Suspense fallback={<DashboardFallback />}>
        <ManagerDashboard />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<DashboardFallback />}>
      <OwnerDashboard />
    </Suspense>
  );
}
