import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/shell";
import { FullPageSpinner } from "@/components/dashboard/common";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<FullPageSpinner />}><DashboardShell>{children}</DashboardShell></Suspense>;
}
