import { Link } from "@tanstack/react-router";
import { DatabaseZap, RefreshCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { clearAllData, resetToSampleData, useData } from "@/lib/store";

const links = [
  { to: "/", label: "Daily Entry" },
  { to: "/customers", label: "Customers" },
  { to: "/payments", label: "Payments" },
  { to: "/expenses", label: "Expenses" },
  { to: "/history", label: "History" },
] as const;

export function AppNav() {
  const data = useData();
  const [reloadOpen, setReloadOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  const hasAnyData =
    data.customers.length > 0 || data.txns.length > 0 || data.expenses.length > 0;

  function handleReload() {
    resetToSampleData();
    toast.success("Sample data loaded: 10 date-ordered entries across all sections");
    setReloadOpen(false);
  }

  function handleClear() {
    clearAllData();
    toast.success("All data cleared — start fresh with your own customers");
    setClearOpen(false);
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.location.href = "/";
    }
  }

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="text-base font-semibold tracking-tight">
            Water Can Accounts
          </Link>

          <AlertDialog open={reloadOpen} onOpenChange={setReloadOpen}>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Reload 10 date-ordered sample entries across all sections"
              >
                <RefreshCcw className="size-3" />
                Reload Sample Data
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <DatabaseZap className="size-5 text-primary" />
                  Reload sample data?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {hasAnyData ? (
                    <>
                      This will <span className="font-semibold text-foreground">permanently replace</span>{" "}
                      your current {data.customers.length} customers, {data.txns.length} transactions,{" "}
                      and {data.expenses.length} expense entries with the built-in sample dataset.
                    </>
                  ) : (
                    <>Load the built-in sample dataset: 10 customers, 10 days of deliveries &amp; payments, and daily expenses.</>
                  )}
                  <div className="mt-3 rounded-md border border-border bg-muted/40 p-3 text-xs">
                    <span className="font-medium text-foreground">Tip:</span> Add your own customers from the Customers
                    page once you&apos;re done exploring.
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReload}>
                  <RefreshCcw className="mr-1.5 size-4" />
                  Yes, load sample data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-[calc(1.5rem+2px)] border-destructive/40 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                title="Permanently delete all customers, transactions and expenses"
              >
                <Trash2 className="mr-1 size-3" />
                Clear All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <Trash2 className="size-5 text-destructive" />
                  Delete all data?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently erase{" "}
                  <span className="font-semibold text-foreground">
                    {data.customers.length} customers, {data.txns.length} transactions, and{" "}
                    {data.expenses.length} expense entries
                  </span>{" "}
                  from this browser. This action cannot be undone.
                  {hasAnyData && (
                    <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                      <span className="font-semibold">Warning:</span> Make sure you&apos;ve exported any records you
                      need (Excel export on the Daily Entry or customer ledger pages) before continuing.
                    </div>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep my data</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClear}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  <Trash2 className="mr-1.5 size-4" />
                  Yes, delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <nav className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                Menu
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              {links.map((l) => (
                <DropdownMenuItem key={l.to} asChild>
                  <Link
                    to={l.to}
                    activeOptions={{ exact: l.to === "/" }}
                    activeProps={{ className: "font-medium bg-accent" }}
                  >
                    {l.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <nav className="-mx-1 hidden items-center gap-1 overflow-x-auto md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              className="shrink-0 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "bg-accent text-accent-foreground font-medium" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
