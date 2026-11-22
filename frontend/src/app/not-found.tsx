import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
      <p className="text-sm font-semibold text-accent tabular">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">We could not find that page</h1>
      <p className="mt-2 text-text-muted max-w-md">The link may be old or mistyped.</p>
      <Link href="/" className="mt-6"><Button>Back to home</Button></Link>
    </main>
  );
}
