import { supabase } from "@/integrations/supabase/client";

export interface QueuedMutation {
  id: string;
  type:
    | "sale"
    | "expense"
    | "credit"
    | "credit_payment"
    | "stock_adjustment"
    | "commerce_insert"
    | "commerce_delete";
  payload: Record<string, unknown>;
  createdAt: number;
  retries: number;
}

const QUEUE_KEY = "kbv1:offline-queue";

function parseQueue(raw: string | null): QueuedMutation[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as QueuedMutation[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** Tables dynamiques hors schéma typé strict — réservé à la reprise file hors ligne. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sbAny = supabase as any;

async function processMutation(m: QueuedMutation): Promise<void> {
  switch (m.type) {
    case "sale": {
      const { error } = await supabase.rpc("process_sale", m.payload as never);
      if (error) throw error;
      break;
    }
    case "expense": {
      const { error } = await supabase.from("depenses").insert(m.payload as never);
      if (error) throw error;
      break;
    }
    case "credit": {
      const { error } = await supabase.from("credits").insert(m.payload as never);
      if (error) throw error;
      break;
    }
    case "credit_payment":
    case "stock_adjustment": {
      const table = String(m.payload.__table ?? "");
      const { __table: _t, ...row } = m.payload;
      if (!table) throw new Error("missing __table");
      const { error } = await sbAny.from(table).insert(row);
      if (error) throw error;
      break;
    }
    case "commerce_insert": {
      const { error } = await supabase.from("commerces").insert(m.payload as never);
      if (error) throw error;
      break;
    }
    case "commerce_delete": {
      const id = String(m.payload.id ?? "");
      if (!id) throw new Error("missing id");
      const { error } = await supabase.from("commerces").delete().eq("id", id);
      if (error) throw error;
      break;
    }
    default:
      break;
  }
}

export const offlineQueue = {
  add(mutation: Omit<QueuedMutation, "id" | "createdAt" | "retries">): void {
    const queue = this.getAll();
    queue.push({
      ...mutation,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      retries: 0,
    });
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {
      /* ignore */
    }
  },

  getAll(): QueuedMutation[] {
    if (typeof localStorage === "undefined") return [];
    return parseQueue(localStorage.getItem(QUEUE_KEY));
  },

  remove(id: string): void {
    const queue = this.getAll().filter((m) => m.id !== id);
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {
      /* ignore */
    }
  },

  count(): number {
    return this.getAll().length;
  },

  async processAll(): Promise<void> {
    const queue = this.getAll();
    if (!queue.length) return;

    for (const mutation of queue) {
      try {
        await processMutation(mutation);
        this.remove(mutation.id);
      } catch {
        /* conservé pour retry */
      }
    }
  },
};
