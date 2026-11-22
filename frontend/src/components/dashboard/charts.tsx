"use client";
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { ChartDataset } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// Tonal blue/cyan palette keeps charts consistent with the brand instead of a rainbow.
const COLORS = ["#2563eb", "#06b6d4", "#1e40af", "#22d3ee", "#3b82f6", "#0e7490", "#60a5fa", "#67e8f9", "#1d4ed8", "#155e75", "#93c5fd", "#a5f3fc"];
const axis = { fontSize: 11, fill: "var(--text-muted)" };
const tip = { contentStyle: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--text)" } };
const LABEL: Record<string, string> = { bar: "Bar", pie: "Pie", histogram: "Histogram", line: "Line", area: "Area" };

function Chart({ c }: { c: ChartDataset }) {
  const data = c.labels.map((l, i) => ({ label: l, value: c.values[i] }));
  if (data.length === 0 || data.every((d) => d.value === 0 || d.value == null)) return <p className="text-sm text-text-muted py-10 text-center">Not enough data to draw this chart.</p>;
  const grid = <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      {c.chart_type === "pie" ? (
        <PieChart><Pie data={data} dataKey="value" nameKey="label" innerRadius={50} outerRadius={90} paddingAngle={2} isAnimationActive={false}>{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart>
      ) : c.chart_type === "line" ? (
        <LineChart data={data}>{grid}<XAxis dataKey="label" tick={axis} tickLine={false} minTickGap={24} /><YAxis tick={axis} tickLine={false} axisLine={false} width={48} /><Tooltip {...tip} /><Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart>
      ) : c.chart_type === "area" ? (
        <AreaChart data={data}>{grid}<XAxis dataKey="label" tick={axis} tickLine={false} minTickGap={24} /><YAxis tick={axis} tickLine={false} axisLine={false} width={48} /><Tooltip {...tip} /><Area type="monotone" dataKey="value" isAnimationActive={false} stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} strokeWidth={2} /></AreaChart>
      ) : (
        <BarChart data={data}>{grid}<XAxis dataKey="label" tick={axis} tickLine={false} interval="preserveStartEnd" /><YAxis tick={axis} tickLine={false} axisLine={false} width={48} /><Tooltip {...tip} cursor={{ fill: "var(--bg-subtle)" }} /><Bar dataKey="value" isAnimationActive={false} fill={c.chart_type === "histogram" ? "#06b6d4" : "#2563eb"} radius={[4, 4, 0, 0]} /></BarChart>
      )}
    </ResponsiveContainer>
  );
}

export default function Charts({ charts }: { charts: ChartDataset[] }) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {charts.map((c, i) => (
        <Card key={i}><CardHeader className="flex items-center justify-between gap-3"><CardTitle className="truncate">{c.title}</CardTitle><span className="shrink-0 text-xs text-text-muted">{LABEL[c.chart_type]}</span></CardHeader><CardContent><Chart c={c} /></CardContent></Card>
      ))}
    </div>
  );
}
