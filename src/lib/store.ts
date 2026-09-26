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

const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"];
const supabaseAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"];

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
let dataGeneration = 0;
const listeners = new Set<() => void>();

async function requireSignedInUser() {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data: sessionData, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!sessionData.session) throw new Error("Sign in before accessing account data");
}

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

async function upsertSupabaseRow(
  table: "customers" | "transactions" | "expenses",
  row: Record<string, unknown>,
) {
  if (!supabase) return;
  await requireSignedInUser();
  await upsertSupabaseRows(table, [row]);
}

async function upsertSupabaseRows(
  table: "customers" | "transactions" | "expenses",
  rows: Record<string, unknown>[],
) {
  if (!supabase) return;
  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: "id" });
    if (error) throw error;
  }
}

async function deleteSupabaseRow(table: "transactions" | "expenses", id: string) {
  if (!supabase) return;
  await requireSignedInUser();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

function publishData(nextData: Data) {
  data = nextData;
  if (typeof window !== "undefined" && !supabase) {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  }
  listeners.forEach((listener) => listener());
}

function readLocalBackup(): Data {
  if (typeof window === "undefined") return { customers: [], txns: [], expenses: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { customers: [], txns: [], expenses: [] };
    const parsed = JSON.parse(raw) as Partial<Data>;
    return {
      customers: Array.isArray(parsed.customers) ? parsed.customers : [],
      txns: Array.isArray(parsed.txns) ? parsed.txns : [],
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
    };
  } catch {
    return { customers: [], txns: [], expenses: [] };
  }
}

export function getLocalBackupSummary() {
  if (typeof window === "undefined") return { customers: 0, txns: 0, expenses: 0 };
  if (window.localStorage.getItem(`${KEY}-imported-shared`) === "true") {
    return { customers: 0, txns: 0, expenses: 0 };
  }
  const backup = readLocalBackup();
  return {
    customers: backup.customers.length,
    txns: backup.txns.length,
    expenses: backup.expenses.length,
  };
}

export async function importLocalBackup() {
  if (!supabase || typeof window === "undefined") throw new Error("Supabase is not available");
  await requireSignedInUser();
  const backup = readLocalBackup();
  const remote = await readSupabaseData();
  const customerIdMap = new Map<string, string>();
  const customersToInsert: Customer[] = [];

  for (const oldCustomer of backup.customers) {
    const existing = [...remote.customers, ...customersToInsert].find(
      (customer) =>
        customer.id === oldCustomer.id ||
        customer.name.trim().toLowerCase() === oldCustomer.name.trim().toLowerCase(),
    );
    const customerId = existing?.id ?? uid();
    customerIdMap.set(oldCustomer.id, customerId);
    if (!existing) {
      customersToInsert.push({ ...oldCustomer, id: customerId });
    }
  }

  const existingTxnIds = new Set(remote.txns.map((txn) => txn.id));
  const txnSignatures = new Set(
    remote.txns.map((txn) =>
      JSON.stringify([
        txn.customerId, txn.date, txn.type, txn.createdAt, txn.amount,
        txn.cans ?? null, txn.cansReturned ?? null, txn.rate ?? null,
      ]),
    ),
  );
  const txnsToInsert: Txn[] = [];

  for (const oldTxn of backup.txns) {
    const customerId = customerIdMap.get(oldTxn.customerId);
    if (!customerId) {
      throw new Error("A saved transaction refers to a missing local customer; no data was imported.");
    }
    const signature = JSON.stringify([
      customerId, oldTxn.date, oldTxn.type, oldTxn.createdAt, oldTxn.amount,
      oldTxn.cans ?? null, oldTxn.cansReturned ?? null, oldTxn.rate ?? null,
    ]);
    if (existingTxnIds.has(oldTxn.id) || txnSignatures.has(signature)) continue;
    const txn = {
      ...oldTxn,
      id: uid(),
      customerId,
    };
    txnsToInsert.push(txn);
    existingTxnIds.add(txn.id);
    txnSignatures.add(signature);
  }

  const existingExpenseDates = new Set(remote.expenses.map((expense) => expense.date));
  const expensesToInsert: Expense[] = [];
  for (const oldExpense of backup.expenses) {
    if (existingExpenseDates.has(oldExpense.date)) continue;
    existingExpenseDates.add(oldExpense.date);
    expensesToInsert.push({ ...oldExpense, id: uid() });
  }

  await upsertSupabaseRows("customers", customersToInsert);
  await upsertSupabaseRows("transactions", txnsToInsert);
  await upsertSupabaseRows("expenses", expensesToInsert);
  await reloadData();
  window.localStorage.setItem(`${KEY}-imported-shared`, "true");

  return {
    customers: customersToInsert.length,
    txns: txnsToInsert.length,
    expenses: expensesToInsert.length,
  };
}

export async function reloadData() {
  if (!supabase) throw new Error("Supabase is not configured");
  const generation = dataGeneration;
  await requireSignedInUser();
  const freshData = await readSupabaseData();
  if (generation !== dataGeneration) return;
  data = freshData;
  loaded = true;
  listeners.forEach((listener) => listener());
}

export function clearCachedData() {
  dataGeneration += 1;
  data = { customers: [], txns: [], expenses: [] };
  loaded = false;
  listeners.forEach((listener) => listener());
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;

  if (supabase) {
    const generation = dataGeneration;
    requireSignedInUser()
      .then(() => readSupabaseData())
      .then((freshData) => {
        if (generation !== dataGeneration) return;
        data = freshData;
        listeners.forEach((l) => l());
      })
      .catch((err) => {
        if (generation !== dataGeneration) return;
        console.error("Supabase load failed:", err);
        data = { customers: [], txns: [], expenses: [] };
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

export async function addCustomer(c: Omit<Customer, "id">) {
  load();
  const customer = { ...c, id: uid() };
  await upsertSupabaseRow("customers", customer);
  publishData({ ...data, customers: [...data.customers, customer] });
}

export async function updateCustomer(id: string, patch: Partial<Customer>) {
  load();
  const current = data.customers.find((customer) => customer.id === id);
  if (!current) throw new Error("Customer was not found");
  const customer = { ...current, ...patch, id };
  await upsertSupabaseRow("customers", customer);
  publishData({ ...data, customers: data.customers.map((item) => item.id === id ? customer : item) });
}

export async function addTxn(t: Omit<Txn, "id" | "createdAt"> & { createdAt?: number }) {
  load();
  const txn = { ...t, id: uid(), createdAt: t.createdAt ?? Date.now() };
  await upsertSupabaseRow("transactions", txn);
  publishData({ ...data, txns: [...data.txns, txn] });
}

export async function updateTxn(id: string, patch: Partial<Txn>) {
  load();
  const current = data.txns.find((txn) => txn.id === id);
  if (!current) throw new Error("Transaction was not found");
  const txn = { ...current, ...patch, id };
  await upsertSupabaseRow("transactions", txn);
  publishData({ ...data, txns: data.txns.map((item) => item.id === id ? txn : item) });
}

export async function deleteTxn(id: string) {
  load();
  await deleteSupabaseRow("transactions", id);
  publishData({ ...data, txns: data.txns.filter((txn) => txn.id !== id) });
}

export async function upsertExpense(expense: Omit<Expense, "id" | "createdAt">) {
  load();
  const existing = data.expenses.find((item) => item.date === expense.date);
  const savedExpense = existing
    ? { ...existing, ...expense, createdAt: Date.now() }
    : { ...expense, id: uid(), createdAt: Date.now() };
  await upsertSupabaseRow("expenses", savedExpense);
  publishData({
    ...data,
    expenses: existing
      ? data.expenses.map((item) => item.id === existing.id ? savedExpense : item)
      : [...data.expenses, savedExpense],
  });
}

export async function deleteExpense(id: string) {
  load();
  await deleteSupabaseRow("expenses", id);
  publishData({ ...data, expenses: data.expenses.filter((expense) => expense.id !== id) });
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

