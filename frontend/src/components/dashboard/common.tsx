import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const FullPageSpinner = () => (
  <div className="flex h-[50vh] items-center justify-center" role="status">
    <Loader2 className="h-6 w-6 animate-spin text-text-muted" aria-hidden />
    <span className="sr-only">Loading</span>
  </div>
);

export const PageHeader = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-xl font-semibold sm:text-2xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
    </div>
    {action}
  </div>
);

export const EmptyFiles = () => (
  <div className="rounded-xl border border-dashed border-border-strong bg-surface px-6 py-12 text-center">
    <p className="font-medium">No files yet</p>
    <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">Upload a CSV or Excel file and its data quality report, statistics and charts will appear here.</p>
    <Link href="/dashboard/upload" className="mt-5 inline-block"><Button>Upload a file</Button></Link>
  </div>
);

/** Shared table styling so every data table in the app looks the same. */
export const table = {
  wrap: "overflow-x-auto",
  base: "w-full text-sm",
  head: "bg-bg-subtle text-left text-xs font-medium text-text-muted",
  th: "px-4 py-2.5 font-medium whitespace-nowrap",
  row: "border-t border-border",
  td: "px-4 py-2.5 whitespace-nowrap",
};
