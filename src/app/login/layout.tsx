import type { ReactNode } from "react";
import type { Viewport } from "next";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";

/** 已登录用户不该再看到登录框（包括 App 内点返回、手输地址等情况）。 */
export const dynamic = "force-dynamic";

/** 手机浏览器 / PWA 的状态栏也换成图标的天空蓝，和 App 原生状态栏一致。 */
export const viewport: Viewport = {
  themeColor: "#5aa9e6",
};

export default async function LoginLayout({
  children,
}: {
  children: ReactNode;
}) {
  const uid = await getUserId();
  if (uid) redirect("/home");
  return children;
}
