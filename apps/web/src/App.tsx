import React, { useState, useEffect } from 'react';
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from '@/contexts/AuthContext';
import { useNetworkSync } from '@/hooks/useNetworkSync';
import ProtectedRoute from '@/components/ProtectedRoute';
import SplashScreen from '@/components/SplashScreen';

// Layouts
import AppLayout from '@/components/layout/AppLayout';
import AdminLayout from '@/components/layout/AdminLayout';
import AppKeepAliveOutlet from '@/components/layout/AppKeepAliveOutlet';

// Auth
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';

// Landing
import LandingPage from '@/pages/LandingPage';

// App pages (eager — pas de flash Suspense à la navigation)
import PaymentSuccessPage from '@/pages/app/PaymentSuccessPage';

// Admin pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import MonitoringPage from '@/pages/admin/MonitoringPage';
import FraudePage from '@/pages/admin/FraudePage';
import AdminAbonnementsPage from '@/pages/admin/AdminAbonnementsPage';
import AnalyticsPage from '@/pages/admin/AnalyticsPage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import AdminCommercesPage from '@/pages/admin/AdminCommercesPage';
import AdminRevenuePage from '@/pages/admin/AdminRevenuePage';
import AdminSecurityPage from '@/pages/admin/AdminSecurityPage';
import AdminLogsPage from '@/pages/admin/AdminLogsPage';
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';
import AdminSupportPage from '@/pages/admin/AdminSupportPage';
import AdminTeamPage from '@/pages/admin/AdminTeamPage';

// 404
import NotFound from '@/pages/NotFound';

function AppRoutes() {
  useNetworkSync();
  return (
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
          <Route path="/app/*" element={<AppKeepAliveOutlet />} />
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
  );
}

const App = () => {
  const [showSplash, setShowSplash] = useState(() => {
    const seen = sessionStorage.getItem('splash_seen');
    return !seen;
  });

  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
        sessionStorage.setItem('splash_seen', '1');
      }, 1500);
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
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
