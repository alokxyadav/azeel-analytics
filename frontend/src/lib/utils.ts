import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...i: ClassValue[]) => twMerge(clsx(i));
export function formatBytes(b: number) {
  if (!b) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
}
export const formatDate = (s: string) =>
  new Date(s).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
export const formatNumber = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(v);

/** Plain-language name for a pandas dtype, for people who have never heard of "int64". */
export function friendlyType(dtype: string): string {
  const d = dtype.toLowerCase();
  if (d.startsWith("int") || d.startsWith("uint")) return "integer";
  if (d.startsWith("float")) return "decimal";
  if (d.startsWith("bool")) return "yes / no";
  if (d.startsWith("datetime")) return "date";
  return "text";
}
