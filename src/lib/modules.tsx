import { type LucideIcon } from "lucide-react";
import {
  Heart,
  Plane,
  Shirt,
  Boxes,
  Utensils,
  Sprout,
  BookOpen,
  Clapperboard,
  GraduationCap,
  NotebookPen,
  Briefcase,
  ClipboardList,
  AlertTriangle,
  Printer,
} from "lucide-react";

/**
 * 全站模块单一数据源：
 * - AppShell 左侧折叠树（NavTree）由此派生（保证子项与顺序唯一）
 * - 模块落地页（/life、/library）的分组目录由此渲染
 * 改模块结构只改这一处即可，避免多套定义各写各的。
 *
 * ModuleEntry.icon 可选（深层子页可不带图标，渲染为圆点）。
 * children 用于多级折叠：如「家庭仓储」下挂 仓储总览/借出清单/预警大屏/标签打印。
 */
export type ModuleEntry = {
  href: string;
  label: string;
  icon?: LucideIcon;
  hint?: string;
  children?: ModuleEntry[];
};

export type ModuleSubGroup = { title: string; items: ModuleEntry[] };

export type ModuleGroup = {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
  /** 落地页里的分组（如 生活记录 / 物品管理）；空数组表示暂无子页 */
  groups: ModuleSubGroup[];
  /** 左侧导航树的子项（顺序即展示顺序）；可带 children 形成多级 */
  items: ModuleEntry[];
};

export const MODULES: ModuleGroup[] = [
  {
    key: "life",
    label: "生活",
    icon: Heart,
    href: "/life",
    groups: [
      {
        title: "生活记录",
        items: [
          { href: "/life/travel", label: "旅行摄影", icon: Plane, hint: "按年月归档的图文记录" },
          { href: "/life/food", label: "餐饮", icon: Utensils, hint: "节气家常菜 + 饮食记录" },
          { href: "/life/hobbies", label: "兴趣爱好", icon: Heart, hint: "领域时间线 + 进度" },
          { href: "/life/garden", label: "园艺种植", icon: Sprout, hint: "节气种植 + 养护提醒" },
        ],
      },
      {
        title: "物品管理",
        items: [
          { href: "/life/storage", label: "家庭仓储", icon: Boxes, hint: "二维码出入库 · 借还超期预警" },
          { href: "/life/wardrobe", label: "衣橱穿搭", icon: Shirt, hint: "智能穿搭 + 天气推荐" },
        ],
      },
    ],
    items: [
      {
        href: "/life/travel",
        label: "旅行摄影",
        icon: Plane,
        hint: "按年月归档的图文记录",
        children: [
          { href: "/life/travel/new", label: "增加旅行记录" },
          { href: "/life/travel/history", label: "浏览历史旅行记录" },
        ],
      },
      { href: "/life/food", label: "餐饮", icon: Utensils, hint: "节气家常菜 + 饮食记录" },
      { href: "/life/hobbies", label: "兴趣爱好", icon: Heart, hint: "领域时间线 + 进度" },
      { href: "/life/garden", label: "园艺种植", icon: Sprout, hint: "节气种植 + 养护提醒" },
      {
        href: "/life/storage",
        label: "家庭仓储",
        icon: Boxes,
        hint: "二维码出入库 · 借还超期预警",
        children: [
          { href: "/life/storage", label: "仓储总览", icon: Boxes },
          { href: "/life/storage/loans", label: "借出清单", icon: ClipboardList },
          { href: "/life/storage/alerts", label: "预警大屏", icon: AlertTriangle },
          { href: "/life/storage/labels", label: "标签打印", icon: Printer },
        ],
      },
      { href: "/life/wardrobe", label: "衣橱穿搭", icon: Shirt, hint: "智能穿搭 + 天气推荐" },
    ],
  },
  {
    key: "library",
    label: "图书馆",
    icon: BookOpen,
    href: "/library",
    groups: [
      {
        title: "阅读与学习",
        items: [
          { href: "/library/books", label: "读书笔记", icon: BookOpen, hint: "笔记 + AI 读书报告" },
          { href: "/library/study", label: "专业学习", icon: GraduationCap, hint: "主题笔记 + 总结报告" },
        ],
      },
      {
        title: "记录与分享",
        items: [
          { href: "/library/movies", label: "影评", icon: Clapperboard, hint: "碎片记录 + 观影报告" },
          { href: "/library/diary", label: "日记", icon: NotebookPen, hint: "纯文字时间线" },
        ],
      },
    ],
    items: [
      { href: "/library/books", label: "读书笔记", icon: BookOpen, hint: "笔记 + AI 读书报告" },
      { href: "/library/study", label: "专业学习", icon: GraduationCap, hint: "主题笔记 + 总结报告" },
      { href: "/library/movies", label: "影评", icon: Clapperboard, hint: "碎片记录 + 观影报告" },
      { href: "/library/diary", label: "日记", icon: NotebookPen, hint: "纯文字时间线" },
    ],
  },
  {
    key: "work",
    label: "工作",
    icon: Briefcase,
    href: "/work",
    groups: [],
    items: [],
  },
];

/** 当前路径所属模块（含落地页本身）；用于判断该展示哪棵导航树 */
export function findModule(pathname: string): ModuleGroup | undefined {
  return MODULES.find(
    (m) => pathname === m.href || pathname.startsWith(m.href + "/")
  );
}
