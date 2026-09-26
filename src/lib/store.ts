import { createClient } from "@supabase/supabase-js";
import { useEffect, useState, useSyncExternalStore } from "react";

export type Customer = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  defaultRate: number;
  openingPending: number;
  openingCans: number;
  notes?: string;
};

export type Txn = {
  id: string;
  customerId: string;
  date: string; // yyyy-mm-dd
  type: "delivery" | "payment";
  cans?: number;
  cansReturned?: number;
  currentStock?: number;
  rate?: number;
  amount: number; // delivery amount or payment amount (always positive)
  createdAt: number;
};

export type Expense = {
  id: string;
  date: string;
  diesel: number;
  snacksFood: number;
  serviceRepairs?: number;
  serviceNotes?: string;
  createdAt: number;
};

export type Data = { customers: Customer[]; txns: Txn[]; expenses: Expense[] };

export const RATES = [25, 30, 35, 40, 45, 50];

const KEY = "water-can-accounts-v1";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const getDateStr = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

let data: Data = {
  customers: [],
  txns: [],
  expenses: [],
};

let loaded = false;
const listeners = new Set<() => void>();

async function readSupabaseData(): Promise<Data> {
  if (!supabase) return data;
  const [customersRes, txnsRes, expensesRes] = await Promise.all([
    supabase.from("customers").select("*").order("name", { ascending: true }),
    supabase.from("transactions").select("*").order("date", { ascending: true }),
    supabase.from("expenses").select("*").order("date", { ascending: true }),
  ]);

  if (customersRes.error) throw customersRes.error;
  if (txnsRes.error) throw txnsRes.error;
  if (expensesRes.error) throw expensesRes.error;

  const customers = (customersRes.data ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    contact: c.contact ?? "",
    phone: c.phone ?? "",
    defaultRate: Number(c.defaultRate ?? 0),
    openingPending: Number(c.openingPending ?? 0),
    openingCans: Number(c.openingCans ?? 0),
    notes: c.notes ?? "",
  }));

  const txns = (txnsRes.data ?? []).map((t: any) => ({
    id: t.id,
    customerId: t.customerId,
    date: t.date,
    type: t.type,
    cans: t.cans ?? undefined,
    cansReturned: t.cansReturned ?? undefined,
    currentStock: t.currentStock ?? undefined,
    rate: t.rate ?? undefined,
    amount: Number(t.amount ?? 0),
    createdAt: Number(t.createdAt ?? Date.now()),
  }));

  const expenses = (expensesRes.data ?? []).map((e: any) => ({
    id: e.id,
    date: e.date,
    diesel: Number(e.diesel ?? 0),
    snacksFood: Number(e.snacksFood ?? 0),
    serviceRepairs: Number(e.serviceRepairs ?? 0),
    serviceNotes: e.serviceNotes ?? "",
    createdAt: Number(e.createdAt ?? Date.now()),
  }));

  return {
    customers,
    txns,
    expenses,
  };
}

async function persistToSupabase() {
  if (!supabase) return;
  const results = await Promise.all([
    supabase.from("customers").upsert(
      data.customers.map((c) => ({ ...c })),
      { onConflict: "id" },
    ),
    supabase.from("transactions").upsert(
      data.txns.map((t) => ({ ...t })),
      { onConflict: "id" },
    ),
    supabase.from("expenses").upsert(
      data.expenses.map((e) => ({ ...e })),
      { onConflict: "id" },
    ),
  ]);
  const failedResult = results.find((result) => result.error);
  if (failedResult?.error) throw failedResult.error;
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;

  if (supabase) {
    readSupabaseData()
      .then((freshData) => {
        data = freshData;
        listeners.forEach((l) => l());
      })
      .catch((err) => {
        console.error("Supabase load failed, using local fallback:", err);
        try {
          const raw = window.localStorage.getItem(KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as Partial<Data>;
            data = {
              customers: parsed.customers ?? [],
              txns: parsed.txns ?? [],
              expenses: parsed.expenses ?? [],
            };
          } else {
            data = { customers: [], txns: [], expenses: [] };
            window.localStorage.setItem(KEY, JSON.stringify(data));
          }
        } catch {
          data = { customers: [], txns: [], expenses: [] };
        }
        listeners.forEach((l) => l());
      });
    return;
  }

  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Data>;
      data = {
        customers: parsed.customers ?? [],
        txns: parsed.txns ?? [],
        expenses: parsed.expenses ?? [],
      };
    } else {
      data = { customers: [], txns: [], expenses: [] };
      window.localStorage.setItem(KEY, JSON.stringify(data));
    }
  } catch {
    data = { customers: [], txns: [], expenses: [] };
  }
}

async function persist() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  }

  try {
    await persistToSupabase();
  } catch (err) {
    console.error("Supabase write failed:", err);
  }

  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  load();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      loaded = false;
      load();
      listeners.forEach((l) => l());
    }
  });
}

export function useData(): Data {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return data;
    },
    () => data,
  );
}

const uid = () => crypto.randomUUID();

export function addCustomer(c: Omit<Customer, "id">) {
  load();
  data = { ...data, customers: [...data.customers, { ...c, id: uid() }] };
  persist();
}

export function updateCustomer(id: string, patch: Partial<Customer>) {
  load();
  data = {
    ...data,
    customers: data.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  };
  persist();
}

export function addTxn(t: Omit<Txn, "id" | "createdAt"> & { createdAt?: number }) {
  load();
  data = { ...data, txns: [...data.txns, { ...t, id: uid(), createdAt: t.createdAt ?? Date.now() }] };
  persist();
}

export function updateTxn(id: string, patch: Partial<Txn>) {
  load();
  data = { ...data, txns: data.txns.map((t) => (t.id === id ? { ...t, ...patch } : t)) };
  persist();
}

export function deleteTxn(id: string) {
  load();
  data = { ...data, txns: data.txns.filter((t) => t.id !== id) };
  persist();
}

export function upsertExpense(expense: Omit<Expense, "id" | "createdAt">) {
  load();
  const existing = data.expenses.find((item) => item.date === expense.date);
  data = {
    ...data,
    expenses: existing
      ? data.expenses.map((item) =>
          item.id === existing.id ? { ...item, ...expense, createdAt: Date.now() } : item,
        )
      : [...data.expenses, { ...expense, id: uid(), createdAt: Date.now() }],
  };
  persist();
}

export function deleteExpense(id: string) {
  load();
  data = { ...data, expenses: data.expenses.filter((expense) => expense.id !== id) };
  persist();
}

/* ---------- derived helpers (pure) ---------- */

export function sortTxns(txns: Txn[]) {
  return [...txns].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.createdAt - b.createdAt;
  });
}

export function customerTxns(d: Data, customerId: string) {
  return sortTxns(d.txns.filter((t) => t.customerId === customerId));
}

export function pendingFor(d: Data, c: Customer) {
  return customerTxns(d, c.id).reduce(
    (bal, t) => (t.type === "delivery" ? bal + t.amount : bal - t.amount),
    c.openingPending,
  );
}

export function cansWith(d: Data, customerId: string) {
  const customer = d.customers.find((c) => c.id === customerId);
  return customerTxns(d, customerId).reduce(
    (n, t) => n + (t.cans ?? 0) - (t.cansReturned ?? 0),
    customer?.openingCans ?? 0,
  );
}

export function lastPaymentDate(d: Data, customerId: string): string | null {
  const pays = customerTxns(d, customerId).filter((t) => t.type === "payment");
  return pays.length ? pays[pays.length - 1]!.date : null;
}

export function daysSince(date: string) {
  if (typeof document === "undefined") return 0;
  const ms = Date.now() - new Date(`${date}T00:00:00`).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

export function useHydratedToday(): string {
  const [today, setToday] = useState<string>("");
  useEffect(() => {
    setToday(todayISO());
  }, []);
  return today;
}

export const todayISO = () => {
  if (typeof document === "undefined") return "";
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const rupees = (n: number) => {
  const rounded = Math.round(n);
  if (rounded < 0) return `-₹${Math.abs(rounded).toLocaleString("en-IN")}`;
  return `₹${rounded.toLocaleString("en-IN")}`;
};

export const shortDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

export function filterCustomersByAlphabet(customers: Customer[], query: string): Customer[] {
  const q = query.trim().toLowerCase();
  if (!q) return customers;

  const matches = customers.filter((c) => {
    const nameLower = c.name.toLowerCase();
    if (nameLower.startsWith(q)) return true;

    // Split words by spaces, hyphens, etc.
    const words = nameLower.split(/[\s\-_\/]+/);
    if (words.some((w) => w.startsWith(q))) return true;

    // Also check contact person words
    if (c.contact) {
      const contactWords = c.contact.toLowerCase().split(/[\s\-_\/]+/);
      if (contactWords.some((w) => w.startsWith(q))) return true;
    }

    // If multi-character query and no word starts with it, fallback to substring match
    if (q.length >= 3 && nameLower.includes(q)) return true;

    return false;
  });

  // Sort results:
  // 1. Company name directly starts with q
  // 2. Any word in company name starts with q
  // 3. Alphabetical
  return matches.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();

    const aStart = aName.startsWith(q);
    const bStart = bName.startsWith(q);
    if (aStart && !bStart) return -1;
    if (!aStart && bStart) return 1;

    const aWords = aName.split(/[\s\-_\/]+/);
    const bWords = bName.split(/[\s\-_\/]+/);
    const aWordStart = aWords.some((w) => w.startsWith(q));
    const bWordStart = bWords.some((w) => w.startsWith(q));
    if (aWordStart && !bWordStart) return -1;
    if (!aWordStart && bWordStart) return 1;

    return aName.localeCompare(bName);
  });
}

