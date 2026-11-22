import { InputHTMLAttributes, LabelHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn("flex h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-text placeholder:text-text-muted/70 transition-colors hover:border-text-muted/50 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-0 disabled:cursor-not-allowed disabled:bg-bg-subtle disabled:text-text-muted", className)} {...p} />
));
Input.displayName = "Input";
export const Label = ({ className, ...p }: LabelHTMLAttributes<HTMLLabelElement>) => <label className={cn("mb-1.5 block text-[13px] font-medium text-text", className)} {...p} />;
