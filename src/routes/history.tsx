import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExportExcel } from "@/components/ExportExcel";
import { PageNav } from "@/components/PageNav";
import { rupees, shortDate, sortTxns, useData, useHydratedToday } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — Water Can Accounts" },
      { name: "description", content: "Day, week, month or custom range transaction history." },
      { property: "og:title", content: "History — Water Can Accounts" },
      { property: "og:description", content: "Day, week, month or custom range transaction history." },
    ],
  }),
  component: HistoryPage,
});

type Filter = "day" | "week" | "month" | "custom" | "all";

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function HistoryPage() {
  const data = useData();
  const hydratedToday = useHydratedToday();
  const [company, setCompany] = useState<string>("all");
  const [filter, setFilter] = useState<Filter>("day");
  const [anchor, setAnchor] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  useEffect(() => {
    if (hydratedToday) {
      setAnchor((prev) => prev || hydratedToday);
      setTo((prev) => prev || hydratedToday);
      setFrom((prev) => prev || addDays(hydratedToday, -7));
    }
  }, [hydratedToday]);

  const range = useMemo(() => {
    if (filter === "day") return { start: anchor, end: anchor };
    if (filter === "week") {
      const d = new Date(`${anchor}T00:00:00`);
      const start = addDays(anchor, -((d.getDay() + 6) % 7));
      return { start, end: addDays(start, 6) };
    }
    if (filter === "month") {
      const start = `${anchor.slice(0, 7)}-01`;
      const d = new Date(`${start}T00:00:00`);
      d.setMonth(d.getMonth() + 1);
      const end = addDays(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
        -1,
      );
      return { start, end };
    }
    if (filter === "custom") {
      return { start: from, end: to };
    }
    return { start: "", end: "" };
  }, [filter, anchor, from, to]);

  const rows = useMemo(() => {
    let list = data.txns;
    if (company !== "all") {
      list = list.filter((t) => t.customerId === company);
    }
    if (filter !== "all") {
      list = list.filter((t) => t.date >= range.start && t.date <= range.end);
    }
    return sortTxns(list)
      .reverse()
      .map((t) => ({
        t,
        name: data.customers.find((c) => c.id === t.customerId)?.name ?? "—",
      }));
  }, [data, range, company, filter]);

  const totals = rows.reduce(
    (acc, { t }) => ({
      cans: acc.cans + (t.cans ?? 0),
      delivery: acc.delivery + (t.type === "delivery" ? t.amount : 0),
      payment: acc.payment + (t.type === "payment" ? t.amount : 0),
    }),
    { cans: 0, delivery: 0, payment: 0 },
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <ExportExcel
          defaultCompanyId={company === "all" ? null : company}
        />
      </div>

      <div className="mt-5 max-w-sm space-y-1">
        <Label htmlFor="h-company" className="text-xs">
          Company
        </Label>
        <Select value={company} onValueChange={setCompany}>
          <SelectTrigger id="h-company" className="h-10 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {data.customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-4">
        <div className="inline-flex rounded-md border border-border p-1">
          {(["day", "week", "month", "custom", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded px-3 py-1.5 text-sm capitalize transition-colors",
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {f === "all" ? "All Time" : f}
            </button>
          ))}
        </div>

        {filter === "custom" ? (
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1">
              <Label htmlFor="h-from" className="text-xs">
                From
              </Label>
              <Input
                id="h-from"
                type="date"
                className="h-10"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="h-to" className="text-xs">
                To
              </Label>
              <Input
                id="h-to"
                type="date"
                className="h-10"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
        ) : filter !== "all" ? (
          <div className="space-y-1">
            <Label htmlFor="h-anchor" className="text-xs">
              {filter === "month" ? "Month" : "Date"}
            </Label>
            <Input
              id="h-anchor"
              type="date"
              className="h-10"
              value={anchor}
              onChange={(e) => setAnchor(e.target.value)}
            />
          </div>
        ) : null}
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {filter === "all"
          ? company === "all"
            ? "Showing complete transaction history for all companies"
            : `Showing complete history for ${data.customers.find((c) => c.id === company)?.name ?? "selected company"}`
          : `Showing ${shortDate(range.start)} to ${shortDate(range.end)}${
              company !== "all"
                ? ` for ${data.customers.find((c) => c.id === company)?.name ?? "selected company"}`
                : ""
            }`}
      </p>

      <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 text-right font-medium">Cans</th>
              <th className="px-4 py-3 text-right font-medium">Rate</th>
              <th className="px-4 py-3 text-right font-medium">Delivery</th>
              <th className="px-4 py-3 text-right font-medium">Payment</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ t, name }) => (
              <tr key={t.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 whitespace-nowrap">{shortDate(t.date)}</td>
                <td className="px-4 py-3">{name}</td>
                <td className="px-4 py-3 text-right tabular-nums">{t.cans ?? "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{t.rate ? `₹${t.rate}` : "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {t.type === "delivery" ? rupees(t.amount) : "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {t.type === "payment" ? rupees(t.amount) : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No transactions in this period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          ["Total cans", String(totals.cans)],
          ["Total delivery amount", rupees(totals.delivery)],
          ["Total payments", rupees(totals.payment)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <PageNav current="/history" />
    </div>
  );
}
