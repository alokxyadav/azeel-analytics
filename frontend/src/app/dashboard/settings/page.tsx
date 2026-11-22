"use client";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/common";
import { SettingsRow } from "@/components/dashboard/settings-row";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const choose = async (t: "light" | "dark") => {
    setTheme(t);
    try { await api.auth.updateProfile({ theme: t }); await refreshUser(); } catch {}
  };
  const wipe = async () => {
    if (!confirm("Delete ALL uploaded files? This cannot be undone.")) return;
    setBusy(true);
    try {
      const files = await api.files.list();
      await Promise.all(files.map((f) => api.files.delete(f.id)));
      toast(files.length ? `Deleted ${files.length} file${files.length > 1 ? "s" : ""}.` : "There were no files to delete.", "success");
    } catch (e) { toast(e instanceof ApiError ? e.message : "Delete failed.", "error"); }
    finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Appearance, language and your data." />
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        <SettingsRow title="Appearance" desc="Choose how Azeel Analytics looks. Your choice follows you across devices.">
          <div className="inline-flex rounded-lg border border-border-strong p-0.5" role="group" aria-label="Theme">
            {(["light", "dark"] as const).map((v) => (
              <button key={v} onClick={() => choose(v)} aria-pressed={theme === v} className={cn("rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors", theme === v ? "bg-primary text-white" : "text-text-muted hover:text-text")}>{v}</button>
            ))}
          </div>
        </SettingsRow>
        <SettingsRow title="Language" desc="More languages are planned.">
          <label htmlFor="lang" className="sr-only">Language</label>
          <select id="lang" disabled className="h-10 w-48 rounded-lg border border-border-strong bg-bg-subtle px-3 text-sm text-text-muted"><option>English</option></select>
        </SettingsRow>
        <SettingsRow title="Delete all files" desc="Permanently removes every file you have uploaded, together with its analysis. Your account stays.">
          <Button variant="danger-outline" loading={busy} onClick={wipe}>Delete all files</Button>
        </SettingsRow>
      </div>
    </>
  );
}
