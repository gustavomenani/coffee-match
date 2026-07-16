import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdminOrThrow } from "@/lib/authz";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdminOrThrow();
  } catch {
    redirect("/login");
  }
  return <>{children}</>;
}
