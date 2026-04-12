import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { registerPushNotifications } from '@/lib/push-notifications';
import { fetchUserRole, type AppRole } from '@/lib/auth-role';
import { isAccountSuspended } from '@/lib/account-suspended';
import { isFetchFailure } from '@/lib/auth-errors';
import { withUiTimeout } from '@/lib/async-timeout';
import { ROLE_RESOLVE_MAX_MS } from '@/lib/network-timeouts';
import {
  bootSession,
  persistSession,
  clearSession as clearOfflineSession,
  minimalUserFromVault,
  syntheticSessionFromVault,
} from '@/lib/auth/offlineAuth';
import { readVaultSync } from '@/lib/auth/sessionVault';
import { getStoredSupabaseSession } from '@/lib/auth/storedSupabaseSession';
import { mergeUserWithLocalProfile, writeLocalUserProfile } from '@/lib/auth/localUserProfileCache';
import { readCachedAppRole, readCachedAppRoleStale, writeCachedAppRole } from '@/lib/auth/roleCache';
import type { User, Session } from '@supabase/supabase-js';

function authSessionFingerprint(s: Session | null): string {
  return s?.user?.id && s.access_token ? `${s.user.id}:${s.access_token.slice(-12)}` : '';
}

function seedRoleFromVault(userId: string): AppRole | null {
  const v = readVaultSync();
  if (v?.user_id === userId && v.role) return v.role as AppRole;
  return readCachedAppRole(userId) ?? readCachedAppRoleStale(userId);
}

interface InitialAuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  authReady: boolean;
  loading: boolean;
}

/** Premier rendu sans réseau : coffre web, puis jeton Supabase en localStorage, puis cache de rôle. */
function readInitialAuthState(): InitialAuthState {
  const v = readVaultSync();
  if (v?.access_token && v?.user_id) {
    const user = mergeUserWithLocalProfile(minimalUserFromVault(v));
    const session = syntheticSessionFromVault(v, user);
    const role = ((v.role as AppRole) ?? readCachedAppRole(v.user_id)) || null;
    return { user, session, role, authReady: true, loading: false };
  }

  const stored = getStoredSupabaseSession();
  if (stored?.user?.id && stored.access_token) {
    const uid = stored.user.id;
    const user = mergeUserWithLocalProfile(stored.user);
    const session = { ...stored, user } as Session;
    const role = readCachedAppRole(uid) ?? readCachedAppRoleStale(uid);
    return {
      user,
      session,
      role,
      authReady: true,
      loading: role == null,
    };
  }

  return { user: null, session: null, role: null, authReady: false, loading: true };
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
  const bootOnce = useRef<InitialAuthState | null>(null);
  if (bootOnce.current === null) {
    bootOnce.current = readInitialAuthState();
  }
  const boot = bootOnce.current;
  const [user, setUser] = useState<User | null>(() => boot.user);
  const [session, setSession] = useState<Session | null>(() => boot.session);
  const [role, setRole] = useState<AppRole | null>(() => boot.role);
  const [loading, setLoading] = useState(() => boot.loading);
  const [authReady, setAuthReady] = useState(() => boot.authReady);
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
      if (resolved) writeCachedAppRole(userId, resolved);
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
    const u = next?.user ?? null;
    setUser(u);
    if (u) writeLocalUserProfile(u);

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

    const snap = bootOnce.current;
    if (snap.user?.id && snap.role == null) {
      void resolveRole(snap.user.id).finally(() => {
        if (mountedRef.current) setLoading(false);
      });
    }

    const finishColdBoot = () => {
      if (mountedRef.current) {
        setAuthReady(true);
        setLoading(false);
      }
    };

    const reconcile = async () => {
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
          void supabase.auth
            .getSession()
            .then(({ data: { session: initial } }) => {
              if (!mountedRef.current) return;
              if (initial?.user) {
                setIsOfflineMode(false);
                setSoftSessionWarning(false);
                commitSessionLocal(initial, { force: true });
                const seed = seedRoleFromVault(initial.user.id);
                if (seed) setRole(seed);
                void syncSessionRemote(initial);
              } else {
                const stillLocal = getStoredSupabaseSession() ?? readVaultSync()?.access_token;
                if (!stillLocal) {
                  setIsOfflineMode(false);
                  setSoftSessionWarning(false);
                  commitSessionLocal(null, { force: true });
                }
              }
              finishColdBoot();
            })
            .catch(() => finishColdBoot());
          return;
        }
      } catch (e) {
        console.error('[Auth] reconcile:', e);
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
          const stillLocal = getStoredSupabaseSession() ?? readVaultSync()?.access_token;
          if (!stillLocal) {
            setSession(null);
            setUser(null);
            setRole(null);
          }
        }
      }
      finishColdBoot();
    };

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void (async () => {
        if (!mountedRef.current) return;
        const fp = authSessionFingerprint(nextSession);
        const duplicate = fp && fp === lastSessionFingerprintRef.current;
        if (duplicate) return;

        if (!nextSession?.user) setLoading(true);
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

    void reconcile();

    return () => {
      mountedRef.current = false;
      subscription?.unsubscribe();
    };
  }, [commitSessionLocal, syncSessionRemote, resolveRole]);

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
