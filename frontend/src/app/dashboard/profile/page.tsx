"use client";
import { useRef, useState, useEffect, FormEvent } from "react";
import { Camera, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useToast } from "@/components/ui/toast";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/auth/password-input";
import { PageHeader } from "@/components/dashboard/common";
import { SettingsRow } from "@/components/dashboard/settings-row";

function toAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const size = 160; const c = document.createElement("canvas"); c.width = c.height = size;
      const s = Math.min(img.width, img.height);
      c.getContext("2d")!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url); resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("That file is not a readable image."));
    img.src = url;
  });
}

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const router = useRouter();
  const pic = useRef<HTMLInputElement>(null);
  const [delPw, setDelPw] = useState(""); const [delBusy, setDelBusy] = useState(false); const [delErr, setDelErr] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [cur, setCur] = useState(""); const [next, setNext] = useState(""); const [pwBusy, setPwBusy] = useState(false); const [pwErr, setPwErr] = useState("");
  useEffect(() => { if (user) setName(user.name); }, [user]);
  if (!user) return null;

  const saveName = async (e: FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await api.auth.updateProfile({ name }); await refreshUser(); toast("Profile saved.", "success"); }
    catch (err) { toast(err instanceof ApiError ? err.message : "Could not save.", "error"); }
    finally { setSaving(false); }
  };
  const upload = async (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast("Choose an image file.", "error");
    try { await api.auth.updateProfile({ profile_picture: await toAvatar(f) }); await refreshUser(); toast("Profile picture updated.", "success"); }
    catch (err) { toast(err instanceof Error ? err.message : "Upload failed.", "error"); }
  };
  const changePw = async (e: FormEvent) => {
    e.preventDefault(); setPwErr("");
    if (next.length < 8) return setPwErr("New password must be at least 8 characters.");
    setPwBusy(true);
    try { await api.auth.changePassword(cur, next); setCur(""); setNext(""); toast("Password changed.", "success"); }
    catch (err) { setPwErr(err instanceof ApiError ? err.message : "Could not change the password."); }
    finally { setPwBusy(false); }
  };
  const deleteAccount = async (e: FormEvent) => {
    e.preventDefault(); setDelErr("");
    if (!confirm("Permanently delete your account and every file you uploaded? This cannot be undone.")) return;
    setDelBusy(true);
    try { await api.auth.deleteAccount(delPw); toast("Your account was deleted.", "success"); await refreshUser(); router.push("/"); }
    catch (err) { setDelErr(err instanceof ApiError ? err.message : "Could not delete the account."); setDelBusy(false); }
  };
  const pickTheme = async (t: "light" | "dark") => { setTheme(t); try { await api.auth.updateProfile({ theme: t }); } catch {} };

  return (
    <>
      <PageHeader title="Profile" subtitle="Your account details." action={<Button variant="secondary" onClick={logout}><LogOut className="h-4 w-4" aria-hidden />Log out</Button>} />
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        <SettingsRow title="Picture" desc="Shown in the top bar. Square images work best.">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary text-xl font-semibold text-white">
                {user.profile_picture ? <img src={user.profile_picture} alt="Your profile picture" className="h-full w-full object-cover" /> : user.name.charAt(0).toUpperCase()}
              </div>
              <button onClick={() => pic.current?.click()} aria-label="Change profile picture" className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border-strong bg-surface text-text-muted hover:text-text"><Camera className="h-3.5 w-3.5" /></button>
              <input ref={pic} type="file" accept="image/*" className="sr-only" aria-label="Upload a profile picture" onChange={(e) => upload(e.target.files?.[0])} />
            </div>
          </div>
        </SettingsRow>
        <SettingsRow title="Details" desc="Your name is shown in the dashboard. Your email is used to sign in.">
          <form onSubmit={saveName} className="max-w-sm space-y-4">
            <div><Label htmlFor="n">Name</Label><Input id="n" value={name} onChange={(e) => setName(e.target.value)} minLength={2} required /></div>
            <div><Label htmlFor="e">Email</Label><Input id="e" value={user.email} disabled /></div>
            <Button type="submit" loading={saving}>Save changes</Button>
          </form>
        </SettingsRow>
        <SettingsRow title="Theme" desc="Light or dark appearance.">
          <div className="inline-flex rounded-lg border border-border-strong p-0.5" role="group" aria-label="Theme">
            {(["light", "dark"] as const).map((t) => <button key={t} type="button" onClick={() => pickTheme(t)} aria-pressed={theme === t} className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${theme === t ? "bg-primary text-white" : "text-text-muted hover:text-text"}`}>{t}</button>)}
          </div>
        </SettingsRow>
        <SettingsRow title="Password" desc="Changing it signs you out on every other device.">
          <form onSubmit={changePw} className="max-w-sm space-y-4">
            {pwErr && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{pwErr}</p>}
            <div><Label htmlFor="cp">Current password</Label><PasswordInput id="cp" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} required /></div>
            <div><Label htmlFor="np">New password</Label><PasswordInput id="np" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required /></div>
            <Button type="submit" loading={pwBusy}>Update password</Button>
          </form>
        </SettingsRow>
        <SettingsRow title="Delete account" desc="Permanently removes your account and every file you uploaded. Enter your password to confirm.">
          <form onSubmit={deleteAccount} className="max-w-sm space-y-4">
            {delErr && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{delErr}</p>}
            <div><Label htmlFor="dp">Password</Label><PasswordInput id="dp" autoComplete="current-password" value={delPw} onChange={(e) => setDelPw(e.target.value)} required /></div>
            <Button type="submit" variant="danger" loading={delBusy}>Delete my account</Button>
          </form>
        </SettingsRow>
      </div>
    </>
  );
}
