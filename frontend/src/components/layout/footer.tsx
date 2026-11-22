import Link from "next/link";
import { Logo } from "./logo";
import { COMPANY, CONTACT_EMAIL } from "@/lib/site";

const cols = [
  { title: "Product", links: [["Features", "/#features"], ["Specifications", "/#specifications"], ["Pricing", "/#pricing"], ["Try the demo", "/#demo"]] },
  { title: "Company", links: [["About", "/#privacy"], ["Contact", "/#contact"], ["FAQ", "/#faq"]] },
  { title: "Legal", links: [["Privacy policy", "/privacy"], ["Terms of service", "/terms"]] },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-bg-subtle">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-text-muted">Data quality checks, statistics and charts for the spreadsheets you already have.</p>
          <p className="mt-4 text-sm"><a href={`mailto:${CONTACT_EMAIL}`} className="text-link underline-offset-4 hover:underline">{CONTACT_EMAIL}</a></p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h2 className="text-[13px] font-semibold text-text">{c.title}</h2>
            <ul className="mt-4 space-y-2.5">{c.links.map(([l, h]) => <li key={l}><Link href={h} className="text-sm text-text-muted transition-colors hover:text-text">{l}</Link></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-5 text-xs text-text-muted sm:flex-row sm:justify-between sm:px-8">
          <span>© {COMPANY}. All rights reserved.</span>
          <span>Azeel Analytics AI</span>
        </div>
      </div>
    </footer>
  );
}
