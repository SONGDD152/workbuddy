"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

/** 公开主页的主题切换按钮（沿用站内 localStorage.theme 约定） */
export function PublicThemeToggle() {
  const [dark, setDark] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  if (!mounted) return <div className="h-9 w-9" aria-hidden />;

  return (
    <button
      type="button"
      aria-label={dark ? "切换到浅色模式" : "切换到深色模式"}
      onClick={() => {
        const root = document.documentElement;
        root.classList.toggle("dark");
        localStorage.theme = root.classList.contains("dark") ? "dark" : "light";
        setDark(root.classList.contains("dark"));
      }}
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
