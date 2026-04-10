import { create } from "zustand";
import type { SyncOperation } from "@/lib/sync/queue";
import { getPendingCount, listErrors } from "@/lib/sync/queue";

export interface SyncStoreState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
  syncErrors: SyncOperation[];
  setOnline: (v: boolean) => void;
  setSyncing: (v: boolean) => void;
  setLastSyncAt: (d: Date | null) => void;
  refreshPendingCount: () => Promise<void>;
  refreshSyncErrors: () => Promise<void>;
}

export const useSyncStore = create<SyncStoreState>((set) => ({
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncAt: null,
  syncErrors: [],
  setOnline: (v) => set({ isOnline: v }),
  setSyncing: (v) => set({ isSyncing: v }),
  setLastSyncAt: (d) => set({ lastSyncAt: d }),
  refreshPendingCount: async () => {
    try {
      const pendingCount = await getPendingCount();
      set({ pendingCount });
    } catch {
      set({ pendingCount: 0 });
    }
  },
  refreshSyncErrors: async () => {
    try {
      const syncErrors = await listErrors();
      set({ syncErrors });
    } catch {
      set({ syncErrors: [] });
    }
  }
}));
