"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordInput } from "@/components/auth/password-input";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await login(email, password, remember); router.push("/dashboard"); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Could not log in."); }
    finally { setLoading(false); }
  };
  return (
    <AuthShell title="Welcome back" subtitle="Log in to see your dashboards and reports.">
      <form onSubmit={submit} className="space-y-4">
        {error && <div role="alert" className="rounded-lg bg-red-500/10 text-red-700 dark:text-red-300 text-sm px-3 py-2">{error}</div>}
        <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></div>
        <div>
          <div className="flex items-center justify-between"><Label htmlFor="password">Password</Label><Link href="/forgot-password" className="text-xs text-link hover:underline mb-1.5">Forgot password?</Link></div>
          <PasswordInput id="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-text-muted"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-primary" />Keep me logged in on this device</label>
        <Button type="submit" className="w-full" loading={loading}>Log in <ArrowRight className="h-4 w-4" /></Button>
      </form>
      <p className="mt-6 text-sm text-text-muted text-center">New here? <Link href="/signup" className="font-medium text-link underline underline-offset-4">Create an account</Link></p>
    </AuthShell>
  );
}
