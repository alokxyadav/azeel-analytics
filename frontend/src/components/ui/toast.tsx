"use client";
import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
type T = "success" | "error" | "info";
const Ctx = createContext<{ toast: (m: string, t?: T) => void } | undefined>(undefined);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; message: string; type: T }[]>([]);
  const toast = useCallback((message: string, type: T = "info") => {
    const id = Date.now() + Math.random();
    setItems((p) => [...p, { id, message, type }]);
    setTimeout(() => setItems((p) => p.filter((x) => x.id !== id)), 4000);
  }, []);
  const icon = { success: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />, error: <XCircle className="h-5 w-5 text-red-500 shrink-0" />, info: <Info className="h-5 w-5 text-primary shrink-0" /> };
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[100] flex flex-col gap-2 sm:w-96" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="animate-fade-up flex items-start gap-2 rounded-xl border border-border bg-surface p-4 shadow-lg">
            {icon[t.type]}<p className="text-sm text-text flex-1">{t.message}</p>
            <button aria-label="Dismiss" onClick={() => setItems((p) => p.filter((x) => x.id !== t.id))} className="text-text-muted"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
export function useToast() { const c = useContext(Ctx); if (!c) throw new Error("useToast needs ToastProvider"); return c; }
