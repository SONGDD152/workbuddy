"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES } from "@/lib/modules";
import { cn } from "@/lib/utils";

/**
 * 内容页顶部的「同级模块」导航：在任一模块子页面（如 /life/food）顶部，
 * 展示该模块的全部子页面（旅行/餐饮/爱好/园艺/仓储/衣橱…），高亮当前项，
 * 点一下即可在子模块间跳转。落地页本身（/life、/library、/home 等）不展示，
 * 因此无需逐个内容页改造——挂在 AppShell 的 <main> 顶部由本组件自行判断。
 */
export function ModuleTabs() {
  const pathname = usePathname();
  const mod = MODULES.find(
    (m) => m.items.length > 0 && pathname.startsWith(m.href + "/")
  );
  if (!mod) return null;

  return (
    <nav className="sticky top-[52px] z-20 -mx-4 mb-4 overflow-x-auto border-b border-border bg-surface px-4 py-2 lg:top-0">
      <div className="flex w-max gap-1.5">
        {mod.items.map((it) => {
          const Icon = it.icon;
          const active =
            pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "tap flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition",
                active
                  ? "border-brand bg-brand/10 font-medium text-brand"
                  : "border-border bg-surface text-muted hover:border-brand/40 hover:text-fg"
              )}
            >
              <Icon size={15} />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
