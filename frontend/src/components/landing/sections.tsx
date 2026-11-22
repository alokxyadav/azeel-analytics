import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LIMITS } from "@/lib/limits";
import { cn } from "@/lib/utils";
import { testimonials } from "@/content/testimonials";
import { SampleReport } from "./sample-report";

const wrap = "mx-auto max-w-6xl px-5 sm:px-8";

function Section({ id, title, intro, children, className }: { id?: string; title: string; intro?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={cn("border-t border-border", className)}>
      <div className={cn(wrap, "grid gap-10 py-16 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-14 md:py-20")}>
        <div className="md:sticky md:top-24 md:self-start">
          <h2 className="text-2xl font-semibold md:text-[28px] md:leading-tight">{title}</h2>
          {intro && <p className="mt-3 max-w-sm text-text-muted">{intro}</p>}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

export function Hero() {
  return (
    <section>
      <div className={cn(wrap, "grid items-center gap-12 pb-16 pt-14 md:pb-24 md:pt-20 lg:grid-cols-[1fr_1.05fr] lg:gap-16")}>
        <div>
          <h1 className="text-[2.4rem] font-semibold leading-[1.1] sm:text-5xl lg:text-[3.1rem]">
            Know what is in your spreadsheet before you act on it.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-muted">
            Upload a CSV or Excel file. Azeel reports missing values and duplicate rows, calculates summary statistics, and draws the charts your data supports. There is nothing to configure.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/signup"><Button size="lg" className="w-full sm:w-auto">Upload a file <ArrowRight className="h-4 w-4" aria-hidden /></Button></Link>
            <Link href="/#demo"><Button size="lg" variant="secondary" className="w-full sm:w-auto">Try the demo</Button></Link>
          </div>
          <p className="mt-5 text-sm text-text-muted">Free to use. CSV and .xlsx files up to {LIMITS.maxFileMb} MB.</p>
        </div>
        <SampleReport />
      </div>
    </section>
  );
}

function PreviewBox({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-subtle p-4" role="group" aria-label={label}>
      {children}
    </div>
  );
}

function QualityPreview() {
  const rows: [string, number, number][] = [["discount", 173, 1.4], ["order_total", 41, 0.3], ["units", 0, 0], ["region", 0, 0]];
  return (
    <PreviewBox label="Example: missing values per column">
      <ul className="space-y-3">
        {rows.map(([name, n, pct]) => (
          <li key={name}>
            <div className="flex items-baseline justify-between text-xs">
              <span className="tabular text-text">{name}</span>
              <span className={cn("tabular", n ? "text-amber-700 dark:text-amber-300" : "text-text-muted")}>{n ? `${n} missing · ${pct}%` : "complete"}</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-border"><div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.max(n ? 8 : 0, pct * 30)}%` }} /></div>
          </li>
        ))}
      </ul>
    </PreviewBox>
  );
}

function StatsPreview() {
  const rows = [["Average", "37.2"], ["Median", "34.0"], ["Minimum", "1"], ["Maximum", "212"], ["Std. deviation", "18.4"], ["Unique values", "198"]];
  return (
    <PreviewBox label="Example: statistics for the units column">
      <p className="tabular mb-2 text-xs text-text-muted">units</p>
      <dl className="divide-y divide-border text-xs">
        {rows.map(([k, v]) => <div key={k} className="flex justify-between py-1.5"><dt className="text-text-muted">{k}</dt><dd className="tabular text-text">{v}</dd></div>)}
      </dl>
    </PreviewBox>
  );
}

function ChartsPreview() {
  const hist = [14, 28, 46, 62, 51, 33, 20, 9];
  return (
    <PreviewBox label="Example: histogram and line chart">
      <div className="grid grid-cols-2 gap-4">
        <svg viewBox="0 0 120 70" role="img" aria-label="Histogram" className="w-full">
          <line x1="0" x2="120" y1="62" y2="62" stroke="var(--border-strong)" />
          {hist.map((h, i) => <rect key={i} x={4 + i * 14.5} y={62 - h} width="11" height={h} rx="1.5" fill="#2563eb" />)}
        </svg>
        <svg viewBox="0 0 120 70" role="img" aria-label="Line chart" className="w-full">
          <line x1="0" x2="120" y1="62" y2="62" stroke="var(--border-strong)" />
          <polyline points="4,50 22,42 40,46 58,30 76,34 94,18 114,12" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>
      <p className="mt-3 text-xs text-text-muted">ID columns and columns with too many categories are skipped instead of plotted badly.</p>
    </PreviewBox>
  );
}

function ReportsPreview() {
  const files = [["quarterly_sales_cleaned.csv", "CSV"], ["quarterly_sales_cleaned.xlsx", "Excel"], ["quarterly_sales_summary.pdf", "PDF"]];
  return (
    <PreviewBox label="Example: downloadable reports">
      <ul className="divide-y divide-border text-xs">
        {files.map(([n, t]) => <li key={n} className="flex items-center justify-between gap-3 py-2"><span className="tabular truncate text-text">{n}</span><span className="shrink-0 rounded border border-border-strong px-1.5 py-0.5 text-text-muted">{t}</span></li>)}
      </ul>
    </PreviewBox>
  );
}

export function Features() {
  const items = [
    { t: "Data quality checks", d: "Every column is checked for missing values and every row for duplicates the moment the file is uploaded. You see where the problems are, with counts and percentages.", v: <QualityPreview /> },
    { t: "Summary statistics", d: "Average, median, minimum, maximum, standard deviation and unique-value counts for each numeric column, and a detected type for every column.", v: <StatsPreview /> },
    { t: "Charts the data supports", d: "Bar, pie, histogram, line and area charts are drawn only where they mean something. A chart that would be empty or misleading is not shown.", v: <ChartsPreview /> },
    { t: "Reports you can send", d: "Download a cleaned CSV, a cleaned Excel workbook or a PDF summary. Cleaning removes empty rows and stray spaces. Your numbers are never changed.", v: <ReportsPreview /> },
  ];
  return (
    <Section id="features" title="What you get" intro="Everything is calculated automatically when you upload a file. You do not write formulas or build a dashboard.">
      <div className="divide-y divide-border">
        {items.map((i) => (
          <div key={i.t} className="grid gap-5 py-8 first:pt-0 last:pb-0 sm:grid-cols-[1fr_1.05fr] sm:gap-8">
            <div><h3 className="text-base font-semibold">{i.t}</h3><p className="mt-2 text-text-muted">{i.d}</p></div>
            {i.v}
          </div>
        ))}
      </div>
    </Section>
  );
}

function Shot({ name, alt, caption }: { name: string; alt: string; caption: string }) {
  const img = "block h-auto w-full";
  return (
    <figure>
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.05),0_18px_40px_-18px_rgba(15,23,42,0.18)]">
        <img src={`/screenshots/${name}-light.webp`} alt={alt} width={1200} height={760} loading="lazy" decoding="async" className={`${img} dark:hidden`} />
        <img src={`/screenshots/${name}-dark.webp`} alt={alt} width={1200} height={760} loading="lazy" decoding="async" className={`${img} hidden dark:block`} />
      </div>
      <figcaption className="mt-3 text-sm text-text-muted">{caption}</figcaption>
    </figure>
  );
}

export function Screenshots() {
  return (
    <Section id="screenshots" title="Inside the app" intro="Real screens from the product, shown with sample data.">
      <div className="space-y-10">
        <Shot name="file" alt="A file's overview: row, column, missing-cell and duplicate counts, a notice about problems found, and a searchable table of rows." caption="Every file opens with its data quality summary, then the rows themselves, searchable and sortable." />
        <Shot name="charts" alt="Charts generated for the file: counts by region and channel, share donut charts, and distributions of numeric columns." caption="Charts are generated for the columns that suit them. Trends over time appear when the file has a date column." />
      </div>
    </Section>
  );
}

export function Specifications() {
  const rows = [
    ["File types", "CSV and Excel (.xlsx). For Excel files the first sheet is analyzed."],
    ["File size", `Up to ${LIMITS.maxFileMb} MB per file`],
    ["Rows", `Up to ${LIMITS.maxRows.toLocaleString("en-US")} rows and 500 columns per file`],
    ["Per account", `Up to ${LIMITS.maxFilesPerAccount} files and ${LIMITS.storageGb} GB of storage`],
    ["Statistics", "Average, median, minimum, maximum, standard deviation, missing and unique counts"],
    ["Charts", "Bar, pie, histogram, line and area"],
    ["Exports", "Cleaned CSV, cleaned Excel, PDF summary"],
  ];
  return (
    <Section id="specifications" title="Specifications" intro="The limits that apply to every account.">
      <dl className="divide-y divide-border border-y border-border">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 py-3.5 sm:grid-cols-[10rem_1fr] sm:gap-6">
            <dt className="text-sm font-medium text-text">{k}</dt>
            <dd className="text-sm text-text-muted">{v}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

export function Privacy() {
  const items = [
    ["Your files are private", "Each file belongs to one account. Other users cannot see, list or download it."],
    ["Delete whenever you like", "Remove a file, all files, or your whole account at any time. Deletion is permanent and removes the stored data."],
    ["Secure sign-in", "Passwords are hashed and never stored. Sessions use a cookie that page scripts cannot read, and changing your password signs out every other device."],
    ["No tracking", "There are no advertising or analytics cookies. We use one essential cookie to keep you signed in."],
  ];
  return (
    <Section id="privacy" title="Privacy and security" intro="What happens to the files you upload.">
      <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {items.map(([t, d]) => <div key={t}><h3 className="text-base font-semibold">{t}</h3><p className="mt-2 text-text-muted">{d}</p></div>)}
      </div>
      <p className="mt-8 text-sm text-text-muted">Details are in the <Link href="/privacy" className="text-link underline underline-offset-4">privacy policy</Link>.</p>
    </Section>
  );
}

export function Testimonials() {
  if (testimonials.length === 0) return null;
  return (
    <Section title="From our users">
      <div className="grid gap-8 sm:grid-cols-2">
        {testimonials.map((t) => (
          <figure key={t.name}>
            <blockquote className="text-[17px] leading-relaxed text-text">&ldquo;{t.quote}&rdquo;</blockquote>
            <figcaption className="mt-3 text-sm text-text-muted"><span className="font-medium text-text">{t.name}</span>, {t.role}</figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}

export function Pricing() {
  return (
    <Section id="pricing" title="Pricing" intro="Simple while there is only one tier.">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col rounded-xl border-2 border-primary bg-surface p-6">
          <h3 className="text-base font-semibold">Free</h3>
          <p className="tabular mt-3 text-3xl font-medium">$0</p>
          <ul className="mt-5 flex-1 space-y-2 text-sm text-text-muted">
            <li>{LIMITS.maxFilesPerAccount} files, up to {LIMITS.maxFileMb} MB each</li>
            <li>{LIMITS.storageGb} GB storage</li>
            <li>All statistics, charts and exports</li>
            <li>No credit card required</li>
          </ul>
          <Link href="/signup" className="mt-6"><Button className="w-full">Create a free account</Button></Link>
        </div>
        <div className="flex flex-col rounded-xl border border-border bg-surface p-6">
          <h3 className="text-base font-semibold">Teams</h3>
          <p className="mt-3 text-3xl font-medium text-text-muted">Talk to us</p>
          <p className="mt-5 flex-1 text-sm text-text-muted">Need higher limits, a shared workspace or a different retention policy? Tell us what you need and we will say whether we can help.</p>
          <Link href="/#contact" className="mt-6"><Button variant="secondary" className="w-full">Contact us</Button></Link>
        </div>
      </div>
    </Section>
  );
}

export function FAQ() {
  const q = [
    ["Which file formats work?", `CSV and Excel (.xlsx) files up to ${LIMITS.maxFileMb} MB. For Excel files the first sheet is analyzed. Files that cannot be read as a table are rejected with a reason.`],
    ["Do I need spreadsheet skills?", "No. Uploading is the only step. Missing values, duplicates, statistics and charts are produced automatically."],
    ["What happens to duplicates and blanks?", "They are detected and reported. Cleaned exports drop fully empty rows and trim extra spaces; your values are not changed."],
    ["Can I export the results?", "Yes: a cleaned CSV, a cleaned Excel workbook or a PDF summary, from the file's Reports tab."],
    ["Is my data private?", "Files are stored under your account and are not shared. You can delete a file or your whole account at any time."],
  ];
  return (
    <Section id="faq" title="Questions">
      <div className="divide-y divide-border border-y border-border">
        {q.map(([a, b]) => (
          <details key={a} className="group py-1">
            <summary className="flex items-center justify-between gap-4 py-3.5 text-[15px] font-medium text-text">
              {a}
              <span aria-hidden className="shrink-0 text-lg leading-none text-text-muted transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="max-w-2xl pb-4 text-text-muted">{b}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
