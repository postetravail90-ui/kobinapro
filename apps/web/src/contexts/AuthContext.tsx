import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { registerPushNotifications } from '@/lib/push-notifications';
import { fetchUserRole, type AppRole } from '@/lib/auth-role';
import { isAccountSuspended } from '@/lib/account-suspended';
import { isFetchFailure } from '@/lib/auth-errors';
import { withUiTimeout } from '@/lib/async-timeout';
import { ROLE_RESOLVE_MAX_MS } from '@/lib/network-timeouts';
import { bootSession, persistSession, clearSession as clearOfflineSession } from '@/lib/auth/offlineAuth';
import { readVaultSync } from '@/lib/auth/sessionVault';
import type { User, Session } from '@supabase/supabase-js';

function authSessionFingerprint(s: Session | null): string {
  return s?.user?.id && s.access_token ? `${s.user.id}:${s.access_token.slice(-12)}` : '';
}

function seedRoleFromVault(userId: string): AppRole | null {
  const v = readVaultSync();
  if (v?.user_id === userId && v.role) return v.role as AppRole;
  return null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  authReady: boolean;
  loading: boolean;
  isOfflineMode: boolean;
  softSessionWarning: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  authReady: false,
  loading: true,
  isOfflineMode: false,
  softSessionWarning: false,
  signOut: async () => {},
  refreshRole: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [softSessionWarning, setSoftSessionWarning] = useState(false);
  const mountedRef = useRef(true);
  const lastSessionFingerprintRef = useRef<string>('');

  /** Résout le rôle en ligne ; en cas d’échec réseau, ne modifie pas le rôle déjà affiché (coffre). */
  const resolveRole = useCallback(async (userId: string): Promise<AppRole | null> => {
    try {
      const resolved = await withUiTimeout(
        fetchUserRole(userId),
        ROLE_RESOLVE_MAX_MS,
        'Chargement du profil'
      );
      if (mountedRef.current) setRole(resolved);
      return resolved;
    } catch (e) {
      console.warn('[Auth] resolveRole:', e);
      return null;
    }
  }, []);

  const blockIfSuspended = useCallback(async (userId: string): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }
    if (await isAccountSuspended(userId)) {
      await supabase.auth.signOut();
      await clearOfflineSession();
      if (mountedRef.current) {
        const { toast } = await import('sonner');
        toast.error('Ce compte est suspendu. Contactez le support.');
      }
      return true;
    }
    return false;
  }, []);

  /** Mise à jour immédiate de session / user / rôle (coffre) — sans attente réseau. */
  const commitSessionLocal = useCallback((next: Session | null, opts?: { force?: boolean }) => {
    if (!mountedRef.current) return;

    const fp = authSessionFingerprint(next);
    if (!opts?.force && fp && fp === lastSessionFingerprintRef.current) {
      return;
    }
    lastSessionFingerprintRef.current = next ? fp : '';

    setSession(next);
    setUser(next?.user ?? null);

    if (!next?.user) {
      setRole(null);
      return;
    }

    const seed = seedRoleFromVault(next.user.id);
    if (seed) setRole(seed);
  }, []);

  /** Vérifications serveur + persistance coffre — en arrière-plan. */
  const syncSessionRemote = useCallback(
    async (next: Session | null) => {
      if (!mountedRef.current || !next?.user) return;
      try {
        const blocked = await blockIfSuspended(next.user.id);
        if (blocked) {
          lastSessionFingerprintRef.current = '';
          setSession(null);
          setUser(null);
          setRole(null);
          return;
        }
        const resolvedRole = await resolveRole(next.user.id);
        registerPushNotifications(next.user.id).catch(() => {});
        await persistSession(next, next.user, resolvedRole);
      } catch (e) {
        console.error('[Auth] syncSessionRemote:', e);
      }
    },
    [blockIfSuspended, resolveRole]
  );

  const refreshRole = useCallback(async () => {
    const uid = user?.id;
    if (!uid) return;
    const r = await resolveRole(uid);
    if (session && user) {
      await persistSession(session, user, r);
    }
  }, [user?.id, session, user, resolveRole]);

  useEffect(() => {
    mountedRef.current = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const finishInitUI = () => {
      if (mountedRef.current) {
        setAuthReady(true);
        setLoading(false);
      }
    };

    const init = async () => {
      try {
        const offlineBoot = await bootSession();
        if (offlineBoot) {
          if (offlineBoot.isOfflineMode) {
            commitSessionLocal(offlineBoot.session, { force: true });
            setRole(offlineBoot.role);
            lastSessionFingerprintRef.current = authSessionFingerprint(offlineBoot.session);
            setIsOfflineMode(true);
            setSoftSessionWarning(offlineBoot.softSessionWarning);
          } else {
            setIsOfflineMode(false);
            setSoftSessionWarning(offlineBoot.softSessionWarning);
            commitSessionLocal(offlineBoot.session, { force: true });
            if (offlineBoot.role) setRole(offlineBoot.role);
            void syncSessionRemote(offlineBoot.session);
          }
        } else {
          const {
            data: { session: initial },
          } = await supabase.auth.getSession();
          if (!mountedRef.current) return;
          setIsOfflineMode(false);
          setSoftSessionWarning(false);
          commitSessionLocal(initial, { force: true });
          if (initial?.user) {
            const seed = seedRoleFromVault(initial.user.id);
            if (seed) setRole(seed);
            void syncSessionRemote(initial);
          }
        }
      } catch (e) {
        console.error('[Auth] init:', e);
        const fallback = await bootSession();
        if (fallback) {
          if (fallback.isOfflineMode) {
            commitSessionLocal(fallback.session, { force: true });
            setRole(fallback.role);
            lastSessionFingerprintRef.current = authSessionFingerprint(fallback.session);
            setIsOfflineMode(true);
            setSoftSessionWarning(fallback.softSessionWarning);
          } else {
            setIsOfflineMode(false);
            commitSessionLocal(fallback.session, { force: true });
            if (fallback.role) setRole(fallback.role);
            void syncSessionRemote(fallback.session);
          }
        } else if (isFetchFailure(e) && mountedRef.current) {
          setSession(null);
          setUser(null);
          setRole(null);
        }
      } finally {
        finishInitUI();
      }

      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        void (async () => {
          if (!mountedRef.current) return;
          const fp = authSessionFingerprint(nextSession);
          const duplicate = fp && fp === lastSessionFingerprintRef.current;
          if (duplicate) return;

          setLoading(true);
          try {
            if (nextSession?.user) {
              setIsOfflineMode(false);
              setSoftSessionWarning(false);
            }
            commitSessionLocal(nextSession, { force: true });
            if (nextSession?.user) {
              const seed = seedRoleFromVault(nextSession.user.id);
              if (seed) setRole(seed);
              void syncSessionRemote(nextSession);
            } else {
              setRole(null);
            }
          } finally {
            if (mountedRef.current) {
              setAuthReady(true);
              setLoading(false);
            }
          }
        })();
      });
      subscription = data.subscription;
    };

    void init();

    return () => {
      mountedRef.current = false;
      subscription?.unsubscribe();
    };
  }, [commitSessionLocal, syncSessionRemote]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[Auth] signOut warning:', e);
    }
    await clearOfflineSession();
    setUser(null);
    setSession(null);
    setRole(null);
    setIsOfflineMode(false);
    setSoftSessionWarning(false);
    setAuthReady(true);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        authReady,
        loading,
        isOfflineMode,
        softSessionWarning,
        signOut,
        refreshRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
