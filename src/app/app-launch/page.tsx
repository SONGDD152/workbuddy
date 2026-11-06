import type { Metadata } from "next";
import { getUserId } from "@/lib/auth";
import { LaunchScreen } from "@/components/public/LaunchScreen";

/**
 * App 启动中转页（原生 WebView 外壳使用，网页版访问也会经过）。
 *
 * 服务端仍按会话 cookie 分流，但不再直接 307 跳走：先渲染一张
 * 「小狗和主人一起看日出」的画面，客户端加载完成后再 replace 到目标页，
 * 避免冷启动到登录页之间出现一片空白。目标地址不变：
 * 没登录进 /login，登录过直接进 /home。
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "正在进入 · 小白管家",
  robots: { index: false, follow: false },
};

export default async function AppLaunchPage() {
  const uid = await getUserId();
  return <LaunchScreen target={uid ? "/home" : "/login"} />;
}
