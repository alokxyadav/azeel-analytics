"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, FileRecord } from "@/lib/api";
import { PageHeader, FullPageSpinner, EmptyFiles } from "@/components/dashboard/common";
import { DownloadButtons } from "@/components/dashboard/download-buttons";
import { formatDate, formatNumber } from "@/lib/utils";

export default function ReportsPage() {
  const [files, setFiles] = useState<FileRecord[] | null>(null);
  useEffect(() => { api.files.list().then(setFiles).catch(() => setFiles([])); }, []);
  if (!files) return <FullPageSpinner />;
  return (
    <>
      <PageHeader title="Reports" subtitle="Download cleaned data or a PDF summary for any file." />
      {files.length === 0 ? <EmptyFiles /> : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {files.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
              <div className="min-w-0">
                <Link href={`/dashboard/files/${f.id}`} className="block truncate text-sm font-medium hover:text-link hover:underline">{f.original_filename}</Link>
                <p className="tabular text-xs text-text-muted">{formatNumber(f.row_count)} rows · {formatDate(f.uploaded_at)}</p>
              </div>
              <DownloadButtons file={f} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
