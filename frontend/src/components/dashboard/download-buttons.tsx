"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { api, FileRecord, ApiError } from "@/lib/api";

export function DownloadButtons({ file }: { file: FileRecord }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const base = file.original_filename.replace(/\.[^.]+$/, "");
  const items = [
    { f: "csv", label: "CSV", name: `${base}_cleaned.csv` },
    { f: "excel", label: "Excel", name: `${base}_cleaned.xlsx` },
    { f: "pdf", label: "PDF summary", name: `${base}_summary.pdf` },
  ] as const;
  const go = async (i: (typeof items)[number]) => {
    setBusy(i.f);
    try { await api.reports.download(file.id, i.f, i.name); toast(`${i.label} downloaded.`, "success"); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Download failed.", "error"); }
    finally { setBusy(null); }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => <Button key={i.f} variant="secondary" size="sm" loading={busy === i.f} onClick={() => go(i)}><Download className="h-3.5 w-3.5" aria-hidden />{i.label}</Button>)}
    </div>
  );
}
