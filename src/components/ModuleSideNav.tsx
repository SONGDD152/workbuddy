"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES } from "@/lib/modules";
import { cn } from "@/lib/utils";

/**
 * 内容页左侧「固定子模块导航列」。
 * 桌面端由 AppShell 全局左侧栏承载同级导航（故本组件 lg:hidden），
 * 这里主要补齐「移动端 WebView 没有常驻左侧栏」的缺口：手机上也做成
 * 左侧固定列 + 右侧内容的布局（仿 WorkBuddy 桌面端：点左侧子项，右侧整块切换）。
 * 当前属于哪个模块就列出该模块的子项，并高亮当前项。
 */
export function ModuleSideNav() {
  const pathname = usePathname();
  const mod = MODULES.find(
    (m) =>
      m.items.length > 0 &&
      (pathname === m.href || pathname.startsWith(m.href + "/"))
  );
  if (!mod) return null;

  return (
    <nav className="sticky top-[56px] z-10 w-20 shrink-0 self-start lg:hidden">
      <ul className="space-y-1">
        {mod.items.map((it) => {
          const Icon = it.icon;
          const active =
            pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-center text-[11px] transition",
                  active
                    ? "bg-brand/10 font-medium text-brand"
                    : "text-muted hover:bg-surface-2 hover:text-fg"
                )}
              >
                <Icon size={18} />
                <span className="truncate leading-tight">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
