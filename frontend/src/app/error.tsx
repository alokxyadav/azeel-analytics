"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main id="main" className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-text-muted max-w-md">An unexpected error occurred. Your data is safe. Try again, and if it keeps happening, contact us.</p>
      {error.digest && <p className="mt-2 text-xs text-text-muted tabular">Reference: {error.digest}</p>}
      <Button className="mt-6" onClick={reset}>Try again</Button>
    </main>
  );
}
