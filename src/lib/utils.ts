import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// 复用 constants.ts 中的中文枚举映射（部分组件从 @/lib/utils 导入，这里统一再导出）
export {
  CLOTHING_TYPE_LABEL,
  SEASON_LABEL,
  OCCASION_LABEL,
  STORAGE_CATEGORY_LABEL,
  PROGRESS_LABEL,
  PLANT_STATUS_LABEL,
  MEAL_LABEL,
  VISIBILITY_LABEL,
} from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtDate(d: string | Date, fmt = "yyyy-MM-dd") {
  const date = typeof d === "string" ? new Date(d) : d;
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  if (fmt === "yyyy-MM-dd") return `${y}-${m}-${day}`;
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mm = `${date.getMinutes()}`.padStart(2, "0");
  if (fmt === "yyyy-MM-dd HH:mm") return `${y}-${m}-${day} ${hh}:${mm}`;
  return `${y}-${m}-${day}`;
}

export function nowISO() {
  return new Date().toISOString();
}

/** 中文 24 节气（按大致日期，用于展示与种植推荐） */
export const SOLAR_TERMS_2024 = [
  { name: "小寒", month: 1, day: 6 },
  { name: "大寒", month: 1, day: 20 },
  { name: "立春", month: 2, day: 4 },
  { name: "雨水", month: 2, day: 19 },
  { name: "惊蛰", month: 3, day: 6 },
  { name: "春分", month: 3, day: 20 },
  { name: "清明", month: 4, day: 5 },
  { name: "谷雨", month: 4, day: 20 },
  { name: "立夏", month: 5, day: 6 },
  { name: "小满", month: 5, day: 21 },
  { name: "芒种", month: 6, day: 6 },
  { name: "夏至", month: 6, day: 21 },
  { name: "小暑", month: 7, day: 7 },
  { name: "大暑", month: 7, day: 22 },
  { name: "立秋", month: 8, day: 7 },
  { name: "处暑", month: 8, day: 23 },
  { name: "白露", month: 9, day: 8 },
  { name: "秋分", month: 9, day: 23 },
  { name: "寒露", month: 10, day: 8 },
  { name: "霜降", month: 10, day: 23 },
  { name: "立冬", month: 11, day: 7 },
  { name: "小雪", month: 11, day: 22 },
  { name: "大雪", month: 12, day: 7 },
  { name: "冬至", month: 12, day: 22 },
];

export function currentSolarTerm(date = new Date()): string {
  const now = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let current = SOLAR_TERMS_2024[SOLAR_TERMS_2024.length - 1];
  for (const t of SOLAR_TERMS_2024) {
    const td = new Date(date.getFullYear(), t.month - 1, t.day);
    if (now >= td) current = t;
  }
  return current.name;
}
