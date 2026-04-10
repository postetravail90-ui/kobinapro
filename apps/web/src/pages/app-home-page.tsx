import { useAuthStore } from "../stores/auth-store";
import { OfflineBadge } from "@kobina/ui";

export function AppHomePage(): JSX.Element {
  const { user, signOut, loading } = useAuthStore();
  return (
    <main style={{ padding: 16, fontFamily: "Inter, system-ui, sans-serif" }}>
      <h1>KOBINA PRO - Espace App</h1>
      <p>Connecte en tant que: {user?.email ?? user?.phone ?? "Utilisateur"}</p>
      <OfflineBadge offline={false} pendingCount={0} />
      <div style={{ marginTop: 12 }}>
        <button disabled={loading} onClick={() => void signOut()}>
          Se deconnecter
        </button>
      </div>
    </main>
  );
}
