import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main" className="flex-1 mx-auto w-full max-w-3xl px-5 sm:px-8 py-16">
        <Link href="/" className="text-sm text-link hover:underline">← Home</Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-text-muted">Last updated {updated}</p>
        <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-text [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-8 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_a]:text-link [&_a]:underline">{children}</div>
      </main>
      <Footer />
    </>
  );
}
