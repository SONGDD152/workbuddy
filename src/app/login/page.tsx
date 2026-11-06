"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Input, Card } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = React.useState<"login" | "register">("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  // 原生 App 内不显示「返回公开主页」这类网页版出口，保持独立 App 的观感
  const [inApp, setInApp] = React.useState(false);

  React.useEffect(() => {
    setInApp(/XiaoBaiGuanjiaApp/i.test(navigator.userAgent));
  }, []);

  async function submit() {
    setError("");
    if (!email || !password) return setError("请输入邮箱和密码");
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "操作失败");
      router.push("/home");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold">
          {mode === "login" ? "登录" : "注册"}
        </h1>
        <p className="mb-5 text-sm text-muted">小白管家 · 个人生活空间</p>

        {mode === "register" && (
          <div className="mb-3">
            <label className="mb-1 block text-sm">昵称（可选）</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="你的名字"
            />
          </div>
        )}
        <div className="mb-3">
          <label className="mb-1 block text-sm">邮箱</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-sm">密码</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="至少 6 位"
          />
        </div>

        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

        <Button className="w-full" onClick={submit} disabled={loading}>
          {loading ? "处理中…" : mode === "login" ? "登录" : "注册并登录"}
        </Button>

        <p className="mt-4 text-center text-sm text-muted">
          {mode === "login" ? (
            <>
              没有账号？{" "}
              <button
                className="text-brand"
                onClick={() => setMode("register")}
              >
                去注册
              </button>
            </>
          ) : (
            <>
              已有账号？{" "}
              <button className="text-brand" onClick={() => setMode("login")}>
                去登录
              </button>
            </>
          )}
        </p>
        <p className="mt-3 text-center text-xs text-muted">
          数据云端同步，换设备无缝衔接。
        </p>
        {!inApp && (
          <Link href="/" className="mt-2 block text-center text-xs text-muted underline">
            返回公开主页
          </Link>
        )}
      </Card>
    </div>
  );
}
