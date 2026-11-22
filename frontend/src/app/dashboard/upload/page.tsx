"use client";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileSpreadsheet, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/common";
import { useToast } from "@/components/ui/toast";
import { LIMITS } from "@/lib/limits";
import { formatBytes } from "@/lib/utils";

const MAX = LIMITS.maxFileMb * 1024 * 1024;
const OK = [".csv", ".xlsx"];

function readText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

function headRows(text: string, n = 5): string[][] {
  return text.split(/\r?\n/).filter(Boolean).slice(0, n + 1).map((l) => l.split(",").map((c) => c.replace(/^"|"$/g, "")).slice(0, 8));
}

export default function UploadPage() {
  const router = useRouter();
  const { toast } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string[][] | null>(null);

  useEffect(() => {
    setPreview(null);
    if (!file || !file.name.toLowerCase().endsWith(".csv")) return;
    let current = true;
    // The preview is a nicety: if it fails for any reason, uploading still works.
    readText(file.slice(0, 64 * 1024)).then((t) => current && setPreview(headRows(t))).catch(() => current && setPreview(null));
    return () => { current = false; };
  }, [file]);

  const pick = (f?: File) => {
    setError("");
    if (!f) return;
    const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
    if (!OK.includes(ext)) { setFile(null); return setError(`“${f.name}” is not supported. Choose a .csv or .xlsx file.`); }
    if (f.size > MAX) { setFile(null); return setError(`That file is ${formatBytes(f.size)}. The limit is ${LIMITS.maxFileMb} MB.`); }
    if (f.size === 0) { setFile(null); return setError("That file is empty."); }
    setFile(f);
  };

  const upload = async () => {
    if (!file) return;
    setBusy(true); setProgress(0); setError("");
    try {
      const rec = await api.files.upload(file, setProgress);
      toast("File analyzed.", "success");
      router.push(`/dashboard/files/${rec.id}`);
    } catch (e) { setError(e instanceof ApiError ? e.message : "Upload failed."); setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Upload a file" subtitle={`CSV or Excel (.xlsx), up to ${LIMITS.maxFileMb} MB.`} />
      <div className="max-w-2xl space-y-5">
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
          className={`rounded-xl border border-dashed p-10 text-center transition-colors ${drag ? "border-primary bg-primary/5" : "border-border-strong bg-surface"}`}
        >
          <UploadCloud className="mx-auto h-8 w-8 text-text-muted" aria-hidden />
          <p className="mt-3 font-medium">Drag and drop your file here</p>
          <p className="mb-4 text-sm text-text-muted">or choose it from your computer</p>
          <input ref={input} id="file" type="file" accept=".csv,.xlsx" className="sr-only" aria-label="Choose a file to upload" onChange={(e) => pick(e.target.files?.[0])} />
          <Button variant="secondary" onClick={() => input.current?.click()} disabled={busy}>Choose file</Button>
        </div>
        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}

        {file && (
          <div className="animate-fade-up rounded-xl border border-border bg-surface">
            <div className="flex items-center gap-3 p-4">
              <FileSpreadsheet className="h-6 w-6 shrink-0 text-text-muted" aria-hidden />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="tabular text-xs text-text-muted">{formatBytes(file.size)}</p></div>
              {!busy && <button aria-label="Remove file" onClick={() => setFile(null)} className="rounded-md p-1 text-text-muted hover:bg-bg-subtle hover:text-text"><X className="h-4 w-4" /></button>}
            </div>
            {preview && (
              <div className="overflow-x-auto border-t border-border">
                <p className="bg-bg-subtle px-4 py-2 text-xs font-medium text-text-muted">First rows</p>
                <table className="tabular w-full text-xs"><tbody>{preview.map((r, i) => <tr key={i} className={i === 0 ? "bg-bg-subtle/60 font-medium" : "border-t border-border"}>{r.map((c, j) => <td key={j} className="max-w-[12rem] truncate whitespace-nowrap px-4 py-1.5">{c}</td>)}</tr>)}</tbody></table>
              </div>
            )}
            <div className="border-t border-border p-4">
              {busy && (
                <div className="mb-4" role="progressbar" aria-label="Upload progress" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                  <div className="mb-1.5 flex justify-between text-xs text-text-muted"><span>{progress < 100 ? "Uploading" : "Analyzing your data"}</span><span className="tabular">{progress}%</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
                </div>
              )}
              <Button onClick={upload} loading={busy}>Upload and analyze</Button>
            </div>
          </div>
        )}
        <p className="text-xs text-text-muted">Files are checked before they are stored and are visible only to your account.</p>
      </div>
    </>
  );
}
