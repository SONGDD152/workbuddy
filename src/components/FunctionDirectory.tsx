import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * 统一的「分组快捷入口」目录组件。
 * 借鉴 ERP 的 grouped function directory 思路，但改成全站一致的清新亮色卡片：
 * 白底 / 淡蓝描边 / 圆角，不照搬灰色企业壳。
 * 既能在服务端页面（只传 href/icon/title/hint/badge）使用，
 * 也能在客户端组件（额外传 onClick，例如仓储页的扫码/弹窗）使用。
 */

export function FuncEntry({
  icon: Icon,
  title,
  hint,
  href,
  onClick,
  badge,
  disabled,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  disabled?: boolean;
}) {
  const inner = (
    <span className="flex items-center gap-3 text-left">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium leading-tight">{title}</span>
          {badge !== undefined && (
            <span className="shrink-0 rounded-full bg-surface-2 px-1.5 text-xs text-muted">{badge}</span>
          )}
        </span>
        {hint && <span className="mt-0.5 block truncate text-xs text-muted">{hint}</span>}
      </span>
    </span>
  );

  const cls =
    "tap block w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition hover:border-brand hover:bg-surface-2" +
    (disabled ? " opacity-60" : "");

  if (href && !disabled) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      className={cls}
      onClick={disabled ? undefined : onClick}
    >
      {inner}
    </button>
  );
}

export function FuncGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
    </div>
  );
}
