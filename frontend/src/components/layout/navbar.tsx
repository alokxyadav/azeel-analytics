"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

const links = [
  { href: "/", label: "Home" },
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/95 backdrop-blur-sm">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-8" aria-label="Main">
        <Link href="/" aria-label="Azeel Analytics home"><Logo /></Link>
        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => <Link key={l.label} href={l.href} className="text-sm text-text-muted transition-colors hover:text-text">{l.label}</Link>)}
        </div>
        <div className="hidden items-center gap-1.5 md:flex">
          <ThemeToggle />
          {user ? <Link href="/dashboard"><Button size="sm">Open dashboard</Button></Link> : <>
            <Link href="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
            <Link href="/signup"><Button size="sm">Get started</Button></Link></>}
        </div>
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-menu" className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted hover:bg-bg-subtle">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>
      {open && (
        <div id="mobile-menu" className="animate-fade-up border-t border-border bg-bg px-5 pb-5 pt-2 md:hidden">
          {links.map((l) => <Link key={l.label} href={l.href} onClick={() => setOpen(false)} className="block border-b border-border py-3 text-[15px] text-text">{l.label}</Link>)}
          <div className="mt-4 flex gap-2">
            {user ? <Link href="/dashboard" className="flex-1"><Button className="w-full">Open dashboard</Button></Link> : <>
              <Link href="/login" className="flex-1"><Button variant="secondary" className="w-full">Log in</Button></Link>
              <Link href="/signup" className="flex-1"><Button className="w-full">Get started</Button></Link></>}
          </div>
        </div>
      )}
    </header>
  );
}
