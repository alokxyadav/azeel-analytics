"use client";
import { useEffect, useRef, useState, FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Upload, FileBarChart, Settings, User as UserIcon, LogOut, Menu, X, Search, Bell } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { api, FileRecord } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { FullPageSpinner } from "@/components/dashboard/common";
import { VerifyBanner } from "@/components/dashboard/verify-banner";

const nav = [
  { href: "/dashboard", label: "Files", icon: LayoutDashboard },
  { href: "/dashboard/upload", label: "Upload", icon: Upload },
  { href: "/dashboard/reports", label: "Reports", icon: FileBarChart },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/profile", label: "Profile", icon: UserIcon },
];

function useOutside(cb: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cb(); };
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") cb(); };
    document.addEventListener("mousedown", h); document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  });
  return ref;
}

const menuItem = "block w-full rounded-md px-3 py-2 text-left text-sm text-text hover:bg-bg-subtle";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState("");
  const [bell, setBell] = useState(false);
  const [menu, setMenu] = useState(false);
  const [recent, setRecent] = useState<FileRecord[]>([]);
  const bellRef = useOutside(() => setBell(false));
  const menuRef = useOutside(() => setMenu(false));

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);
  useEffect(() => { if (user) api.files.list().then((f) => setRecent(f.slice(0, 5))).catch(() => {}); }, [user, path]);
  useEffect(() => setDrawer(false), [path]);

  if (loading || !user) return <div className="min-h-screen bg-bg-subtle"><FullPageSpinner /></div>;

  const search = (e: FormEvent) => { e.preventDefault(); router.push(`/dashboard?q=${encodeURIComponent(q)}`); };

  const sidebar = (
    <nav className="flex h-full flex-col" aria-label="Dashboard">
      <div className="flex h-14 items-center border-b border-border px-4"><Link href="/" aria-label="Azeel Analytics home"><Logo /></Link></div>
      <ul className="flex-1 space-y-0.5 p-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard" ? path === href || path.startsWith("/dashboard/files") : path.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] transition-colors", active ? "bg-bg-subtle font-medium text-text" : "text-text-muted hover:bg-bg-subtle hover:text-text")}>
                <Icon className={cn("h-4 w-4", active && "text-primary")} aria-hidden />{label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-border p-3">
        <div className="mb-1 px-2.5 py-1.5">
          <p className="truncate text-[13px] font-medium">{user.name}</p>
          <p className="truncate text-xs text-text-muted">{user.email}</p>
        </div>
        <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] text-text-muted hover:bg-bg-subtle hover:text-text"><LogOut className="h-4 w-4" aria-hidden />Log out</button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-bg-subtle">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 border-r border-border bg-surface lg:block">{sidebar}</aside>
      {drawer && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="w-64 animate-fade-up border-r border-border bg-surface">{sidebar}</div>
          <button aria-label="Close menu" className="flex-1 bg-black/40" onClick={() => setDrawer(false)} />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
          <button className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted hover:bg-bg-subtle lg:hidden" aria-label={drawer ? "Close menu" : "Open menu"} onClick={() => setDrawer(!drawer)}>{drawer ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          <form onSubmit={search} className="relative max-w-sm flex-1" role="search">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search your files" placeholder="Search files" className="h-9 w-full rounded-lg border border-border bg-bg-subtle pl-9 pr-3 text-sm placeholder:text-text-muted/80 focus-visible:bg-surface focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-0" />
          </form>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <div className="relative" ref={bellRef}>
              <button onClick={() => setBell(!bell)} aria-label="Recent activity" aria-expanded={bell} className="relative flex h-9 w-9 items-center justify-center rounded-lg text-text-muted hover:bg-bg-subtle hover:text-text">
                <Bell className="h-[18px] w-[18px]" aria-hidden />{recent.length > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />}
              </button>
              {bell && (
                <div className="absolute right-0 mt-2 w-72 animate-fade-up rounded-xl border border-border bg-surface p-1.5 shadow-lg">
                  <p className="px-3 py-2 text-xs font-medium text-text-muted">Recent uploads</p>
                  {recent.length === 0 ? <p className="px-3 pb-3 text-sm text-text-muted">Nothing yet. Upload a file to get started.</p> : recent.map((f) => (
                    <Link key={f.id} href={`/dashboard/files/${f.id}`} onClick={() => setBell(false)} className="block rounded-md px-3 py-2 hover:bg-bg-subtle"><p className="truncate text-sm">{f.original_filename}</p><p className="text-xs text-text-muted">{formatDate(f.uploaded_at)}</p></Link>
                  ))}
                </div>
              )}
            </div>
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenu(!menu)} aria-label="Account menu" aria-expanded={menu} className="ml-1 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary text-[13px] font-semibold text-white">
                {user.profile_picture ? <img src={user.profile_picture} alt="" className="h-full w-full object-cover" /> : user.name.charAt(0).toUpperCase()}
              </button>
              {menu && (
                <div className="absolute right-0 mt-2 w-56 animate-fade-up rounded-xl border border-border bg-surface p-1.5 shadow-lg">
                  <div className="mb-1 border-b border-border px-3 py-2"><p className="truncate text-sm font-medium">{user.name}</p><p className="truncate text-xs text-text-muted">{user.email}</p></div>
                  <Link href="/dashboard/profile" onClick={() => setMenu(false)} className={menuItem}>Profile</Link>
                  <Link href="/dashboard/settings" onClick={() => setMenu(false)} className={menuItem}>Settings</Link>
                  <button onClick={logout} className={menuItem}>Log out</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8"><VerifyBanner />{children}</main>
      </div>
    </div>
  );
}
