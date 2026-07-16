import { redirect } from "next/navigation";
import { requireAdminOrThrow } from "@/lib/authz";

export const dynamic = "force-dynamic";

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
