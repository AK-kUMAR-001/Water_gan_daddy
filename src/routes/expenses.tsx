import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageNav } from "@/components/PageNav";
import {
  deleteExpense,
  rupees,
  upsertExpense,
  useData,
  useHydratedToday,
  type Expense,
} from "@/lib/store";

const DIESEL_OPTIONS = [0, 200, 300, 350, 400, 450, 500, 550, 600, 700];

export const Route = createFileRoute("/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses — Water Can Accounts" },
      { name: "description", content: "Record day-wise diesel, snacks, and food expenses." },
      { property: "og:title", content: "Expenses — Water Can Accounts" },
      { property: "og:description", content: "Record day-wise diesel, snacks, and food expenses." },
    ],
  }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const data = useData();
  const hydratedToday = useHydratedToday();
  const [date, setDate] = useState<string>("");

  useEffect(() => {
    if (hydratedToday) setDate((prev) => prev || hydratedToday);
  }, [hydratedToday]);
  const [diesel, setDiesel] = useState("");
  const [snacksFood, setSnacksFood] = useState("");
  const [serviceRepairs, setServiceRepairs] = useState("");
  const [serviceNotes, setServiceNotes] = useState("");

  const selectedExpense = data.expenses.find((expense) => expense.date === date);
  useEffect(() => {
    setDiesel(selectedExpense?.diesel ? String(selectedExpense.diesel) : "");
    setSnacksFood(selectedExpense?.snacksFood ? String(selectedExpense.snacksFood) : "");
    setServiceRepairs(selectedExpense?.serviceRepairs ? String(selectedExpense.serviceRepairs) : "");
    setServiceNotes(selectedExpense?.serviceNotes ?? "");
  }, [
    date,
    selectedExpense?.id,
    selectedExpense?.diesel,
    selectedExpense?.snacksFood,
    selectedExpense?.serviceRepairs,
    selectedExpense?.serviceNotes,
  ]);

  const expenses = useMemo(
    () => [...data.expenses].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt)),
    [data.expenses],
  );

  const totals = useMemo(() => {
    return expenses.reduce(
      (acc, exp) => ({
        diesel: acc.diesel + exp.diesel,
        snacksFood: acc.snacksFood + exp.snacksFood,
        serviceRepairs: acc.serviceRepairs + (exp.serviceRepairs || 0),
        grandTotal: acc.grandTotal + exp.diesel + exp.snacksFood + (exp.serviceRepairs || 0),
      }),
      { diesel: 0, snacksFood: 0, serviceRepairs: 0, grandTotal: 0 },
    );
  }, [expenses]);

  async function save() {
    const dieselAmt = Math.max(0, Math.floor(Number(diesel || 0)));
    const foodAmt = Math.max(0, Math.floor(Number(snacksFood || 0)));
    const repairsAmt = Math.max(0, Math.floor(Number(serviceRepairs || 0)));

    if (dieselAmt === 0 && foodAmt === 0 && repairsAmt === 0) {
      toast.error("Enter payment amount for at least one expense");
      return;
    }

    const exp: Omit<Expense, "id" | "createdAt"> = {
      date,
      diesel: dieselAmt,
      snacksFood: foodAmt,
      serviceRepairs: repairsAmt,
    };
    const trimmed = serviceNotes.trim();
    if (trimmed) exp["serviceNotes"] = trimmed;
    try {
      await upsertExpense(exp);
    } catch (err) {
      toast.error(err instanceof Error ? `Expense save failed: ${err.message}` : "Expense save failed.");
      return;
    }
    toast.success(`Expenses saved for ${date}`);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
      <p className="mt-1 text-sm text-muted-foreground">Keep diesel, snacks, and food costs by day.</p>

      <div className="mt-6 rounded-lg border border-border bg-card p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-3 sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="expense-date">Date</Label>
            <Input
              id="expense-date"
              type="date"
              className="h-11"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="expense-diesel">Diesel (₹)</Label>
              <div className="flex items-center gap-1">
                {[300, 500, 800].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDiesel(String(amt))}
                    className="rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-muted-foreground">
                ₹
              </span>
              <Input
                id="expense-diesel"
                inputMode="numeric"
                className="h-11 pl-8"
                placeholder="0"
                value={diesel}
                onFocus={(e) => e.target.select()}
                onChange={(event) => {
                  const raw = event.target.value.replace(/[^0-9]/g, "");
                  setDiesel(raw.replace(/^0+/, "") || (raw === "0" ? "0" : ""));
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="snacks-food">Snacks & food (₹)</Label>
              <div className="flex items-center gap-1">
                {[50, 100, 150].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setSnacksFood(String(amt))}
                    className="rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-muted-foreground">
                ₹
              </span>
              <Input
                id="snacks-food"
                inputMode="numeric"
                className="h-11 pl-8"
                placeholder="0"
                value={snacksFood}
                onFocus={(e) => e.target.select()}
                onChange={(event) => {
                  const raw = event.target.value.replace(/[^0-9]/g, "");
                  setSnacksFood(raw.replace(/^0+/, "") || (raw === "0" ? "0" : ""));
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3 sm:items-end">
          <div className="space-y-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="service-repairs">Service & repairs (₹)</Label>
              <div className="flex items-center gap-1">
                {[200, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setServiceRepairs(String(amt))}
                    className="rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-muted-foreground">
                ₹
              </span>
              <Input
                id="service-repairs"
                inputMode="numeric"
                className="h-11 pl-8"
                placeholder="0"
                value={serviceRepairs}
                onFocus={(e) => e.target.select()}
                onChange={(event) => {
                  const raw = event.target.value.replace(/[^0-9]/g, "");
                  setServiceRepairs(raw.replace(/^0+/, "") || (raw === "0" ? "0" : ""));
                }}
              />
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="service-notes" className="text-xs text-muted-foreground">
              Service / repair notes (optional)
            </Label>
            <Input
              id="service-notes"
              className="h-11 text-xs"
              placeholder="e.g. Oil change, tyre puncture, brake check..."
              value={serviceNotes}
              onChange={(e) => setServiceNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Daily total:{" "}
            <span className="text-base font-bold text-foreground">
              {rupees(Number(diesel || 0) + Number(snacksFood || 0) + Number(serviceRepairs || 0))}
            </span>
          </p>
          <Button type="button" className="h-11 px-6" onClick={save}>
            Save expenses
          </Button>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Day-wise expenses</h2>
      <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 text-right font-medium">Diesel</th>
              <th className="px-4 py-3 text-right font-medium">Snacks & food</th>
              <th className="px-4 py-3 text-right font-medium">Service & repairs</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 whitespace-nowrap">{new Date(`${expense.date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                <td className="px-4 py-3 text-right tabular-nums">{expense.diesel > 0 ? rupees(expense.diesel) : "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{expense.snacksFood > 0 ? rupees(expense.snacksFood) : "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {expense.serviceRepairs && expense.serviceRepairs > 0 ? (
                    <div>
                      <span>{rupees(expense.serviceRepairs)}</span>
                      {expense.serviceNotes && (
                        <div className="text-[11px] text-muted-foreground truncate max-w-[140px] ml-auto">
                          {expense.serviceNotes}
                        </div>
                      )}
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{rupees(expense.diesel + expense.snacksFood + (expense.serviceRepairs || 0))}</td>
                <td className="px-4 py-3 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 text-destructive hover:text-destructive"
                    onClick={async () => {
                      try {
                        await deleteExpense(expense.id);
                      } catch (err) {
                        toast.error(err instanceof Error ? `Delete failed: ${err.message}` : "Delete failed.");
                        return;
                      }
                      if (date === expense.date) {
                        setDiesel("");
                        setSnacksFood("");
                        setServiceRepairs("");
                        setServiceNotes("");
                      }
                      toast.success("Expense removed");
                    }}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No expenses recorded yet</td></tr>}
          </tbody>
          {expenses.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right tabular-nums">{rupees(totals.diesel)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{rupees(totals.snacksFood)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{rupees(totals.serviceRepairs)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{rupees(totals.grandTotal)}</td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <PageNav current="/expenses" />
    </div>
  );
}