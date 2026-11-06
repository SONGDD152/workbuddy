"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  ChevronDown,
  Home,
  MessageCircle,
  Download,
} from "lucide-react";
import { MODULES, type ModuleEntry } from "@/lib/modules";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function toggleIn(set: Set<string>, key: string) {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

/**
 * 金蝶式左侧多级折叠导航树（分组 → 子模块 → 子页）。
 * - 分组标题可点开/收起；带 children 的子模块带展开箭头，内嵌更深一级子页。
 * - 当前路径所属分支自动展开，叶子项高亮为品牌色，点叶子项右侧整页跳转。
 * - 桌面常驻侧栏与移动抽屉共用本组件（onNav 用于移动端点击后收起抽屉）。
 */
export function NavTree({ onNav }: { onNav?: () => void }) {
  const pathname = usePathname();

  const [openGroups, setOpenGroups] = React.useState<Set<string>>(new Set());
  const [openItems, setOpenItems] = React.useState<Set<string>>(new Set());

  // 路由变化时自动展开当前所在分支（分组 + 含激活子页的模块）
  React.useEffect(() => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      for (const m of MODULES) if (pathname.startsWith(m.href)) next.add(m.key);
      return next;
    });
    setOpenItems((prev) => {
      const next = new Set(prev);
      for (const m of MODULES) {
        if (!pathname.startsWith(m.href)) continue;
        for (const it of m.items) {
          if (!it.children?.length) continue;
          const childActive = it.children.some((c) => isActive(pathname, c.href));
          if (childActive || isActive(pathname, it.href)) next.add(it.href);
        }
      }
      return next;
    });
  }, [pathname]);

  return (
    <div className="flex h-full flex-col gap-1 overflow-y-auto p-3">
      <Link
        href="/home"
        onClick={onNav}
        className="mb-2 flex items-center gap-2 px-2 py-2 text-lg font-bold"
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
          pathname === "/moments"
            ? "bg-brand text-brand-fg"
            : "hover:bg-surface-2"
        )}
      >
        <MessageCircle size={18} /> 朋友圈
      </Link>

      {MODULES.map((m) => {
        const Icon = m.icon;
        const groupOpen = openGroups.has(m.key);
        const groupActive = pathname.startsWith(m.href);
        return (
          <div key={m.key} className="mt-2">
            <button
              type="button"
              onClick={() => setOpenGroups((p) => toggleIn(p, m.key))}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wide transition",
                groupActive ? "text-brand" : "text-muted hover:text-fg"
              )}
            >
              <span className="flex items-center gap-2">
                <Icon size={16} /> {m.label}
              </span>
              {groupOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {groupOpen && (
              <div className="mt-1 space-y-1">
                {m.items.map((it) => (
                  <TreeItem key={it.href} entry={it} pathname={pathname} onNav={onNav} openItems={openItems} setOpenItems={setOpenItems} />
                ))}
              </div>
            )}
          </div>
        );
      })}

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

function TreeItem({
  entry,
  pathname,
  onNav,
  openItems,
  setOpenItems,
}: {
  entry: ModuleEntry;
  pathname: string;
  onNav?: () => void;
  openItems: Set<string>;
  setOpenItems: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const Icon = entry.icon;
  const active = isActive(pathname, entry.href);
  const hasChildren = !!entry.children?.length;
  const childActive = entry.children?.some((c) => isActive(pathname, c.href)) ?? false;

  // 带子页：行内一个跳转链接 + 一个展开箭头
  if (hasChildren) {
    const itemOpen = openItems.has(entry.href);
    return (
      <div>
        <div
          className={cn(
            "flex items-center rounded-xl",
            active || childActive ? "bg-brand/10" : "hover:bg-surface-2"
          )}
        >
          <Link
            href={entry.href}
            onClick={onNav}
            className={cn(
              "flex flex-1 items-center gap-3 rounded-xl px-3 py-2 text-sm",
              active || childActive ? "font-medium text-brand" : ""
            )}
          >
            {Icon ? <Icon size={18} /> : null}
            {entry.label}
          </Link>
          <button
            type="button"
            onClick={() => setOpenItems((p) => toggleIn(p, entry.href))}
            className="px-2 py-2 text-muted"
            aria-label={itemOpen ? "收起" : "展开"}
          >
            {itemOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
        {itemOpen && (
          <div className="ml-5 mt-1 space-y-1 border-l border-border pl-2">
            {entry.children!.map((c) => {
              const CIcon = c.icon;
              const cActive = isActive(pathname, c.href);
              return (
                <Link
                  key={c.href}
                  href={c.href}
                  onClick={onNav}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition",
                    cActive
                      ? "bg-brand text-brand-fg"
                      : "text-muted hover:bg-surface-2 hover:text-fg"
                  )}
                >
                  {CIcon ? <CIcon size={15} /> : <span className="text-xs leading-none">•</span>}
                  {c.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 叶子项
  return (
    <Link
      href={entry.href}
      onClick={onNav}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
        active ? "bg-brand text-brand-fg" : "hover:bg-surface-2"
      )}
    >
      {Icon ? <Icon size={18} /> : null}
      {entry.label}
    </Link>
  );
}
