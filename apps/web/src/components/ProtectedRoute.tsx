import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { readCachedAppRole, readCachedAppRoleStale } from '@/lib/auth/roleCache';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  allowedRoles?: string[];
}

/**
 * Garde de route : session + rôle.
 * - super_admin peut accéder à /app et /admin
 * - admin_staff : uniquement /admin
 * - gérant/propriétaire : /app ; pas /admin
 * - compte sans rôle en base → écran explicite
 */
export default function ProtectedRoute({ allowedRoles }: Props) {
  const { user, role, loading, authReady, signOut } = useAuth();

  const effectiveRole =
    user != null ? role ?? readCachedAppRole(user.id) ?? readCachedAppRoleStale(user.id) : null;

  if (!user) {
    if (!authReady) {
      return (
        <div className="h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }
    return <Navigate to="/auth/login" replace />;
  }

  if (!effectiveRole && loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!effectiveRole) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-background text-center">
        <p className="text-lg font-semibold text-foreground">Profil incomplet</p>
        <p className="text-sm text-muted-foreground max-w-md">
          Aucun rôle n’est associé à votre compte. Contactez le support ou votre administrateur.
        </p>
        <Button variant="outline" onClick={() => signOut()}>
          Se déconnecter
        </Button>
      </div>
    );
  }

  if (allowedRoles) {
    if (!allowedRoles.includes(effectiveRole)) {
      if (effectiveRole === 'super_admin') {
        return <Navigate to="/admin" replace />;
      }
      if (effectiveRole === 'admin_staff') {
        return <Navigate to="/admin" replace />;
      }
      // propriétaire / gérant : espace commerçant
      if (effectiveRole === 'proprietaire' || effectiveRole === 'gerant') {
        return <Navigate to="/app" replace />;
      }
      return <Navigate to="/auth/login" replace />;
    }
  }

  return <Outlet />;
}
