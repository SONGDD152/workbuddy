"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import {
  Home,
  Heart,
  BookOpen,
  Briefcase,
  Menu,
  X,
  Moon,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useKeyboardInset } from "@/lib/useKeyboardInset";
import { NavTree } from "@/components/NavTree";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function ThemeToggle() {
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  return (
    <button
      className="tap rounded-lg p-2 hover:bg-surface-2"
      onClick={() => {
        const root = document.documentElement;
        root.classList.toggle("dark");
        localStorage.theme = root.classList.contains("dark") ? "dark" : "light";
        setDark(root.classList.contains("dark"));
      }}
      aria-label="切换主题"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawer, setDrawer] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();
  // 软键盘弹出时底部 Tab 会被顶到键盘上方，白占 50 多像素，先收起来
  const keyboardInset = useKeyboardInset();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const tabs: { href: string; label: string; icon: React.FC<any> }[] = [
    { href: "/home", label: "首页", icon: Home },
    { href: "/life", label: "生活", icon: Heart },
    { href: "/library", label: "图书馆", icon: BookOpen },
    { href: "/work", label: "工作", icon: Briefcase },
  ];

  return (
    <div className="min-h-screen">
      {/* 桌面：金蝶式可折叠左侧导航树（常驻） */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 border-r border-border bg-surface lg:block">
        <NavTree />
      </aside>

      {/* 移动端顶栏 */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/90 px-3 py-2 backdrop-blur lg:hidden">
        <button
          className="tap rounded-lg p-2 hover:bg-surface-2"
          onClick={() => setDrawer(true)}
          aria-label="菜单"
        >
          <Menu size={20} />
        </button>
        <span className="font-semibold">小白管家</span>
        <ThemeToggle />
      </header>

      {/* 移动端抽屉：与桌面同一棵导航树 */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawer(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 animate-slide-up bg-surface shadow-xl">
            <button
              className="absolute right-2 top-2 z-10 tap rounded-lg p-2 hover:bg-surface-2"
              onClick={() => setDrawer(false)}
              aria-label="关闭"
            >
              <X size={18} />
            </button>
            <NavTree onNav={() => setDrawer(false)} />
            <div className="border-t border-border p-3">
              <Button variant="ghost" className="w-full" onClick={logout}>
                登出
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 内容区 */}
      <div className="lg:pl-64">
        <div className="hidden items-center justify-end gap-2 border-b border-border px-4 py-2 lg:flex">
          <ThemeToggle />
          <Button variant="ghost" className="px-3 py-1 text-sm" onClick={logout}>
            登出
          </Button>
        </div>
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-4 lg:pb-10">
          {children}
        </main>
      </div>

      {/* 移动端底部 Tab（快速切换顶层模块） */}
      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-30 flex border-t border-border bg-surface lg:hidden",
          keyboardInset > 0 && "hidden"
        )}
      >
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = isActive(pathname, t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs",
                active ? "text-brand" : "text-muted"
              )}
            >
              <Icon size={20} />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
