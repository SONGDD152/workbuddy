"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Download, CheckSquare, Square, Loader2, Info } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { QrCode, qrSvgDataUrl } from "@/components/QrCode";
import { cn } from "@/lib/utils";
import {
  buildAllLabels,
  type LabelSourceItem,
  type LabelSourceWarehouse,
  type PrintLabel,
} from "@/lib/storage-labels";

/**
 * 二维码标签的「打印 / 导出」。
 *
 * 一条链路两个出口：
 *  - 浏览器 / PWA：直接 window.print()，A4 每页 3 列自动分页；
 *  - 手机 App：WebView 没有系统打印，改用 canvas 合成一张标签大图 PNG 下载，
 *    可直接拿去打印或发给打印店（v1.6.0 起 App 能把这张图存进「下载」目录）。
 * 两者用的是同一批标签数据，勾选状态也共用。
 */

function clip(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("二维码图片生成失败"));
    img.src = src;
  });
}

const COLS = 3;
const CELL_W = 420;
const CELL_H = 500;
const QR_SIZE = 240;

async function drawLabelSheet(labels: PrintLabel[]): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = COLS * CELL_W;
  canvas.height = Math.ceil(labels.length / COLS) * CELL_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("当前环境不支持 canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < labels.length; i++) {
    const l = labels[i];
    const x = (i % COLS) * CELL_W;
    const y = Math.floor(i / COLS) * CELL_H;
    ctx.save();
    ctx.strokeStyle = "#c7d8e6";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(x + 12, y + 12, CELL_W - 24, CELL_H - 24);
    ctx.setLineDash([]);

    const qr = await loadImage(qrSvgDataUrl(l.value, QR_SIZE));
    ctx.drawImage(qr, x + (CELL_W - QR_SIZE) / 2, y + 34, QR_SIZE, QR_SIZE);

    ctx.textAlign = "center";
    ctx.fillStyle = "#284152";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(clip(l.title, 13), x + CELL_W / 2, y + 318);
    ctx.fillStyle = "#547187";
    ctx.font = "19px sans-serif";
    ctx.fillText(clip(l.subtitle, 18), x + CELL_W / 2, y + 352);
    ctx.fillStyle = "#2f7cb5";
    ctx.font = "17px sans-serif";
    ctx.fillText(l.meta, x + CELL_W / 2, y + 384);
    ctx.fillStyle = "#7891a3";
    ctx.font = "15px sans-serif";
    ctx.fillText("小白管家 · 扫我出入库", x + CELL_W / 2, y + 424);
    ctx.restore();
  }
  return canvas.toDataURL("image/png");
}

export function LabelsClient({
  items,
  warehouses,
}: {
  items: LabelSourceItem[];
  warehouses: LabelSourceWarehouse[];
}) {
  const all = React.useMemo(() => buildAllLabels(items, warehouses), [items, warehouses]);
  const [selected, setSelected] = React.useState<Set<string>>(
    () => new Set(all.map((l) => l.key))
  );
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<{ text: string; warn: boolean } | null>(null);

  React.useEffect(() => setSelected(new Set(all.map((l) => l.key))), [all]);

  const labels = all.filter((l) => selected.has(l.key));
  const whLabels = all.filter((l) => l.kind === "warehouse");
  const itLabels = all.filter((l) => l.kind === "item");

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectOnly(keys: string[]) {
    setSelected(new Set(keys));
  }

  async function exportPng() {
    if (!labels.length) {
      setNotice({ text: "请先勾选至少一张标签", warn: true });
      return;
    }
    setBusy(true);
    try {
      const url = await drawLabelSheet(labels);
      const a = document.createElement("a");
      a.href = url;
      a.download = `小白管家-二维码标签-${stamp()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setNotice({
        text: `已生成 ${labels.length} 张标签的 PNG；App 内会存到手机「下载」目录，可直接打印或发给打印店`,
        warn: false,
      });
    } catch (e: any) {
      setNotice({ text: e?.message || "导出失败，可改用浏览器打印", warn: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 打印时隐藏外壳导航，只留标签纸 */}
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          aside, header, nav, .no-print { display: none !important; }
          .lg\\:pl-64 { padding-left: 0 !important; }
          main { max-width: none !important; margin: 0 !important; padding: 0 !important; }
          .print-sheet { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 0 !important; }
          .label-card { border: 1px dashed #9ab6c9 !important; border-radius: 0 !important; box-shadow: none !important;
                        break-inside: avoid; page-break-inside: avoid; }
          .print-head { display: block !important; }
        }
      `}</style>

      <div className="no-print space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">二维码标签 · 打印导出</h1>
            <p className="mt-1 text-sm text-muted">
              仓库码贴柜子，物品码贴东西；打印出来后扫仓库码 + 物品码即可出入库
            </p>
          </div>
          <Link href="/life/storage" className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
            <ArrowLeft size={16} /> 返回家庭仓储
          </Link>
        </div>

        {notice && (
          <p className={cn("rounded-xl border px-4 py-3 text-xs leading-relaxed",
            notice.warn ? "border-red-300 text-red-600" : "border-border bg-surface-2 text-muted")}>
            {notice.text}
          </p>
        )}

        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">选择要打印的标签</p>
              <p className="mt-0.5 text-xs text-muted">
                共 {all.length} 张（仓库 {whLabels.length} · 物品 {itLabels.length}），已选 {labels.length} 张
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => selectOnly(all.map((l) => l.key))}>全选</Button>
              <Button variant="outline" onClick={() => selectOnly(whLabels.map((l) => l.key))}>仅仓库</Button>
              <Button variant="outline" onClick={() => selectOnly(itLabels.map((l) => l.key))}>仅物品</Button>
              <Button variant="ghost" onClick={() => selectOnly([])}>清空</Button>
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto rounded-xl border border-border">
            {all.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-muted">还没有仓库和物品，先去仓储页建档</p>
            ) : (
              <div className="grid grid-cols-1 gap-1 p-2 sm:grid-cols-2">
                {all.map((l) => (
                  <button
                    key={l.key}
                    onClick={() => toggle(l.key)}
                    className="tap flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-surface-2"
                  >
                    {selected.has(l.key) ? (
                      <CheckSquare size={15} className="shrink-0 text-brand" />
                    ) : (
                      <Square size={15} className="shrink-0 text-muted" />
                    )}
                    <span className="truncate">{l.title}</span>
                    <span className="ml-auto shrink-0 text-muted">{l.kind === "warehouse" ? "仓库" : "物品"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => window.print()} disabled={!labels.length}>
              <Printer size={16} /> 打印标签（A4）
            </Button>
            <Button variant="outline" onClick={exportPng} disabled={!labels.length || busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              导出标签 PNG
            </Button>
          </div>
          <p className="flex gap-2 text-xs leading-relaxed text-muted">
            <Info size={14} className="mt-0.5 shrink-0 text-brand" />
            <span>
              电脑浏览器用「打印标签」最清晰（矢量二维码、A4 每页 3 列自动分页）；手机 App 没有系统打印，
              用「导出标签 PNG」保存一张大图即可，v1.6.0 起会存进手机「下载」目录。
              二维码只包含随机令牌，不含名称、位置或账号信息，贴纸丢了可在详情页重新生成。
            </span>
          </p>
        </Card>
      </div>

      <p className="print-head hidden text-center text-sm font-medium text-muted">
        小白管家 · 二维码标签 · 共 {labels.length} 张
      </p>

      {labels.length === 0 ? (
        <p className="no-print rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
          一张都没选，先在上面勾选
        </p>
      ) : (
        <div className="print-sheet grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {labels.map((l) => (
            <div
              key={l.key}
              className="label-card flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-white px-3 py-5 text-center shadow-sm"
            >
              <QrCode value={l.value} size={150} className="rounded-lg" />
              <p className="w-full truncate text-sm font-semibold text-fg">{l.title}</p>
              <p className="w-full truncate text-xs text-muted">{l.subtitle}</p>
              <p className="font-mono text-[11px] text-brand">{l.meta}</p>
              <p className="text-[10px] text-muted">小白管家 · 扫我出入库</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
