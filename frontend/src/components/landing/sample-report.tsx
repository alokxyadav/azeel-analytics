import { cn } from "@/lib/utils";

const columns = [
  ["order_total", "decimal", "41", "84,210.55", "12.00", "9,840.00"],
  ["units", "integer", "0", "37.2", "1", "212"],
  ["discount", "decimal", "173", "0.08", "0.00", "0.35"],
  ["region", "text", "0", "", "", ""],
];
const regions = [["West", 4.2], ["East", 3.1], ["South", 2.6], ["North", 1.9]] as const;

function Bars() {
  const max = 4.2, top = 22, base = 112;
  return (
    <svg viewBox="0 0 440 134" role="img" aria-label="Bar chart: revenue by region in millions. West 4.2, East 3.1, South 2.6, North 1.9." className="w-full">
      {[0, 0.5, 1].map((t) => <line key={t} x1="0" x2="440" y1={base - t * (base - top)} y2={base - t * (base - top)} stroke="var(--border)" strokeWidth="1" />)}
      {regions.map(([name, v], i) => {
        const bh = (v / max) * (base - top);
        const x = 22 + i * 106;
        return (
          <g key={name}>
            <rect x={x} y={base - bh} width="72" height={bh} rx="3" fill="#2563eb" />
            <text x={x + 36} y={base - bh - 6} textAnchor="middle" fontSize="11" fill="var(--text-muted)" className="tabular">{v.toFixed(1)}M</text>
            <text x={x + 36} y={base + 17} textAnchor="middle" fontSize="12" fill="var(--text-muted)">{name}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function SampleReport({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <figure className={cn("overflow-hidden rounded-xl border border-border bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.05),0_18px_40px_-18px_rgba(15,23,42,0.18)]", className)}>
      <figcaption className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <span className="tabular truncate text-[13px] font-medium text-text">quarterly_sales.csv</span>
        <span className="shrink-0 text-xs text-text-muted">Sample data</span>
      </figcaption>

      <dl className="grid grid-cols-3 divide-x divide-border border-b border-border">
        {[["Rows", "12,480", ""], ["Missing cells", "214", "text-amber-700 dark:text-amber-300"], ["Duplicate rows", "17", "text-amber-700 dark:text-amber-300"]].map(([k, v, c]) => (
          <div key={k} className="px-4 py-3.5 sm:px-5">
            <dt className="text-xs text-text-muted">{k}</dt>
            <dd className={cn("tabular mt-0.5 text-xl font-medium sm:text-2xl", c)}>{v}</dd>
          </div>
        ))}
      </dl>

      {!compact && (
        <div className="overflow-x-auto border-b border-border">
          <table className="w-full min-w-[460px] text-xs">
            <thead>
              <tr className="text-left text-text-muted">
                {["Column", "Type", "Missing", "Mean", "Min", "Max"].map((h, i) => (
                  <th key={h} scope="col" className={cn("px-4 py-2 font-medium first:sm:pl-5", i > 1 && "text-right")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {columns.map((r) => (
                <tr key={r[0]} className="border-t border-border">
                  {r.map((c, i) => (
                    <td key={i} className={cn("px-4 py-2 first:sm:pl-5", i === 0 && "tabular font-medium text-text", i === 1 && "text-text-muted", i > 1 && "tabular text-right text-text-muted", i === 2 && c !== "0" && "text-amber-700 dark:text-amber-300")}>{c || "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-4 py-4 sm:px-5">
        <p className="mb-2 text-xs font-medium text-text">Revenue by region <span className="font-normal text-text-muted">(millions)</span></p>
        <Bars />
      </div>
    </figure>
  );
}
