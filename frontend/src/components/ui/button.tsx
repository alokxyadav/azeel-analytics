"use client";
import { ButtonHTMLAttributes, forwardRef, useSyncExternalStore } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white hover:bg-primary-dark",
        secondary: "border border-border-strong bg-surface text-text hover:bg-bg-subtle",
        ghost: "text-text-muted hover:bg-bg-subtle hover:text-text",
        danger: "bg-red-600 text-white hover:bg-red-700",
        "danger-outline": "border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10",
      },
      size: { sm: "h-8 px-3 text-[13px]", md: "h-10 px-4", lg: "h-11 px-5 text-[15px]", icon: "h-9 w-9" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);
const subscribe = () => () => {};
/** false while the server-rendered HTML is being hydrated, true once React is interactive. */
function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variants> { loading?: boolean }
export const Button = forwardRef<HTMLButtonElement, Props>(({ className, variant, size, loading, children, disabled, ...p }, ref) => {
  // Submit buttons stay disabled until hydration finishes. Before that, a form would fall back to the
  // browser's native submit, which puts what the user typed (even a password) into the URL.
  const hydrated = useHydrated();
  const waiting = p.type === "submit" && !hydrated;
  return (
    <button ref={ref} className={cn(variants({ variant, size }), className)} disabled={disabled || loading || waiting} aria-busy={loading || undefined} {...p}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{children}
    </button>
  );
});
Button.displayName = "Button";
