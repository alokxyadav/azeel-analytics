"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";

function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result)); r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

interface Result { name: string; rows: number; cols: number; missing: number; dupes: number }

export function UploadDemo() {
  const ref = useRef<HTMLInputElement>(null);
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(false);

  const handle = async (f?: File) => {
    setErr(""); setRes(null);
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv")) return setErr("The demo reads .csv files. Create a free account to analyze Excel files too.");
    if (f.size > 5 * 1024 * 1024) return setErr("The demo accepts files up to 5 MB. An account accepts up to 100 MB.");
    try {
      const data = parseCsv(await readText(f));
      if (data.length < 2) return setErr("That file has no data rows.");
      const body = data.slice(1);
      const missing = body.reduce((n, r) => n + r.filter((v) => v.trim() === "").length, 0);
      const dupes = body.length - new Set(body.map((r) => r.join("\u0001"))).size;
      setRes({ name: f.name, rows: body.length, cols: data[0].length, missing, dupes });
    } catch { setErr("That file could not be read."); }
  };

  return (
    <section id="demo" className="border-t border-border bg-bg-subtle">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-14 md:py-20">
        <div className="md:sticky md:top-24 md:self-start">
          <h2 className="text-2xl font-semibold md:text-[28px] md:leading-tight">Try it on your own file</h2>
          <p className="mt-3 max-w-sm text-text-muted">The demo runs entirely in your browser. Your file is not uploaded anywhere.</p>
        </div>
        <div className="min-w-0">
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
            className={`rounded-xl border border-dashed bg-surface p-8 text-center transition-colors sm:p-10 ${drag ? "border-primary bg-primary/5" : "border-border-strong"}`}
          >
            <UploadCloud className="mx-auto h-8 w-8 text-text-muted" aria-hidden />
            <p className="mt-3 font-medium">Drop a CSV file here</p>
            <p className="mb-4 text-sm text-text-muted">or choose one from your computer</p>
            <input ref={ref} type="file" accept=".csv" className="sr-only" id="demo-file" aria-label="Choose a CSV file" onChange={(e) => handle(e.target.files?.[0])} />
            <Button variant="secondary" onClick={() => ref.current?.click()}>Choose file</Button>
          </div>
          {err && <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">{err}</p>}
          {res && (
            <div className="mt-6 animate-fade-up" role="status">
              <p className="tabular mb-3 text-sm text-text-muted">{res.name}</p>
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
                {[["Rows", res.rows], ["Columns", res.cols], ["Missing cells", res.missing], ["Duplicate rows", res.dupes]].map(([l, v]) => (
                  <div key={l as string} className="bg-surface px-4 py-3.5">
                    <dt className="text-xs text-text-muted">{l}</dt>
                    <dd className="tabular mt-0.5 text-2xl font-medium">{(v as number).toLocaleString("en-US")}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-sm text-text-muted">Create an account to see statistics, charts and downloadable reports for this file. <Link href="/signup" className="font-medium text-link underline underline-offset-4">Sign up free</Link></p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
