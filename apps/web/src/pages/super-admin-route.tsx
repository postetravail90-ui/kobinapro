import { Navigate } from "react-router-dom";
import { useAppRole } from "../hooks/use-app-role";

export function SuperAdminRoute({ children }: { children: JSX.Element }): JSX.Element {
  const role = useAppRole();
  if (role.isLoading) {
    return <div style={{ padding: 16 }}>Verification des droits...</div>;
  }
  if (role.data !== "superadmin") {
    return <Navigate to="/app" replace />;
  }
  return children;
}
