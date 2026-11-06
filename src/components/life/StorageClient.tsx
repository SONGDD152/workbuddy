"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ScanLine,
  Boxes,
  Globe,
  Lock,
  Warehouse,
  Download,
  Copy,
  RefreshCw,
  X,
  AlertTriangle,
  FileSpreadsheet,
  Check,
} from "lucide-react";
import { Button, Card, Modal, Input, Select, Badge, EmptyState } from "@/components/ui";
import { ImageField } from "@/components/ImageField";
import { Scanner } from "@/components/Scanner";
import { QrCode, downloadQrPng } from "@/components/QrCode";
import { cn } from "@/lib/utils";
import {
  warehouseQrValue,
  isWarehouseQr,
  type WarehouseInfo,
} from "@/lib/warehouse";
import {
  createStorageItem,
  updateStorageItem,
  deleteStorageItem,
  setContentVisibility,
  createWarehouse,
  renameWarehouse,
  regenerateWarehouseCode,
  deleteWarehouse,
  resolveWarehouse,
  autoStoreItem,
} from "@/lib/actions";
import { STORAGE_CATEGORY_LABEL, VISIBILITY_LABEL } from "@/lib/constants";
import {
  STORAGE_EXPORT_COLUMNS,
  STORAGE_EXPORT_HEADERS,
  buildStorageTsv,
  matchesStorageExportFilter,
  storageExportFileName,
  type StorageExportRow,
} from "@/lib/storage-export";

type Item = {
  id: string;
  name: string;
  category: string;
  room: string | null;
  position: string | null;
  barcode: string | null;
  image: string | null;
  note: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  warehouseId: string | null;
  quantity: number;
  createdAt: string;
};

type Notice = { text: string; tone: "ok" | "warn" };
type ScanStage = null | "warehouse" | "item" | "lookup";
type ActiveWarehouse = { id: string; name: string; code: string };
type ConfirmBox = { title: string; text: string; run: () => Promise<void> };

const EMPTY_FORM = {
  name: "",
  category: "DAILY",
  room: "",
  position: "",
  barcode: "",
  image: "",
  note: "",
  visibility: "PRIVATE",
  warehouseId: "",
  quantity: "1",
};

export function StorageClient({
  initial,
  warehouses,
}: {
  initial: Item[];
  warehouses: WarehouseInfo[];
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(initial);
  const [query, setQuery] = React.useState("");
  const [cat, setCat] = React.useState("");
  const [whFilter, setWhFilter] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Item | null>(null);
  const [form, setForm] = React.useState({ ...EMPTY_FORM });
  const [saving, setSaving] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<Notice | null>(null);
  const [confirmBox, setConfirmBox] = React.useState<ConfirmBox | null>(null);

  // 导出明细
  const [exportOpen, setExportOpen] = React.useState(false);
  const [exportScope, setExportScope] = React.useState<"filtered" | "all">("filtered");
  const [copied, setCopied] = React.useState(false);

  // 仓库管理
  const [whOpen, setWhOpen] = React.useState(false);
  const [whEditing, setWhEditing] = React.useState<WarehouseInfo | null>(null);
  const [whForm, setWhForm] = React.useState({ name: "", note: "" });
  const [whBusy, setWhBusy] = React.useState(false);
  const [qrWh, setQrWh] = React.useState<WarehouseInfo | null>(null);

  // 两段扫码入库
  const [scan, setScan] = React.useState<ScanStage>(null);
  const [activeWh, setActiveWh] = React.useState<ActiveWarehouse | null>(null);
  const scanBusy = React.useRef(false);

  React.useEffect(() => setItems(initial), [initial]);

  const show = React.useCallback(
    (text: string, tone: "ok" | "warn" = "ok") => setNotice({ text, tone }),
    []
  );

  // 导出用的行与页面列表共用同一份筛选判断，保证「看到的 = 导出的」
  const displayFilter = React.useMemo(
    () => ({
      q: query,
      cat: cat ? STORAGE_CATEGORY_LABEL[cat] || "" : "",
      wh:
        whFilter === "__none__"
          ? "__none__"
          : warehouses.find((w) => w.id === whFilter)?.name || "",
    }),
    [query, cat, whFilter, warehouses]
  );

  const toExportRow = React.useCallback(
    (it: Item): StorageExportRow => {
      const whName = warehouses.find((w) => w.id === it.warehouseId)?.name || "";
      return {
        name: it.name,
        category: STORAGE_CATEGORY_LABEL[it.category] || it.category,
        warehouse: whName,
        room: it.room && it.room !== whName ? it.room : "",
        position: it.position || "",
        quantity: it.quantity || 1,
        barcode: it.barcode || "",
        note: it.note || "",
        visibility: VISIBILITY_LABEL[it.visibility] || it.visibility,
        createdAt: formatBeijing(it.createdAt),
      };
    },
    [warehouses]
  );

  const filtered = items.filter((it) =>
    matchesStorageExportFilter(toExportRow(it), displayFilter)
  );
  const filteredExportRows = filtered.map(toExportRow);
  const allExportRows = items.map(toExportRow);
  const exportRows = exportScope === "all" ? allExportRows : filteredExportRows;

  const exportParams = new URLSearchParams();
  if (exportScope === "filtered") {
    if (displayFilter.q.trim()) exportParams.set("q", displayFilter.q.trim());
    if (displayFilter.cat) exportParams.set("cat", displayFilter.cat);
    if (displayFilter.wh) exportParams.set("wh", displayFilter.wh);
  }
  const qs = exportParams.toString();
  const exportHref = "/api/storage/export" + (qs ? `?${qs}` : "");

  const stats = React.useMemo(() => {
    const byCat: Record<string, number> = {};
    let unassigned = 0;
    for (const i of items) {
      byCat[i.category] = (byCat[i.category] || 0) + 1;
      if (!i.warehouseId) unassigned++;
    }
    return { total: items.length, byCat, unassigned };
  }, [items]);

  // ---------- 导出明细 ----------
  async function copyExportRows() {
    if (!exportRows.length) {
      show("当前范围内没有可导出的物品", "warn");
      return;
    }
    const text = buildStorageTsv(exportRows);
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      // 部分 WebView 禁用异步剪贴板，退回「选中隐藏文本域 + execCommand」
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.cssText = "position:fixed;left:-9999px;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (!ok) {
      show("自动复制被浏览器拒绝，请点「下载 CSV」，或在预览表格里长按选择", "warn");
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
    show(`已复制 ${exportRows.length} 条明细，可直接粘贴到 Excel / WPS / 微信`);
  }

  // ---------- 物品 ----------
  function openNew(barcode?: string) {
    setEditing(null);
    setForm({ ...EMPTY_FORM, barcode: barcode || "", warehouseId: activeWh?.id || "" });
    setOpen(true);
  }
  function openEdit(it: Item) {
    setEditing(it);
    setForm({
      name: it.name,
      category: it.category,
      room: it.room || "",
      position: it.position || "",
      barcode: it.barcode || "",
      image: it.image || "",
      note: it.note || "",
      visibility: it.visibility,
      warehouseId: it.warehouseId || "",
      quantity: String(it.quantity || 1),
    });
    setOpen(true);
  }
  async function save() {
    if (!form.name.trim()) {
      show("请填写物品名称", "warn");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, quantity: Number(form.quantity) || 1 };
      if (editing) await updateStorageItem(editing.id, payload);
      else await createStorageItem(payload);
      router.refresh();
      setOpen(false);
      show(editing ? "已保存修改" : "已添加物品");
    } catch (e: any) {
      show(e?.message || "保存失败，请重试", "warn");
    } finally {
      setSaving(false);
    }
  }
  function remove(it: Item) {
    setConfirmBox({
      title: "删除物品",
      text: `确认删除「${it.name}」？删除后不可恢复。`,
      run: async () => {
        await deleteStorageItem(it.id);
        router.refresh();
        show("物品已删除");
      },
    });
  }
  /** 切换公开 / 私密：只改当前账号自己的这条记录 */
  async function toggle(it: Item) {
    const next = it.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC";
    setBusy(it.id);
    try {
      await setContentVisibility("storage", it.id, next);
      router.refresh();
    } catch (e: any) {
      show(e?.message || "切换失败", "warn");
    } finally {
      setBusy(null);
    }
  }

  // ---------- 仓库 ----------
  function openWhNew() {
    setWhEditing(null);
    setWhForm({ name: "", note: "" });
    setWhOpen(true);
  }
  function openWhEdit(w: WarehouseInfo) {
    setWhEditing(w);
    setWhForm({ name: w.name, note: w.note || "" });
    setWhOpen(true);
  }
  async function saveWh() {
    if (!whForm.name.trim()) {
      show("请填写仓库名称", "warn");
      return;
    }
    setWhBusy(true);
    try {
      if (whEditing) {
        await renameWarehouse(whEditing.id, whForm);
        if (qrWh?.id === whEditing.id) {
          setQrWh({ ...qrWh, name: whForm.name.trim(), note: whForm.note.trim() || null });
        }
        show("仓库已更新");
      } else {
        const w = await createWarehouse(whForm);
        // 新建后立刻展示二维码，方便马上下载打印
        setQrWh({ id: w.id, name: w.name, code: w.code, note: w.note ?? null, itemCount: 0 });
        show(`仓库「${w.name}」已创建，下载二维码贴上去就能用了`);
      }
      setWhOpen(false);
      router.refresh();
    } catch (e: any) {
      show(e?.message || "仓库保存失败", "warn");
    } finally {
      setWhBusy(false);
    }
  }
  function removeWh(w: WarehouseInfo) {
    setConfirmBox({
      title: "删除仓库",
      text: `确认删除仓库「${w.name}」？里面的 ${w.itemCount} 件物品会保留，只是不再归属这个仓库；这张二维码也会立即失效。`,
      run: async () => {
        await deleteWarehouse(w.id);
        if (activeWh?.id === w.id) {
          setActiveWh(null);
          setScan("warehouse");
        }
        if (qrWh?.id === w.id) setQrWh(null);
        router.refresh();
        show("仓库已删除，物品已保留");
      },
    });
  }
  async function rotateCode(w: WarehouseInfo) {
    setWhBusy(true);
    try {
      const r = await regenerateWarehouseCode(w.id);
      setQrWh({ ...w, code: r.code });
      router.refresh();
      show("二维码已重新生成，请下载新图；旧码立即失效，已入库物品不受影响");
    } catch (e: any) {
      show(e?.message || "重新生成失败", "warn");
    } finally {
      setWhBusy(false);
    }
  }
  async function downloadQr(w: WarehouseInfo) {
    try {
      await downloadQrPng(warehouseQrValue(w.code), `warehouse-${w.code}.png`);
      show("二维码 PNG 已开始下载；App 内若没反应，直接截图保存这张大图也能扫");
    } catch (e: any) {
      show(e?.message || "下载失败，可直接截图保存二维码", "warn");
    }
  }
  async function copyWhCode(w: WarehouseInfo) {
    const v = warehouseQrValue(w.code);
    try {
      await navigator.clipboard.writeText(v);
      show("仓库码已复制，可在扫码框里手动粘贴");
    } catch {
      show(`无法自动复制，请手动输入：${v}`, "warn");
    }
  }

  // ---------- 两段扫码入库 ----------
  /** 串行执行扫码回调，避免逐帧解码把同一件事重复提交 */
  async function guarded(fn: () => Promise<void>) {
    if (scanBusy.current) return;
    scanBusy.current = true;
    try {
      await fn();
    } catch (e: any) {
      show(e?.message || "操作失败，请重试", "warn");
    } finally {
      scanBusy.current = false;
    }
  }

  function startIntake() {
    if (warehouses.length === 0) {
      show("还没有仓库，先建一个并把二维码贴在柜子上", "warn");
      openWhNew();
      return;
    }
    setActiveWh(null);
    setNotice(null);
    setScan("warehouse");
  }

  function onWarehouseScan(text: string) {
    void guarded(async () => {
      if (!isWarehouseQr(text)) {
        show("请先扫仓库二维码（不是商品条码）；也可在下方手动粘贴仓库码", "warn");
        return;
      }
      const wh = await resolveWarehouse(text);
      if (!wh) {
        show("这张仓库码不属于当前账号，请换一张或先新建仓库", "warn");
        return;
      }
      setActiveWh(wh);
      show(`已选定仓库「${wh.name}」，现在扫物品条码`);
      setScan("item");
    });
  }

  function onItemScan(text: string) {
    void guarded(async () => {
      if (!activeWh) {
        setScan("warehouse");
        return;
      }
      // 扫到另一张仓库码 = 换仓库继续入库，不用退出重来
      if (isWarehouseQr(text)) {
        const wh = await resolveWarehouse(text);
        if (wh) {
          setActiveWh(wh);
          show(`已切换到仓库「${wh.name}」，继续扫物品`);
        } else {
          show("这张仓库码不属于当前账号，仍按原仓库继续", "warn");
        }
        return;
      }
      const r = await autoStoreItem(warehouseQrValue(activeWh.code), text);
      show(
        r.mode === "created"
          ? `已入库「${r.name}」→ ${r.warehouse}（数量 1），可继续扫下一件`
          : `「${r.name}」已在 ${r.warehouse}，数量 +1 → ${r.quantity}`
      );
      router.refresh();
    });
  }

  function onLookupScan(text: string) {
    const q = text.trim();
    setScan(null);
    if (!q) return;
    const hit = items.find((i) => (i.barcode || "").toLowerCase() === q.toLowerCase());
    if (hit) {
      setQuery(q);
      show(`已找到「${hit.name}」`);
    } else {
      show(`没有条码为 ${q} 的物品，已打开新增表单`, "warn");
      openNew(q);
    }
  }

  function closeScan() {
    setScan(null);
    setActiveWh(null);
  }

  const scanFooter =
    scan === "warehouse" || scan === "item" ? (
      <div className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs leading-relaxed">
        {scan === "item" && activeWh ? (
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-brand">当前仓库：{activeWh.name}</span>
            <button
              className="shrink-0 text-muted underline"
              onClick={() => {
                setActiveWh(null);
                setScan("warehouse");
              }}
            >
              重选仓库
            </button>
          </div>
        ) : (
          <span className="font-medium text-brand">第 1 步 / 共 2 步 · 先扫仓库二维码</span>
        )}
        {notice && (
          <p className={cn("mt-1.5", notice.tone === "warn" ? "text-red-500" : "text-muted")}>
            {notice.text}
          </p>
        )}
        {scan === "item" && (
          <p className="mt-1 text-muted">
            连续模式：识别成功不会关闭，可接着扫下一件；同一件再扫一次数量 +1。
          </p>
        )}
      </div>
    ) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">家庭仓储</h1>
          <p className="text-sm text-muted">
            {warehouses.length} 个仓库 · {stats.total} 件物品 · 两段扫码入库 · 明细可导出
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={startIntake}>
            <ScanLine size={16} /> 扫码入库
          </Button>
          <Button variant="outline" onClick={() => setScan("lookup")}>
            <Search size={16} /> 扫码查物品
          </Button>
          <Button variant="outline" onClick={() => openNew()}>
            <Plus size={16} /> 手动添加
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setExportScope("filtered");
              setCopied(false);
              setExportOpen(true);
            }}
          >
            <FileSpreadsheet size={16} /> 导出明细
          </Button>
        </div>
      </div>

      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-xs leading-relaxed">
          <span className="flex items-start gap-2">
            {notice.tone === "warn" && <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-500" />}
            <span className={notice.tone === "warn" ? "text-fg" : "text-muted"}>{notice.text}</span>
          </span>
          <button className="tap shrink-0 text-muted" onClick={() => setNotice(null)} aria-label="关闭提示">
            <X size={14} />
          </button>
        </div>
      )}

      <p className="rounded-xl border border-border bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
        <strong className="font-medium text-fg">入库流程</strong>：先扫贴在仓库上的二维码，再扫物品条码，
        物品自动进对应仓库；同一条码重复扫会累加数量。标为「公开」的物品会出现在
        <Link href="/explore" target="_blank" rel="noopener noreferrer" className="mx-1 font-medium text-brand hover:underline">
          公开内容广场
        </Link>
        ；公开时只展示名称、品类与备注，仓库、房间、具体位置、条码都不会公开。
      </p>

      {/* 仓库区 */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Warehouse size={18} className="text-brand" /> 仓库
            </h2>
            <p className="text-xs text-muted">每个仓库一张二维码，打印贴在柜子或收纳箱上</p>
          </div>
          <Button variant="outline" onClick={openWhNew}>
            <Plus size={16} /> 新建仓库
          </Button>
        </div>

        {warehouses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border">
            <EmptyState
              title="还没有仓库"
              hint="先建一个仓库并下载二维码贴上，之后扫仓库码 + 物品码就能自动入库"
              action={<Button onClick={openWhNew}><Plus size={16} /> 新建仓库</Button>}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {warehouses.map((w) => (
              <Card key={w.id}>
                <div className="flex gap-3">
                  <button
                    className="tap shrink-0 rounded-xl border border-border bg-white p-1"
                    onClick={() => setQrWh(w)}
                    aria-label={`查看 ${w.name} 的二维码`}
                  >
                    <QrCode value={warehouseQrValue(w.code)} size={76} className="rounded-lg" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{w.name}</p>
                    <p className="mt-0.5 text-xs text-muted">{w.itemCount} 件物品</p>
                    {w.note && <p className="mt-1 line-clamp-2 text-xs text-muted">{w.note}</p>}
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      <button className="text-xs font-medium text-brand" onClick={() => setQrWh(w)}>
                        二维码
                      </button>
                      <button className="text-xs text-muted" onClick={() => openWhEdit(w)}>
                        <Pencil size={12} className="inline" /> 编辑
                      </button>
                      <button className="text-xs text-red-500" onClick={() => removeWh(w)}>
                        <Trash2 size={12} className="inline" /> 删除
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 搜索 + 筛选 */}
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-muted" />
          <Input
            className="pl-9"
            placeholder="搜索名称 / 品类 / 位置 / 备注 / 条码"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select className="w-auto" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">全部品类</option>
          {Object.entries(STORAGE_CATEGORY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        <Select className="w-auto" value={whFilter} onChange={(e) => setWhFilter(e.target.value)}>
          <option value="">全部仓库</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
          <option value="__none__">未归属仓库</option>
        </Select>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">物品总数</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card>
          <p className="mb-1 text-sm text-muted">各品类</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(stats.byCat).map(([k, v]) => (
              <Badge key={k}>{STORAGE_CATEGORY_LABEL[k]} {v}</Badge>
            ))}
          </div>
        </Card>
        <Card>
          <p className="mb-1 text-sm text-muted">各仓库</p>
          <div className="flex flex-wrap gap-1">
            {warehouses.map((w) => (
              <Badge key={w.id}>{w.name} {w.itemCount}</Badge>
            ))}
            {stats.unassigned > 0 && <Badge>未归属 {stats.unassigned}</Badge>}
            {warehouses.length === 0 && stats.unassigned === 0 && (
              <span className="text-xs text-muted">暂无仓库</span>
            )}
          </div>
        </Card>
      </div>

      {/* 物品列表 */}
      {filtered.length === 0 ? (
        <EmptyState
          title="没有匹配的物品"
          hint="换个关键词，或用「扫码入库」扫仓库码 + 物品码自动添加"
          action={<Button onClick={() => openNew()}><Plus size={16} /> 手动添加</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((it) => {
            const w = warehouses.find((x) => x.id === it.warehouseId);
            const place = [
              it.room && it.room !== w?.name ? it.room : null,
              it.position,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <Card key={it.id}>
                <div className="flex gap-3">
                  {it.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image} alt={it.name} className="h-20 w-20 rounded object-cover" />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded bg-surface-2 text-muted">
                      <Boxes size={22} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between">
                      <p className="truncate font-medium">{it.name}</p>
                      <Badge>{STORAGE_CATEGORY_LABEL[it.category]}</Badge>
                    </div>
                    {w && (
                      <p className="mt-0.5 text-xs font-medium text-brand">
                        📦 {w.name}{it.quantity > 1 ? ` · ×${it.quantity}` : ""}
                      </p>
                    )}
                    {place && <p className="mt-0.5 text-xs text-muted">📍 {place}</p>}
                    {it.barcode && <p className="text-xs text-muted">条码：{it.barcode}</p>}
                    {it.note && <p className="mt-1 line-clamp-2 text-xs">{it.note}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <button className="text-xs text-muted" onClick={() => openEdit(it)}>
                        <Pencil size={12} className="inline" /> 编辑
                      </button>
                      <button className="text-xs text-red-500" onClick={() => remove(it)}>
                        <Trash2 size={12} className="inline" /> 删除
                      </button>
                      <button
                        className={cn(
                          "inline-flex items-center gap-1 text-xs",
                          it.visibility === "PUBLIC" ? "text-brand" : "text-muted"
                        )}
                        onClick={() => toggle(it)}
                        disabled={busy === it.id}
                        title={it.visibility === "PUBLIC" ? "点击改为私密" : "点击公开到广场"}
                      >
                        {it.visibility === "PUBLIC" ? <Globe size={12} /> : <Lock size={12} />}
                        {busy === it.id ? "切换中…" : it.visibility === "PUBLIC" ? "已公开" : "设为公开"}
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 物品表单 */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "编辑物品" : "添加物品"}>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">名称</label>
            <Input placeholder="物品名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">品类</label>
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {Object.entries(STORAGE_CATEGORY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">所属仓库</label>
              <Select value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
                <option value="">不归属仓库</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">数量</label>
              <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">房间 / 区域（可选）</label>
              <Input placeholder="如 阳台" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
            </div>
          </div>
          <Input placeholder="具体位置，如 右侧柜子第二层" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          <Input placeholder="条码（可扫码自动填充）" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">照片</label>
            <ImageField value={form.image || undefined} onChange={(url) => setForm({ ...form, image: url || "" })} />
          </div>
          <TextareaX value={form.note} onChange={(v) => setForm({ ...form, note: v })} />
          <Select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}>
            <option value="PRIVATE">私密（仅自己可见）</option>
            <option value="PUBLIC">公开（出现在广场）</option>
          </Select>
          <Button className="w-full" onClick={save} disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </Button>
        </div>
      </Modal>

      {/* 仓库新建 / 编辑 */}
      <Modal open={whOpen} onClose={() => setWhOpen(false)} title={whEditing ? "编辑仓库" : "新建仓库"}>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">仓库名称</label>
            <Input
              placeholder="如 阳台储物柜 / 次卧收纳箱"
              value={whForm.name}
              onChange={(e) => setWhForm({ ...whForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">备注（可选）</label>
            <Input
              placeholder="放些什么、在哪个位置"
              value={whForm.note}
              onChange={(e) => setWhForm({ ...whForm, note: e.target.value })}
            />
          </div>
          <Button className="w-full" onClick={saveWh} disabled={whBusy}>
            {whBusy ? "保存中…" : whEditing ? "保存修改" : "创建并生成二维码"}
          </Button>
          <p className="text-xs leading-relaxed text-muted">
            创建后会自动生成一张专属二维码，下载打印贴在仓库上；入库时先扫它确定归属，再扫物品条码。
          </p>
        </div>
      </Modal>

      {/* 仓库二维码大图 */}
      <Modal open={!!qrWh} onClose={() => setQrWh(null)} title={`仓库二维码 · ${qrWh?.name ?? ""}`}>
        {qrWh && (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-2xl border border-border bg-white p-4">
              <QrCode value={warehouseQrValue(qrWh.code)} size={220} className="rounded-lg" />
            </div>
            <p className="text-center text-sm font-medium">{qrWh.name}</p>
            <p className="text-center text-xs text-muted">
              打印或截图保存，贴在仓库上；入库时先扫这张码
            </p>
            <div className="grid w-full grid-cols-2 gap-2">
              <Button onClick={() => downloadQr(qrWh)}>
                <Download size={16} /> 下载 PNG
              </Button>
              <Button variant="outline" onClick={() => copyWhCode(qrWh)}>
                <Copy size={16} /> 复制码
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => rotateCode(qrWh)}
              disabled={whBusy}
            >
              <RefreshCw size={16} /> 重新生成二维码
            </Button>
            <p className="text-xs leading-relaxed text-muted">
              二维码内容是 <span className="font-mono">{warehouseQrValue(qrWh.code)}</span>。
              重新生成后旧码立即失效，已入库物品不受影响。App 内下载若无反应，直接截图保存这张大图即可（截图同样可扫）。
            </p>
          </div>
        )}
      </Modal>

      {/* 导出明细 */}
      <Modal open={exportOpen} onClose={() => setExportOpen(false)} title="导出仓储明细">
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-muted">
            包含 <strong className="font-medium text-fg">物品名称、类型、所属仓库、房间 / 区域、存放位置、数量、条码、备注、可见性、登记时间</strong>
            共 10 列；只导出当前账号自己的物品，不含照片，也不会带上其它账号的数据。
          </p>

          <div>
            <p className="mb-2 text-xs font-medium text-muted">导出范围</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { key: "filtered", label: "当前筛选", count: filteredExportRows.length },
                  { key: "all", label: "全部物品", count: allExportRows.length },
                ] as const
              ).map((s) => (
                <button
                  key={s.key}
                  onClick={() => setExportScope(s.key)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left text-xs transition",
                    exportScope === s.key
                      ? "border-brand bg-surface-2 text-brand"
                      : "border-border text-muted hover:border-brand"
                  )}
                >
                  <span className="block text-sm font-medium">{s.label}</span>
                  <span className="mt-0.5 block">{s.count} 条</span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
              「当前筛选」跟随上方的搜索词、品类和仓库筛选；选「全部物品」则忽略筛选。
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted">
              明细预览（前 6 条，共 {exportRows.length} 条）
            </p>
            {exportRows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted">
                这个范围里还没有物品
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="bg-surface-2 text-muted">
                    <tr>
                      {STORAGE_EXPORT_HEADERS.map((h) => (
                        <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {exportRows.slice(0, 6).map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        {STORAGE_EXPORT_COLUMNS.map((c) => (
                          <td key={c.key} className="max-w-[180px] truncate whitespace-nowrap px-3 py-2">
                            {r[c.key]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <a
              href={exportHref}
              download={storageExportFileName()}
              onClick={() =>
                show("已开始生成 CSV：网页会直接下载；App 内升级到 v1.5.0 后会保存到手机「下载」目录")
              }
              className="tap inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-fg transition hover:opacity-90"
            >
              <Download size={16} /> 下载 CSV 文件
            </a>
            <Button variant="outline" onClick={copyExportRows} disabled={!exportRows.length}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "已复制" : "复制明细"}
            </Button>
          </div>

          <p className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-[11px] leading-relaxed text-muted">
            CSV 带 UTF-8 BOM，Excel / WPS / 数字表格双击打开中文不乱码；「复制明细」是制表符文本，粘进表格会自动分列。
            <strong className="font-medium text-fg">App 内保存下载文件需要 v1.5.0 及以上</strong>，旧版可先用「复制明细」粘贴到微信或备忘录。
          </p>
        </div>
      </Modal>

      {/* 自定义确认框：WebView 里 window.confirm 可能不弹，这里统一用页面内弹窗 */}
      <Modal open={!!confirmBox} onClose={() => setConfirmBox(null)} title={confirmBox?.title}>
        <p className="text-sm leading-relaxed text-muted">{confirmBox?.text}</p>
        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setConfirmBox(null)}>
            取消
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={async () => {
              const run = confirmBox?.run;
              setConfirmBox(null);
              try {
                await run?.();
              } catch (e: any) {
                show(e?.message || "操作失败，请重试", "warn");
              }
            }}
          >
            确认删除
          </Button>
        </div>
      </Modal>

      {/* 两段扫码 */}
      {scan === "warehouse" && (
        <Scanner
          key="stage-warehouse"
          continuous
          title="第 1 步 · 扫仓库二维码"
          hint="扫贴在仓库 / 收纳箱上的那张二维码"
          footer={scanFooter}
          onResult={onWarehouseScan}
          onClose={closeScan}
        />
      )}
      {scan === "item" && activeWh && (
        <Scanner
          key={`stage-item-${activeWh.id}`}
          continuous
          title="第 2 步 · 扫物品条码"
          hint={`扫物品条码，自动入库到「${activeWh.name}」`}
          footer={scanFooter}
          onResult={onItemScan}
          onClose={closeScan}
        />
      )}
      {scan === "lookup" && (
        <Scanner
          title="扫码查物品"
          hint="扫已有物品的条码，找到就筛出来"
          onResult={onLookupScan}
          onClose={() => setScan(null)}
        />
      )}
    </div>
  );
}

/** 与导出接口一致：登记时间统一按北京时间（UTC+8）显示 */
function formatBeijing(iso?: string): string {
  if (!iso) return "";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  const b = new Date(t.getTime() + 8 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${b.getUTCFullYear()}-${p(b.getUTCMonth() + 1)}-${p(b.getUTCDate())} ${p(b.getUTCHours())}:${p(b.getUTCMinutes())}`;
}

function TextareaX({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
      rows={3}
      placeholder="备注"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
