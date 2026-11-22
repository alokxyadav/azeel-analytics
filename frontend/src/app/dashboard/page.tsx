"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Trash2 } from "lucide-react";
import { api, FileRecord, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, FullPageSpinner, EmptyFiles, table } from "@/components/dashboard/common";
import { formatBytes, formatDate, formatNumber } from "@/lib/utils";

function Overview() {
  const { user } = useAuth();
  const { toast } = useToast();
  const q = (useSearchParams().get("q") || "").toLowerCase();
  const [files, setFiles] = useState<FileRecord[] | null>(null);
  const [error, setError] = useState("");

  const load = () => api.files.list().then(setFiles).catch((e) => setError(e instanceof ApiError ? e.message : "Could not load files."));
  useEffect(() => { load(); }, []);

  const remove = async (f: FileRecord) => {
    if (!confirm(`Delete ${f.original_filename}? This cannot be undone.`)) return;
    try { await api.files.delete(f.id); toast("File deleted.", "success"); load(); } catch (e) { toast(e instanceof ApiError ? e.message : "Delete failed.", "error"); }
  };

  if (error) return <p role="alert" className="text-red-700 dark:text-red-300">{error}</p>;
  if (!files) return <FullPageSpinner />;
  const shown = files.filter((f) => f.original_filename.toLowerCase().includes(q));
  const totalRows = files.reduce((n, f) => n + f.row_count, 0);
  const totalSize = files.reduce((n, f) => n + f.size_bytes, 0);

  return (
    <>
      <PageHeader title="Files" subtitle={`Signed in as ${user?.email}`} action={<Link href="/dashboard/upload"><Button>Upload file</Button></Link>} />
      <dl className="mb-6 grid grid-cols-3 divide-x divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {[["Files", formatNumber(files.length)], ["Rows analyzed", formatNumber(totalRows)], ["Storage used", formatBytes(totalSize)]].map(([k, v]) => (
          <div key={k} className="px-4 py-3.5 sm:px-5"><dt className="text-xs text-text-muted">{k}</dt><dd className="tabular mt-0.5 text-lg font-medium sm:text-2xl">{v}</dd></div>
        ))}
      </dl>
      {files.length === 0 ? <EmptyFiles /> : (
        <section aria-label="Your files" className="overflow-hidden rounded-xl border border-border bg-surface">
          {q && <p className="border-b border-border px-4 py-2.5 text-sm text-text-muted">{shown.length} result{shown.length === 1 ? "" : "s"} for “{q}”</p>}
          <div className={table.wrap}>
            <table className={table.base}>
              <thead className={table.head}>
                <tr><th scope="col" className={table.th}>Name</th><th scope="col" className={`${table.th} hidden sm:table-cell`}>Type</th><th scope="col" className={`${table.th} text-right`}>Rows</th><th scope="col" className={`${table.th} hidden text-right md:table-cell`}>Columns</th><th scope="col" className={`${table.th} hidden text-right md:table-cell`}>Size</th><th scope="col" className={`${table.th} hidden lg:table-cell`}>Uploaded</th><th scope="col" className={table.th}><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {shown.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-text-muted">No files match that search.</td></tr>}
                {shown.map((f) => (
                  <tr key={f.id} className={`${table.row} hover:bg-bg-subtle/60`}>
                    <td className={`${table.td} max-w-[16rem] truncate`}><Link href={`/dashboard/files/${f.id}`} className="font-medium text-text hover:text-link hover:underline">{f.original_filename}</Link></td>
                    <td className={`${table.td} hidden sm:table-cell`}><Badge variant="neutral" className="uppercase">{f.file_type}</Badge></td>
                    <td className={`${table.td} tabular text-right`}>{formatNumber(f.row_count)}</td>
                    <td className={`${table.td} tabular hidden text-right md:table-cell`}>{f.column_count}</td>
                    <td className={`${table.td} tabular hidden text-right text-text-muted md:table-cell`}>{formatBytes(f.size_bytes)}</td>
                    <td className={`${table.td} hidden text-text-muted lg:table-cell`}>{formatDate(f.uploaded_at)}</td>
                    <td className={`${table.td} text-right`}>
                      <Button variant="ghost" size="icon" aria-label={`Delete ${f.original_filename}`} onClick={() => remove(f)}><Trash2 className="h-4 w-4" aria-hidden /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
export default function Page() { return <Suspense fallback={<FullPageSpinner />}><Overview /></Suspense>; }
