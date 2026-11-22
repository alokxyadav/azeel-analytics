import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
const tone = {
  default: "border-border-strong text-text-muted",
  success: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  warning: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  neutral: "border-border bg-bg-subtle text-text-muted",
};
export const Badge = ({ className, variant = "default", ...p }: HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof tone }) => (
  <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium", tone[variant], className)} {...p} />
);
