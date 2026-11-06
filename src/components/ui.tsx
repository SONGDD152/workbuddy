"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { useKeyboardInset } from "@/lib/useKeyboardInset";
import { X } from "lucide-react";

export function Button({
  className,
  variant = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost" | "outline" | "danger";
}) {
  const variants: Record<string, string> = {
    default: "bg-brand text-brand-fg hover:opacity-90",
    ghost: "bg-transparent hover:bg-surface-2 text-fg",
    outline: "border border-border bg-surface hover:bg-surface-2",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button
      className={cn(
        "tap inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition active:scale-[0.98] disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-4 shadow-sm",
        className
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand",
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-5 w-5 animate-spin rounded-full border-2 border-border border-t-brand",
        className
      )}
    />
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
      <p className="text-base font-medium text-fg">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
      </div>
    );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-surface-2",
        className
      )}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10" />
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  // 键盘弹出时把遮罩底边抬到键盘上沿；max-h-full 让弹窗永远不超过可视区，
  // 顶部圆角、标题和关闭按钮因此始终完整可见，只有表单内容区滚动。
  const keyboardInset = useKeyboardInset(open);
  if (!open) return null;
  return (
    <div
      className="fixed inset-x-0 top-0 z-50 flex items-end justify-center overflow-hidden bg-black/40 px-0 pb-0 pt-4 sm:items-center sm:p-4"
      style={{ bottom: keyboardInset }}
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-lg flex-col animate-slide-up overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:animate-fade-in sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-base font-semibold">{title}</h3>
          <button
            className="tap -mr-2 rounded-lg p-2 text-muted hover:bg-surface-2"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-5 pb-5 pt-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="tap inline-flex items-center gap-2"
      aria-pressed={checked}
    >
      <span
        className={cn(
          "relative h-6 w-11 rounded-full transition",
          checked ? "bg-brand" : "bg-surface-2"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
            checked ? "left-[22px]" : "left-0.5"
          )}
        />
      </span>
      {label && <span className="text-sm text-muted">{label}</span>}
    </button>
  );
}
