import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const uid = await getUserId();
  if (!uid) redirect("/login");
  return <AppShell>{children}</AppShell>;
}
