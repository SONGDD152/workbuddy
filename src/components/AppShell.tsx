"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import {
  Home,
  Plane,
  Shirt,
  Boxes,
  Utensils,
  Heart,
  Sprout,
  BookOpen,
  Clapperboard,
  GraduationCap,
  NotebookPen,
  Briefcase,
  Menu,
  X,
  Moon,
  Sun,
  MessageCircle,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: React.FC<any> };
type Group = { label: string; icon: React.FC<any>; href: string; items: Item[] };

const NAV: Group[] = [
  {
    label: "生活",
    icon: Heart,
    href: "/life/travel",
    items: [
      { href: "/life/travel", label: "旅行摄影", icon: Plane },
      { href: "/life/wardrobe", label: "衣橱穿搭", icon: Shirt },
      { href: "/life/storage", label: "家庭仓储", icon: Boxes },
      { href: "/life/food", label: "餐饮", icon: Utensils },
      { href: "/life/hobbies", label: "兴趣爱好", icon: Heart },
      { href: "/life/garden", label: "园艺种植", icon: Sprout },
    ],
  },
  {
    label: "图书馆",
    icon: BookOpen,
    href: "/library/books",
    items: [
      { href: "/library/books", label: "读书笔记", icon: BookOpen },
      { href: "/library/movies", label: "影评", icon: Clapperboard },
      { href: "/library/study", label: "专业学习", icon: GraduationCap },
      { href: "/library/diary", label: "日记", icon: NotebookPen },
    ],
  },
  {
    label: "工作",
    icon: Briefcase,
    href: "/work",
    items: [{ href: "/work", label: "建设中", icon: Briefcase }],
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function SidebarContent({ onNav }: { onNav?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col gap-1 p-3">
      <Link
        href="/home"
        className="mb-3 flex items-center gap-2 px-2 py-2 text-lg font-bold"
      >
        <span className="text-brand">◆</span> 小白管家
      </Link>
      <Link
        href="/home"
        onClick={onNav}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium",
          pathname === "/home" ? "bg-brand text-brand-fg" : "hover:bg-surface-2"
        )}
      >
        <Home size={18} /> 首页
      </Link>
      <Link
        href="/moments"
        onClick={onNav}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium",
          pathname === "/moments" ? "bg-brand text-brand-fg" : "hover:bg-surface-2"
        )}
      >
        <MessageCircle size={18} /> 朋友圈
      </Link>
      {NAV.map((g) => (
        <div key={g.label} className="mt-3">
          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted">
            {g.label}
          </p>
          {g.items.map((it) => {
            const Icon = it.icon;
            const active = isActive(pathname, it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={onNav}
                className={cn(
                  "mt-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm",
                  active ? "bg-brand text-brand-fg" : "hover:bg-surface-2"
                )}
              >
                <Icon size={18} /> {it.label}
              </Link>
            );
          })}
        </div>
      ))}
      <div className="mt-auto border-t border-border pt-3">
        <Link
          href="/install"
          onClick={onNav}
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-fg"
        >
          <Download size={18} /> 安装 APP
        </Link>
      </div>
    </div>
  );
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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const tabs: { href: string; label: string; icon: React.FC<any> }[] = [
    { href: "/home", label: "首页", icon: Home },
    { href: "/life/travel", label: "生活", icon: Heart },
    { href: "/library/books", label: "图书馆", icon: BookOpen },
    { href: "/work", label: "工作", icon: Briefcase },
  ];

  return (
    <div className="min-h-screen">
      {/* 桌面侧边栏 */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 border-r border-border bg-surface lg:block">
        <SidebarContent />
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

      {/* 移动端抽屉 */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawer(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 animate-slide-up bg-surface shadow-xl">
            <button
              className="absolute right-2 top-2 tap rounded-lg p-2 hover:bg-surface-2"
              onClick={() => setDrawer(false)}
            >
              <X size={18} />
            </button>
            <SidebarContent onNav={() => setDrawer(false)} />
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

      {/* 移动端底部 Tab */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-border bg-surface lg:hidden">
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
