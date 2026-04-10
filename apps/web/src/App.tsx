import React, { useState, useEffect, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import SplashScreen from '@/components/SplashScreen';

// Layouts
import AppLayout from '@/components/layout/AppLayout';
import AdminLayout from '@/components/layout/AdminLayout';

// Auth (eager – small)
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';

// Landing
import LandingPage from '@/pages/LandingPage';

// App pages (lazy)
const appImports = {
  DashboardPage: () => import('@/pages/app/DashboardPage'),
  ManagerDashboardPage: () => import('@/pages/app/ManagerDashboardPage'),
  CommercesPage: () => import('@/pages/app/CommercesPage'),
  ProduitsPage: () => import('@/pages/app/ProduitsPage'),
  GerantsPage: () => import('@/pages/app/GerantsPage'),
  SessionsPage: () => import('@/pages/app/SessionsPage'),
  FacturesPage: () => import('@/pages/app/FacturesPage'),
  CreditsPage: () => import('@/pages/app/CreditsPage'),
  DepensesPage: () => import('@/pages/app/DepensesPage'),
  ParrainagePage: () => import('@/pages/app/ParrainagePage'),
  AbonnementsPage: () => import('@/pages/app/AbonnementsPage'),
  ParametresPage: () => import('@/pages/app/ParametresPage'),
  NotificationsPage: () => import('@/pages/app/NotificationsPage'),
  NotificationSettingsPage: () => import('@/pages/app/NotificationSettingsPage'),
  MessagesPage: () => import('@/pages/app/MessagesPage'),
  FidelitePage: () => import('@/pages/app/FidelitePage'),
  BeneficePage: () => import('@/pages/app/BeneficePage'),
  PaymentSuccessPage: () => import('@/pages/app/PaymentSuccessPage'),
};

const adminImports = {
  AdminDashboard: () => import('@/pages/admin/AdminDashboard'),
  MonitoringPage: () => import('@/pages/admin/MonitoringPage'),
  FraudePage: () => import('@/pages/admin/FraudePage'),
  AdminAbonnementsPage: () => import('@/pages/admin/AdminAbonnementsPage'),
  AnalyticsPage: () => import('@/pages/admin/AnalyticsPage'),
  AdminUsersPage: () => import('@/pages/admin/AdminUsersPage'),
  AdminCommercesPage: () => import('@/pages/admin/AdminCommercesPage'),
  AdminRevenuePage: () => import('@/pages/admin/AdminRevenuePage'),
  AdminSecurityPage: () => import('@/pages/admin/AdminSecurityPage'),
  AdminLogsPage: () => import('@/pages/admin/AdminLogsPage'),
  AdminSettingsPage: () => import('@/pages/admin/AdminSettingsPage'),
  AdminSupportPage: () => import('@/pages/admin/AdminSupportPage'),
};

const DashboardPage = lazy(appImports.DashboardPage);
const ManagerDashboardPage = lazy(appImports.ManagerDashboardPage);
const DashboardRouter = lazy(() => import('@/pages/app/DashboardRouter'));
const CommercesPage = lazy(appImports.CommercesPage);
const ProduitsPage = lazy(appImports.ProduitsPage);
const GerantsPage = lazy(appImports.GerantsPage);
const SessionsPage = lazy(appImports.SessionsPage);
const FacturesPage = lazy(appImports.FacturesPage);
const CreditsPage = lazy(appImports.CreditsPage);
const DepensesPage = lazy(appImports.DepensesPage);
const ParrainagePage = lazy(appImports.ParrainagePage);
const AbonnementsPage = lazy(appImports.AbonnementsPage);
const ParametresPage = lazy(appImports.ParametresPage);
const NotificationsPage = lazy(appImports.NotificationsPage);
const NotificationSettingsPage = lazy(appImports.NotificationSettingsPage);
const MessagesPage = lazy(appImports.MessagesPage);
const FidelitePage = lazy(appImports.FidelitePage);
const BeneficePage = lazy(appImports.BeneficePage);
const PaymentSuccessPage = lazy(appImports.PaymentSuccessPage);

const AdminDashboard = lazy(adminImports.AdminDashboard);
const MonitoringPage = lazy(adminImports.MonitoringPage);
const FraudePage = lazy(adminImports.FraudePage);
const AdminAbonnementsPage = lazy(adminImports.AdminAbonnementsPage);
const AnalyticsPage = lazy(adminImports.AnalyticsPage);
const AdminUsersPage = lazy(adminImports.AdminUsersPage);
const AdminCommercesPage = lazy(adminImports.AdminCommercesPage);
const AdminRevenuePage = lazy(adminImports.AdminRevenuePage);
const AdminSecurityPage = lazy(adminImports.AdminSecurityPage);
const AdminLogsPage = lazy(adminImports.AdminLogsPage);
const AdminSettingsPage = lazy(adminImports.AdminSettingsPage);
const AdminSupportPage = lazy(adminImports.AdminSupportPage);
const AdminTeamPage = lazy(() => import('@/pages/admin/AdminTeamPage'));

// Précharge les chunks après le premier rendu (évite no-unused-expressions avec ?? sur void)
const preloadAllChunks = () => {
  const run = () => {
    Object.values(appImports).forEach((fn) => {
      void fn();
    });
    Object.values(adminImports).forEach((fn) => {
      void fn();
    });
  };
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(run);
  } else {
    setTimeout(run, 2000);
  }
};

// 404
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});

// Minimal loading fallback — never show blank page
const Loading = React.forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref} className="h-[100dvh] bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
        <div className="w-5 h-5 rounded-full bg-primary/40" />
      </div>
      <p className="text-xs text-muted-foreground font-medium">Chargement…</p>
    </div>
  </div>
));
Loading.displayName = 'Loading';

const App = () => {
  const [showSplash, setShowSplash] = useState(() => {
    const seen = sessionStorage.getItem('splash_seen');
    return !seen;
  });

  useEffect(() => {
    // Preload all page chunks in background
    preloadAllChunks();

    if (showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
        sessionStorage.setItem('splash_seen', '1');
      }, 1500); // Reduced from 2500ms to 1500ms for faster startup
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <SplashScreen show={showSplash} />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<Loading />}>
              <Routes>
                {/* Public */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Navigate to="/auth/login" replace />} />
                <Route path="/auth/login" element={<LoginPage />} />
                <Route path="/auth/register" element={<RegisterPage />} />
                <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/payment-success" element={<PaymentSuccessPage />} />

                {/* App - Protected */}
                <Route element={<ProtectedRoute allowedRoles={['proprietaire', 'gerant', 'super_admin']} />}>
                  <Route element={<AppLayout />}>
                    <Route path="/app" element={<DashboardRouter />} />
                    <Route path="/app/commerces" element={<CommercesPage />} />
                    <Route path="/app/produits" element={<ProduitsPage />} />
                    <Route path="/app/gerants" element={<GerantsPage />} />
                    <Route path="/app/sessions" element={<SessionsPage />} />
                    <Route path="/app/caisse" element={<SessionsPage />} />
                    <Route path="/app/factures" element={<FacturesPage />} />
                    <Route path="/app/credits" element={<CreditsPage />} />
                    <Route path="/app/depenses" element={<DepensesPage />} />
                    <Route path="/app/parrainage" element={<ParrainagePage />} />
                    <Route path="/app/abonnements" element={<AbonnementsPage />} />
                    <Route path="/app/parametres" element={<ParametresPage />} />
                    <Route path="/app/notifications" element={<NotificationsPage />} />
                    <Route path="/app/notifications/settings" element={<NotificationSettingsPage />} />
                    <Route path="/app/messages" element={<MessagesPage />} />
                    <Route path="/app/benefice" element={<BeneficePage />} />
                    <Route path="/app/fidelite" element={<FidelitePage />} />
                  </Route>
                </Route>

                {/* Admin - Protected */}
                <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin_staff']} />}>
                  <Route element={<AdminLayout />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/team" element={<AdminTeamPage />} />
                    <Route path="/admin/users" element={<AdminUsersPage />} />
                    <Route path="/admin/commerces" element={<AdminCommercesPage />} />
                    <Route path="/admin/monitoring" element={<MonitoringPage />} />
                    <Route path="/admin/fraude" element={<FraudePage />} />
                    <Route path="/admin/abonnements" element={<AdminAbonnementsPage />} />
                    <Route path="/admin/analytics" element={<AnalyticsPage />} />
                    <Route path="/admin/revenue" element={<AdminRevenuePage />} />
                    <Route path="/admin/security" element={<AdminSecurityPage />} />
                    <Route path="/admin/logs" element={<AdminLogsPage />} />
                    <Route path="/admin/settings" element={<AdminSettingsPage />} />
                    <Route path="/admin/support" element={<AdminSupportPage />} />
                  </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
