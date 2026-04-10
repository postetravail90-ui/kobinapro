import { create } from "zustand";

interface OfflineState {
  offline: boolean;
  pendingCount: number;
  setOffline: (offline: boolean) => void;
  setPendingCount: (count: number) => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  offline: typeof navigator !== "undefined" ? !navigator.onLine : false,
  pendingCount: 0,
  setOffline: (offline) => set({ offline }),
  setPendingCount: (pendingCount) => set({ pendingCount })
}));
