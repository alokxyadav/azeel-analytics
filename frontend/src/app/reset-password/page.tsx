"use client";
import { Suspense, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordInput } from "@/components/auth/password-input";
import { Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";

function ResetForm() {
  const token = useSearchParams().get("token") || "";
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError("");
    if (pw.length < 8) return setError("Use at least 8 characters.");
    setLoading(true);
    try { await api.auth.resetPassword(token, pw); router.push("/login"); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Could not reset the password."); }
    finally { setLoading(false); }
  };
  if (!token) return <p className="text-sm text-red-700 dark:text-red-300">This link is missing its token. <Link href="/forgot-password" className="text-link underline">Request a new one</Link>.</p>;
  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <div role="alert" className="rounded-lg bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300 text-sm px-3 py-2">{error}</div>}
      <div><Label htmlFor="pw">New password</Label><PasswordInput id="pw" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
      <Button type="submit" className="w-full" loading={loading}>Set new password</Button>
    </form>
  );
}
export default function ResetPasswordPage() {
  return <AuthShell title="Choose a new password" subtitle="Use at least 8 characters."><Suspense><ResetForm /></Suspense></AuthShell>;
}
