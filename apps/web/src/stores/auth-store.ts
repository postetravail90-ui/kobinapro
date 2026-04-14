import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { ensureOnlineOrThrow, isFetchFailure } from "@/lib/auth-errors";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  otpSent: boolean;
  init: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signInPhoneOtp: (phone: string) => Promise<void>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: false,
  otpSent: false,

  init: async () => {
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, user: data.session?.user ?? null });
    supabase.auth.onAuthStateChange((_event, nextSession) => {
      set({ session: nextSession, user: nextSession?.user ?? null });
    });
  },

  signInEmail: async (email, password) => {
    set({ loading: true });
    try {
      await ensureOnlineOrThrow();
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) throw error;
      if (data.session) {
        set({ session: data.session, user: data.session.user });
      }
    } catch (error) {
      if (isFetchFailure(error)) {
        throw new Error("Impossible de joindre le serveur. Vérifiez votre connexion.");
      }
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  signInPhoneOtp: async (phone) => {
    set({ loading: true });
    try {
      await ensureOnlineOrThrow();
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { shouldCreateUser: false }
      });
      if (error) throw error;
      set({ otpSent: true });
    } catch (error) {
      if (isFetchFailure(error)) {
        throw new Error("Impossible de joindre le serveur. Vérifiez votre connexion.");
      }
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  verifyPhoneOtp: async (phone, token) => {
    set({ loading: true });
    try {
      await ensureOnlineOrThrow();
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: "sms"
      });
      if (error) throw error;
      set({ otpSent: false });
      if (data.session) {
        set({ session: data.session, user: data.session.user });
      }
    } catch (error) {
      if (isFetchFailure(error)) {
        throw new Error("Impossible de joindre le serveur. Vérifiez votre connexion.");
      }
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null, session: null, otpSent: false });
    } finally {
      set({ loading: false });
    }
  }
}));
