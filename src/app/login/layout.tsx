import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";

/** 已登录用户不该再看到登录框（包括 App 内点返回、手输地址等情况）。 */
export const dynamic = "force-dynamic";

export default async function LoginLayout({
  children,
}: {
  children: ReactNode;
}) {
  const uid = await getUserId();
  if (uid) redirect("/home");
  return children;
}
