import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { registerPushNotifications } from '@/lib/push-notifications';
import { fetchUserRole, type AppRole } from '@/lib/auth-role';
import { isAccountSuspended } from '@/lib/account-suspended';
import { isFetchFailure } from '@/lib/auth-errors';
import { withUiTimeout } from '@/lib/async-timeout';
import { ROLE_RESOLVE_MAX_MS } from '@/lib/network-timeouts';
import { bootSession, persistSession, clearSession as clearOfflineSession } from '@/lib/auth/offlineAuth';
import type { User, Session } from '@supabase/supabase-js';

function authSessionFingerprint(s: Session | null): string {
  return s?.user?.id && s.access_token ? `${s.user.id}:${s.access_token.slice(-12)}` : '';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  authReady: boolean;
  loading: boolean;
  /** Session dérivée du coffre local sans réseau (JWT expiré mais période de grâce). */
  isOfflineMode: boolean;
  /** JWT expiré depuis plus de 30 jours — accès maintenu, bandeau possible. */
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
      if (mountedRef.current) setRole(null);
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

  const applySession = useCallback(
    async (next: Session | null, opts?: { force?: boolean }) => {
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
        console.error('[Auth] résolution rôle:', e);
        setRole(null);
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

    const init = async () => {
      try {
        const offlineBoot = await bootSession();
        if (offlineBoot) {
          if (offlineBoot.isOfflineMode) {
            setSession(offlineBoot.session);
            setUser(offlineBoot.user);
            setRole(offlineBoot.role);
            lastSessionFingerprintRef.current = authSessionFingerprint(offlineBoot.session);
            setIsOfflineMode(true);
            setSoftSessionWarning(offlineBoot.softSessionWarning);
          } else {
            setIsOfflineMode(false);
            setSoftSessionWarning(offlineBoot.softSessionWarning);
            await applySession(offlineBoot.session, { force: true });
          }
        } else {
          const {
            data: { session: initial },
          } = await supabase.auth.getSession();
          if (!mountedRef.current) return;
          setIsOfflineMode(false);
          setSoftSessionWarning(false);
          await applySession(initial, { force: true });
        }
      } catch (e) {
        console.error('[Auth] init:', e);
        const fallback = await bootSession();
        if (fallback) {
          if (fallback.isOfflineMode) {
            setSession(fallback.session);
            setUser(fallback.user);
            setRole(fallback.role);
            lastSessionFingerprintRef.current = authSessionFingerprint(fallback.session);
            setIsOfflineMode(true);
            setSoftSessionWarning(fallback.softSessionWarning);
          } else {
            await applySession(fallback.session, { force: true });
            setIsOfflineMode(false);
          }
        } else if (isFetchFailure(e) && mountedRef.current) {
          setSession(null);
          setUser(null);
          setRole(null);
        }
      } finally {
        if (mountedRef.current) {
          setAuthReady(true);
          setLoading(false);
        }
      }

      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        void (async () => {
          if (!mountedRef.current) return;
          const fp = authSessionFingerprint(nextSession);
          const duplicate = fp && fp === lastSessionFingerprintRef.current;
          if (!duplicate) setLoading(true);
          try {
            if (nextSession?.user) {
              setIsOfflineMode(false);
              setSoftSessionWarning(false);
            }
            await applySession(nextSession);
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
  }, [applySession]);

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
