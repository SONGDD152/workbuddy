"use client";
import * as React from "react";

// 极简 Markdown 渲染（标题 / 列表 / 粗体 / 段落），零依赖
export function Markdown({ text }: { text: string }) {
  const html = React.useMemo(() => render(text), [text]);
  return (
    <div
      className="prose-sm max-w-none space-y-2 text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function inline(s: string) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function render(src: string): string {
  const lines = src.split("\n");
  let out = "";
  let inList = false;
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      if (inList) {
        out += "</ul>";
        inList = false;
      }
      continue;
    }
    if (t.startsWith("### ")) {
      if (inList) { out += "</ul>"; inList = false; }
      out += `<h3 class="mt-3 text-base font-semibold">${inline(t.slice(4))}</h3>`;
    } else if (t.startsWith("## ")) {
      if (inList) { out += "</ul>"; inList = false; }
      out += `<h2 class="mt-4 text-lg font-bold">${inline(t.slice(3))}</h2>`;
    } else if (t.startsWith("# ")) {
      if (inList) { out += "</ul>"; inList = false; }
      out += `<h1 class="mt-4 text-xl font-extrabold">${inline(t.slice(2))}</h1>`;
    } else if (t.startsWith("- ") || t.startsWith("* ")) {
      if (!inList) { out += "<ul class='list-disc pl-5 space-y-1'>"; inList = true; }
      out += `<li>${inline(t.slice(2))}</li>`;
    } else {
      if (inList) { out += "</ul>"; inList = false; }
      out += `<p>${inline(t)}</p>`;
    }
  }
  if (inList) out += "</ul>";
  return out;
}
