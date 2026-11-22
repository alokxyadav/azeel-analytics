"use client";
import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";

export function Contact() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [c, setC] = useState({ name: "", email: "", message: "", website: "" });
  const [sending, setSending] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const send = async (e: FormEvent) => {
    e.preventDefault(); setSending(true);
    try { await api.public.contact(c); toast("Message sent. We will reply by email.", "success"); setC({ name: "", email: "", message: "", website: "" }); }
    catch (err) { toast(err instanceof ApiError ? err.message : "Could not send your message.", "error"); }
    finally { setSending(false); }
  };
  const subscribe = async (e: FormEvent) => {
    e.preventDefault(); setSubscribing(true);
    try { await api.public.subscribe(email, ""); toast("You are subscribed.", "success"); setEmail(""); }
    catch (err) { toast(err instanceof ApiError ? err.message : "Could not subscribe.", "error"); }
    finally { setSubscribing(false); }
  };

  return (
    <section id="contact" className="border-t border-border bg-bg-subtle">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-14 md:py-20">
        <div className="md:sticky md:top-24 md:self-start">
          <h2 className="text-2xl font-semibold md:text-[28px] md:leading-tight">Contact</h2>
          <p className="mt-3 max-w-sm text-text-muted">Questions about limits, file formats or teams? Write to us and a person will reply.</p>
        </div>
        <div className="min-w-0 space-y-12">
          <form onSubmit={send} className="max-w-xl space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="cn">Name</Label><Input id="cn" required minLength={2} maxLength={100} autoComplete="name" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></div>
              <div><Label htmlFor="ce">Email</Label><Input id="ce" type="email" required autoComplete="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} /></div>
            </div>
            <div>
              <Label htmlFor="cm">Message</Label>
              <textarea id="cm" required minLength={10} maxLength={5000} rows={5} value={c.message} onChange={(e) => setC({ ...c, message: e.target.value })} className="flex w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text hover:border-text-muted/50 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-0" />
            </div>
            {/* Honeypot: invisible to people, filled in by bots */}
            <div className="absolute -left-[9999px]" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={c.website} onChange={(e) => setC({ ...c, website: e.target.value })} /></label></div>
            <Button type="submit" loading={sending}>Send message</Button>
          </form>

          <form onSubmit={subscribe} className="max-w-xl border-t border-border pt-8">
            <h3 className="text-base font-semibold">Product updates</h3>
            <p className="mt-1 text-sm text-text-muted">An occasional email about new features. Reply to any of them to unsubscribe.</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Input type="email" required aria-label="Email address for updates" placeholder="you@company.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="sm:max-w-xs" />
              <Button type="submit" variant="secondary" loading={subscribing}>Subscribe</Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
