import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { SampleReport } from "@/components/landing/sample-report";

export function AuthShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col px-6 py-8 sm:px-12 lg:px-16">
        <header><Link href="/" aria-label="Azeel Analytics home" className="inline-block"><Logo /></Link></header>
        <main id="main" className="flex flex-1 items-center py-12">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="mb-8 mt-2 text-text-muted">{subtitle}</p>
            {children}
          </div>
        </main>
        <footer className="text-xs text-text-muted">
          <Link href="/terms" className="underline-offset-4 hover:text-text hover:underline">Terms</Link> · <Link href="/privacy" className="underline-offset-4 hover:text-text hover:underline">Privacy</Link>
        </footer>
      </div>
      <aside className="hidden border-l border-border bg-bg-subtle lg:flex lg:flex-col lg:justify-center lg:px-14" aria-hidden>
        <p className="mb-5 max-w-sm text-sm text-text-muted">Every file you upload gets a report like this, with its own numbers.</p>
        <SampleReport compact />
      </aside>
    </div>
  );
}
