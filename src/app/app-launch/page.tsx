import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";

/**
 * App 启动落地页（仅给原生 WebView 外壳使用）。
 * 由服务端读会话 cookie 分流：没登录直接进登录页，登录过就直接进主界面，
 * 和微信「打开即用、不用每次登录」的行为一致。网页版不经过这个地址。
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "小白管家",
  robots: { index: false, follow: false },
};

export default async function AppLaunchPage() {
  const uid = await getUserId();
  redirect(uid ? "/home" : "/login");
}
