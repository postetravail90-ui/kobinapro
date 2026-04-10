import { NavLink, Outlet } from "react-router-dom";
import { OfflineBadge } from "@kobina/ui";
import { useOfflineStore } from "../stores/offline-store";
import { useAuthStore } from "../stores/auth-store";

export function AppShell(): JSX.Element {
  const { offline, pendingCount } = useOfflineStore();
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          background: "white",
          borderBottom: "1px solid #e4e4e7",
          padding: 12,
          zIndex: 2
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <strong>KOBINA PRO</strong>
          <OfflineBadge offline={offline} pendingCount={pendingCount} />
          <button onClick={() => void signOut()}>Deconnexion</button>
        </div>
        <nav style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <NavLink to="/app/sale">Vente</NavLink>
          <NavLink to="/app/products">Produits</NavLink>
          <NavLink to="/app/credits">Credits</NavLink>
          <NavLink to="/app/expenses">Depenses</NavLink>
          <NavLink to="/app/dashboard">Dashboard</NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
