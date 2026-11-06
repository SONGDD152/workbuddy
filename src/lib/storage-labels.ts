import { STORAGE_CATEGORY_LABEL } from "@/lib/constants";
import { warehouseQrValue, itemQrValue } from "@/lib/warehouse";

/** 打印标签的数据源（不含邮箱 / userId / 位置明细等敏感字段） */
export type LabelSourceItem = {
  id: string;
  name: string;
  category: string;
  code: string | null;
  warehouseId: string | null;
};

export type LabelSourceWarehouse = {
  id: string;
  name: string;
  code: string;
};

export type PrintLabel = {
  key: string;
  kind: "warehouse" | "item";
  title: string;
  subtitle: string;
  meta: string;
  value: string;
};

export function buildWarehouseLabel(w: LabelSourceWarehouse): PrintLabel {
  return {
    key: `wh-${w.id}`,
    kind: "warehouse",
    title: w.name,
    subtitle: "仓库码 · 入库先扫我",
    meta: `WH ${w.code.slice(-6).toUpperCase()}`,
    value: warehouseQrValue(w.code),
  };
}

export function buildItemLabel(
  it: LabelSourceItem,
  warehouseName: string | null
): PrintLabel | null {
  if (!it.code) return null;
  return {
    key: `it-${it.id}`,
    kind: "item",
    title: it.name,
    subtitle: [
      STORAGE_CATEGORY_LABEL[it.category] || it.category,
      warehouseName || "未归属仓库",
    ].join(" · "),
    meta: `ITEM ${it.code.slice(-6).toUpperCase()}`,
    value: itemQrValue(it.code),
  };
}

export function buildAllLabels(
  items: LabelSourceItem[],
  warehouses: LabelSourceWarehouse[]
): PrintLabel[] {
  const whName = new Map(warehouses.map((w) => [w.id, w.name]));
  return [
    ...warehouses.map(buildWarehouseLabel),
    ...items
      .map((it) => buildItemLabel(it, it.warehouseId ? whName.get(it.warehouseId) || null : null))
      .filter((l): l is PrintLabel => l !== null),
  ];
}
