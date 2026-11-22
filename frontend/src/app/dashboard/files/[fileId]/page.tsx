"use client";
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { api, DataPreview, AnalyticsResponse, ChartDataset, ApiError } from "@/lib/api";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FullPageSpinner, table } from "@/components/dashboard/common";
import { DownloadButtons } from "@/components/dashboard/download-buttons";
import { cn, formatNumber, formatBytes, friendlyType } from "@/lib/utils";

const Charts = dynamic(() => import("@/components/dashboard/charts"), { ssr: false, loading: () => <FullPageSpinner /> });
const TABS = ["Data", "Statistics", "Charts", "Reports"] as const;
type Tab = (typeof TABS)[number];
const warn = "text-amber-700 dark:text-amber-300";

function DataTab({ id, initial }: { id: string; initial: DataPreview }) {
  const [d, setD] = useState(initial);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setTerm(search); setPage(1); }, 350); return () => clearTimeout(t); }, [search]);
  useEffect(() => {
    let live = true; setLoading(true);
    api.analytics.preview(id, page, 20, term, sortBy, dir).then((r) => live && setD(r)).catch(() => {}).finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [id, page, term, sortBy, dir]);

  const sort = (c: string) => { if (sortBy === c) setDir(dir === "asc" ? "desc" : "asc"); else { setSortBy(c); setDir("asc"); } setPage(1); };
  const cols = d.columns.map((c) => c.name);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>Rows</CardTitle>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
          <input aria-label="Search rows" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search all columns" className="h-9 w-full rounded-lg border border-border bg-bg-subtle pl-9 pr-3 text-sm focus-visible:bg-surface focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-0" />
        </div>
      </CardHeader>
      <div className={cn(table.wrap, "transition-opacity", loading && "opacity-60")}>
        <table className={table.base}>
          <thead className={table.head}>
            <tr>{cols.map((c) => (
              <th key={c} scope="col" aria-sort={sortBy === c ? (dir === "asc" ? "ascending" : "descending") : "none"} className={table.th}>
                <button onClick={() => sort(c)} className="inline-flex items-center gap-1 hover:text-text">{c}{sortBy === c && (dir === "asc" ? <ArrowUp className="h-3 w-3" aria-hidden /> : <ArrowDown className="h-3 w-3" aria-hidden />)}</button>
              </th>
            ))}</tr>
          </thead>
          <tbody>
            {d.preview_rows.length === 0 ? <tr><td colSpan={cols.length} className="px-4 py-10 text-center text-text-muted">No rows match “{term}”.</td></tr> : d.preview_rows.map((r, i) => (
              <tr key={i} className={`${table.row} hover:bg-bg-subtle/60`}>
                {cols.map((c) => { const v = r[c]; return <td key={c} className={`${table.td} tabular max-w-[16rem] truncate`}>{v === null || v === undefined ? <span className={warn}>missing</span> : String(v)}</td>; })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
        <span className="tabular text-text-muted">{formatNumber(d.total_rows)} rows · page {d.page} of {d.total_pages}</span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="secondary" size="sm" disabled={page >= d.total_pages} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </Card>
  );
}

function StatsTab({ s, columns }: { s: AnalyticsResponse; columns: DataPreview["columns"] }) {
  const num = `${table.td} tabular text-right`;
  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <CardHeader><CardTitle>Columns</CardTitle></CardHeader>
        <div className={table.wrap}><table className={table.base}>
          <thead className={table.head}><tr><th scope="col" className={table.th}>Column</th><th scope="col" className={table.th}>Type</th><th scope="col" className={`${table.th} text-right`}>Missing</th><th scope="col" className={`${table.th} text-right`}>Unique</th></tr></thead>
          <tbody>{columns.map((c) => (
            <tr key={c.name} className={table.row}>
              <td className={`${table.td} tabular font-medium`}>{c.name}</td>
              <td className={table.td}><Badge variant="neutral">{friendlyType(c.dtype)}</Badge></td>
              <td className={`${num} ${c.missing_count > 0 ? warn : "text-text-muted"}`}>{c.missing_count > 0 ? `${formatNumber(c.missing_count)} (${c.missing_pct}%)` : "0"}</td>
              <td className={`${num} text-text-muted`}>{formatNumber(c.unique_count)}</td>
            </tr>))}</tbody>
        </table></div>
      </Card>
      {s.numeric_stats.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader><CardTitle>Numeric columns</CardTitle></CardHeader>
          <div className={table.wrap}><table className={table.base}>
            <thead className={table.head}><tr>{["Column", "Average", "Median", "Minimum", "Maximum", "Std. deviation", "Nulls", "Unique"].map((h, i) => <th key={h} scope="col" className={`${table.th} ${i > 0 ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
            <tbody>{s.numeric_stats.map((r) => (
              <tr key={r.column} className={table.row}>
                <td className={`${table.td} tabular font-medium`}>{r.column}</td>
                <td className={num}>{formatNumber(r.mean)}</td><td className={num}>{formatNumber(r.median)}</td>
                <td className={num}>{formatNumber(r.minimum)}</td><td className={num}>{formatNumber(r.maximum)}</td>
                <td className={num}>{formatNumber(r.std_dev)}</td><td className={num}>{r.nulls}</td><td className={num}>{formatNumber(r.unique)}</td>
              </tr>))}</tbody>
          </table></div>
        </Card>
      )}
      {s.categorical_stats.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader><CardTitle>Text and date columns</CardTitle></CardHeader>
          <div className={table.wrap}><table className={table.base}>
            <thead className={table.head}><tr><th scope="col" className={table.th}>Column</th><th scope="col" className={`${table.th} text-right`}>Unique values</th><th scope="col" className={`${table.th} text-right`}>Nulls</th></tr></thead>
            <tbody>{s.categorical_stats.map((r) => <tr key={r.column} className={table.row}><td className={`${table.td} tabular font-medium`}>{r.column}</td><td className={num}>{formatNumber(r.unique)}</td><td className={num}>{r.nulls}</td></tr>)}</tbody>
          </table></div>
        </Card>
      )}
    </div>
  );
}

export default function FilePage({ params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = use(params);
  const [tab, setTab] = useState<Tab>("Data");
  const [preview, setPreview] = useState<DataPreview | null>(null);
  const [stats, setStats] = useState<AnalyticsResponse | null>(null);
  const [charts, setCharts] = useState<ChartDataset[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([api.analytics.preview(fileId), api.analytics.summary(fileId)]);
      setPreview(p); setStats(s);
    } catch (e) { setError(e instanceof ApiError ? (e.status === 404 ? "This file no longer exists." : e.message) : "Could not load this file."); }
  }, [fileId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === "Charts" && !charts) api.analytics.charts(fileId).then(setCharts).catch(() => setCharts([])); }, [tab, charts, fileId]);

  if (error) return <div><Link href="/dashboard" className="text-sm text-link hover:underline">← Files</Link><p role="alert" className="mt-4 text-red-700 dark:text-red-300">{error}</p></div>;
  if (!preview || !stats) return <FullPageSpinner />;
  const f = preview.file;
  const issues = stats.total_missing_cells > 0 || stats.duplicate_rows > 0;

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-text-muted"><Link href="/dashboard" className="hover:text-text">Files</Link><span aria-hidden className="mx-2">/</span><span className="text-text">{f.original_filename}</span></nav>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="break-all text-xl font-semibold sm:text-2xl">{f.original_filename}</h1>
        <Badge variant="neutral" className="uppercase">{f.file_type}</Badge>
        <span className="tabular text-xs text-text-muted">{formatBytes(f.size_bytes)}</span>
      </div>

      <dl className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-5">
        {[["Rows", formatNumber(f.row_count), false], ["Columns", String(f.column_count), false], ["Missing cells", formatNumber(stats.total_missing_cells), stats.total_missing_cells > 0], ["Duplicate rows", formatNumber(stats.duplicate_rows), stats.duplicate_rows > 0], ["Numeric columns", String(stats.numeric_stats.length), false]].map(([k, v, w]) => (
          <div key={k as string} className="bg-surface px-4 py-3.5 last:col-span-2 sm:last:col-span-1"><dt className="text-xs text-text-muted">{k as string}</dt><dd className={cn("tabular mt-0.5 text-xl font-medium", w && warn)}>{v as string}</dd></div>
        ))}
      </dl>

      {issues && (
        <p className="mb-5 rounded-lg border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-500/10 dark:text-amber-100" role="note">
          This file has {stats.total_missing_cells > 0 && `${formatNumber(stats.total_missing_cells)} missing cells`}{stats.total_missing_cells > 0 && stats.duplicate_rows > 0 && " and "}{stats.duplicate_rows > 0 && `${formatNumber(stats.duplicate_rows)} duplicate rows`}. The Statistics tab shows which columns are affected.
        </p>
      )}

      <div role="tablist" aria-label="File views" className="mb-5 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors", tab === t ? "border-primary text-text" : "border-transparent text-text-muted hover:text-text")}>{t}</button>)}
      </div>
      <div role="tabpanel">
        {tab === "Data" && <DataTab id={fileId} initial={preview} />}
        {tab === "Statistics" && <StatsTab s={stats} columns={preview.columns} />}
        {tab === "Charts" && (!charts ? <FullPageSpinner /> : charts.length === 0 ? <Card className="p-10 text-center text-text-muted">This file has no columns that suit a chart. Charts appear for categories with a few distinct values and for numeric columns.</Card> : <Charts charts={charts} />)}
        {tab === "Reports" && <Card className="max-w-2xl p-5"><h2 className="text-sm font-semibold">Download reports</h2><p className="mb-4 mt-1 text-sm text-text-muted">Cleaned exports drop fully empty rows and trim extra spaces. The PDF contains the summary statistics.</p><DownloadButtons file={f} /></Card>}
      </div>
    </>
  );
}
