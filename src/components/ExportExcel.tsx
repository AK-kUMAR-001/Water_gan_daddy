import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportDailyEntriesExcel, exportLedgerExcel } from "@/lib/export";
import { todayISO, useData } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ExportExcel({
  defaultCompanyId,
  dailyDate,
  className,
}: {
  defaultCompanyId?: string | null;
  dailyDate?: string;
  className?: string;
}) {
  const data = useData();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (dailyDate !== undefined) {
      if (!dailyDate) {
        toast.error("Choose a date to export");
        return;
      }
      setBusy(true);
      try {
        await exportDailyEntriesExcel(data, dailyDate);
        toast.success(`Exported all entries for ${dailyDate}`);
      } catch (e) {
        console.error(e);
        toast.error("Could not create the Excel file");
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    try {
      const companyToExport = defaultCompanyId ?? null;
      await exportLedgerExcel(data, companyToExport, todayISO());
      toast.success(
        companyToExport === null
          ? "Exported every company — one sheet each"
          : "Exported company ledger",
      );
    } catch (e) {
      console.error(e);
      toast.error("Could not create the Excel file");
    } finally {
      setBusy(false);
    }
  }

  if (dailyDate !== undefined) {
    return (
      <Button
        type="button"
        variant="outline"
        className={cn("h-9 gap-2", className)}
        disabled={busy || !dailyDate}
        onClick={run}
      >
        <Download className="size-4" />
        {busy ? "Preparing..." : "Today Excel"}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={cn("h-11 gap-2", className)}
      disabled={busy}
      onClick={run}
    >
      <Download className="size-4" />
      {busy ? "Preparing..." : "Export Excel"}
    </Button>
  );
}
