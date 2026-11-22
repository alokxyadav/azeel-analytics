"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function Confirm() {
  const token = useSearchParams().get("token") || "";
  const { user, refreshUser } = useAuth();
  const [state, setState] = useState<"working" | "done" | "error">(token ? "working" : "error");
  const [message, setMessage] = useState(token ? "" : "This link is missing its token.");

  useEffect(() => {
    if (!token) return;
    let live = true;
    // The endpoint is idempotent, so running twice (React strict mode, a reload) is harmless.
    api.auth.verifyEmail(token)
      .then(() => { if (live) { setState("done"); refreshUser(); } })
      .catch((e) => { if (live) { setState("error"); setMessage(e instanceof ApiError ? e.message : "Could not confirm your email."); } });
    return () => { live = false; };
  }, [token, refreshUser]);

  if (state === "working") return <p role="status" className="text-text-muted">Confirming your email address…</p>;
  if (state === "done") {
    return (
      <div role="status">
        <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">Your email address is confirmed. You can upload files now.</p>
        <Link href={user ? "/dashboard/upload" : "/login"} className="mt-5 block"><Button className="w-full">{user ? "Upload a file" : "Log in"}</Button></Link>
      </div>
    );
  }
  return (
    <div>
      <p role="alert" className="rounded-lg bg-red-50 px-3 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{message}</p>
      <p className="mt-4 text-sm text-text-muted">Log in and use “Resend link” in the banner to get a new one.</p>
      <Link href="/login" className="mt-5 block"><Button variant="secondary" className="w-full">Go to log in</Button></Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return <AuthShell title="Confirm your email" subtitle="One step to finish setting up your account."><Suspense><Confirm /></Suspense></AuthShell>;
}
