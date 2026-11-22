"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function VerifyBanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  if (!user || user.email_verified) return null;

  const resend = async () => {
    setSending(true);
    try { await api.auth.resendVerification(); setSent(true); toast("A new link is on its way.", "success"); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Could not send the email.", "error"); }
    finally { setSending(false); }
  };
  return (
    <div role="status" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
      <p>Verify your email to upload files. We sent a link to <strong className="font-medium">{user.email}</strong>.</p>
      <Button size="sm" variant="secondary" onClick={resend} loading={sending} disabled={sent}>{sent ? "Link sent" : "Resend link"}</Button>
    </div>
  );
}
