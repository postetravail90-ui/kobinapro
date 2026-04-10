import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import * as queue from "./queue";
import { useSyncStore } from "@/store/syncStore";

let intervalId: ReturnType<typeof setInterval> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let started = false;

const flush = async () => {
  useSyncStore.getState().setSyncing(true);
  try {
    await queue.processQueue();
    useSyncStore.getState().setLastSyncAt(new Date());
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[sync-engine] processQueue", e);
  } finally {
    useSyncStore.getState().setSyncing(false);
    await useSyncStore.getState().refreshPendingCount();
    await useSyncStore.getState().refreshSyncErrors();
  }
};

export function triggerSyncFlush(): void {
  void flush();
}

/**
 * Déclenche un flush avec délai (après écritures locales).
 */
export function scheduleQueueFlushDebounced(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void flush();
  }, 2000);
}

/**
 * Réseau revenu, app au premier plan, intervalle 60s, flush initial.
 */
/**
 * Réseau : `startNetworkWatcher` dans main.tsx appelle `triggerSyncFlush` au retour en ligne.
 * Ici : premier flush, intervalle, et retour au premier plan (natif).
 */
export function startOfflineFirstSyncEngine(): void {
  if (started) return;
  started = true;

  void flush();

  if (Capacitor.isNativePlatform()) {
    void App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void flush();
    });
  }

  intervalId = setInterval(() => void flush(), 60_000);
}

export function stopOfflineFirstSyncEngine(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  started = false;
}
