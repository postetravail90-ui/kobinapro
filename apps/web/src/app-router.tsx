import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/login-page";
import { useAuthStore } from "./stores/auth-store";
import { AppShell } from "./pages/app-shell";
import { SalesPage } from "./pages/sales-page";
import { ProductsPage } from "./pages/products-page";
import { CreditsPage } from "./pages/credits-page";
import { ExpensesPage } from "./pages/expenses-page";
import { DashboardPage } from "./pages/dashboard-page";
import { AdminDashboardPage } from "./pages/admin-dashboard-page";
import { SuperAdminRoute } from "./pages/super-admin-route";

function ProtectedRoute({ children }: { children: JSX.Element }): JSX.Element {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/auth/login" replace />;
  return children;
}

export function AppRouter(): JSX.Element {
  const init = useAuthStore((s) => s.init);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? "/app" : "/auth/login"} replace />} />
      <Route path="/auth/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <SuperAdminRoute>
              <AdminDashboardPage />
            </SuperAdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/app/sale" replace />} />
        <Route path="sale" element={<SalesPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="credits" element={<CreditsPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
