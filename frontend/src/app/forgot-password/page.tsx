"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try { await api.auth.forgotPassword(email); setDone(true); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Request failed."); }
    finally { setLoading(false); }
  };
  return (
    <AuthShell title="Reset your password" subtitle="Enter your account email and we will send a reset link.">
      {done ? <p role="status" className="rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm px-3 py-3">If an account exists for that email, a reset link has been sent. The link is valid for 30 minutes.</p> : (
        <form onSubmit={submit} className="space-y-4">
          {error && <div role="alert" className="rounded-lg bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300 text-sm px-3 py-2">{error}</div>}
          <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <Button type="submit" className="w-full" loading={loading}>Send reset link</Button>
        </form>
      )}
      <p className="mt-6 text-sm text-center"><Link href="/login" className="text-link hover:underline">Back to log in</Link></p>
    </AuthShell>
  );
}
