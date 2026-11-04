"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Sparkles, Save, FileDown, Printer, Pencil, Eye } from "lucide-react";
import { Button, Card, Badge } from "@/components/ui";
import { Markdown } from "@/components/Markdown";
import {
  addBookNote,
  deleteBookNote,
  saveBookReport,
  addMovieNote,
  deleteMovieNote,
  saveMovieReport,
  addStudyNote,
  deleteStudyNote,
  saveStudyReport,
} from "@/lib/actions";
import { fmtDate } from "@/lib/utils";

type Note = { id: string; content: string; createdAt: string };
type Kind = "book" | "movie" | "study";

export function NoteDetail({
  kind,
  id,
  title,
  initialNotes,
  initialReport,
}: {
  kind: Kind;
  id: string;
  title: string;
  initialNotes: Note[];
  initialReport: { content: string; score: number | null; summary: string | null } | null;
}) {
  const router = useRouter();
  const [notes, setNotes] = React.useState(initialNotes);
  const [draft, setDraft] = React.useState("");
  const [report, setReport] = React.useState(initialReport?.content ?? "");
  const [score, setScore] = React.useState(initialReport?.score ?? 0);
  const [streaming, setStreaming] = React.useState(false);
  const [editing, setEditing] = React.useState(!initialReport?.content);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => setNotes(initialNotes), [initialNotes]);

  const addNote = kind === "book" ? addBookNote : kind === "movie" ? addMovieNote : addStudyNote;
  const delNote = kind === "book" ? deleteBookNote : kind === "movie" ? deleteMovieNote : deleteStudyNote;
  const saveReport = kind === "book" ? saveBookReport : kind === "movie" ? saveMovieReport : saveStudyReport;

  async function onAddNote() {
    if (!draft.trim()) return;
    await addNote({ [`${kind}Id`]: id, content: draft });
    setDraft("");
    router.refresh();
  }
  async function onDelNote(nid: string) {
    await delNote(nid);
    router.refresh();
  }

  async function generate() {
    setStreaming(true);
    setEditing(true);
    setReport("");
    try {
      const res = await fetch(`/api/reports?kind=${kind}&id=${id}`);
      if (!res.body) return;
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        setReport(buf);
      }
    } finally {
      setStreaming(false);
    }
  }

  async function onSave() {
    setSaving(true);
    try {
      await saveReport(
        kind === "study"
          ? { studyId: id, content: report }
          : { [`${kind}Id`]: id, content: report, score: score || null, summary: null }
      );
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function exportMD() {
    const blob = new Blob([`# 《${title}》${kind === "study" ? "学习总结" : "报告"}\n\n` + report], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title}.md`;
    a.click();
  }
  function exportPDF() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<pre style="font-family:system-ui;padding:24px;white-space:pre-wrap">${report.replace(/</g, "&lt;")}</pre>`);
    w.document.close();
    w.print();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted">{notes.length} 条碎片笔记</p>
        </div>
        <Button onClick={generate} disabled={streaming}>
          <Sparkles size={16} /> {streaming ? "生成中…" : "生成报告"}
        </Button>
      </div>

      {/* 笔记时间线 */}
      <section>
        <h2 className="mb-2 font-semibold">碎片笔记（时间线）</h2>
        <div className="flex gap-2">
          <textarea
            className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            rows={2}
            placeholder="写下一条碎片笔记…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button onClick={onAddNote} className="px-3"><Plus size={16} /></Button>
        </div>
        <div className="mt-3 space-y-2">
          {notes.map((n) => (
            <Card key={n.id} className="py-2">
              <div className="flex items-start justify-between gap-2">
                <p className="whitespace-pre-wrap text-sm">{n.content}</p>
                <button className="shrink-0 text-red-500" onClick={() => onDelNote(n.id)} aria-label="删除">
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="mt-1 text-xs text-muted">{fmtDate(n.createdAt, "yyyy-MM-dd HH:mm")}</p>
            </Card>
          ))}
          {notes.length === 0 && <p className="text-sm text-muted">还没有笔记</p>}
        </div>
      </section>

      {/* 报告 */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">报告</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing((e) => !e)}>
              {editing ? <><Eye size={14} /> 预览</> : <><Pencil size={14} /> 编辑</>}
            </Button>
            <Button variant="outline" onClick={exportMD}><FileDown size={14} /> MD</Button>
            <Button variant="outline" onClick={exportPDF}><Printer size={14} /> PDF</Button>
            {editing && <Button onClick={onSave} disabled={saving}><Save size={14} /> 保存</Button>}
          </div>
        </div>
        {kind !== "study" && editing && (
          <div className="mb-2 flex items-center gap-2 text-sm">
            <span className="text-muted">评分</span>
            <input type="number" min={0} max={10} value={score} onChange={(e) => setScore(Number(e.target.value))} className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-sm" />
            <span className="text-muted">/10</span>
          </div>
        )}
        {report ? (
          editing ? (
            <textarea
              className="h-96 w-full rounded-xl border border-border bg-surface p-3 text-sm outline-none focus:border-brand"
              value={report}
              onChange={(e) => setReport(e.target.value)}
            />
          ) : (
            <Card><Markdown text={report} /></Card>
          )
        ) : (
          <p className="text-sm text-muted">点击「生成报告」基于上方笔记生成（流式输出，不编造未写内容）。</p>
        )}
      </section>
    </div>
  );
}
