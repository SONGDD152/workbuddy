import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { CoverCarousel, type Slide } from "@/components/home/CoverCarousel";
import { TodayBar } from "@/components/home/TodayBar";
import { FuncGroup, FuncEntry } from "@/components/FunctionDirectory";
import {
  Plane,
  Shirt,
  Boxes,
  Utensils,
  Heart,
  Sprout,
  BookOpen,
  Clapperboard,
  GraduationCap,
  NotebookPen,
  Briefcase,
} from "lucide-react";

export const dynamic = "force-dynamic";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export default async function HomePage() {
  // 仪表盘统计与封面必须限定在当前登录账号，避免跨账号数据串台
  const uid = await getUserId();
  if (!uid) redirect("/login");

  const [travels, counts] = await Promise.all([
    safe(
      () =>
        prisma.travel.findMany({
          where: { userId: uid, images: { isEmpty: false } },
          orderBy: { date: "desc" },
          take: 8,
        }),
      []
    ),
    Promise.all([
      safe(() => prisma.travel.count({ where: { userId: uid } }), 0),
      safe(() => prisma.clothing.count({ where: { userId: uid } }), 0),
      safe(() => prisma.storageItem.count({ where: { userId: uid } }), 0),
      safe(() => prisma.foodRecord.count({ where: { userId: uid } }), 0),
      safe(() => prisma.hobby.count({ where: { userId: uid } }), 0),
      safe(() => prisma.gardenPlant.count({ where: { userId: uid } }), 0),
      safe(() => prisma.book.count({ where: { userId: uid } }), 0),
      safe(() => prisma.movie.count({ where: { userId: uid } }), 0),
      safe(() => prisma.study.count({ where: { userId: uid } }), 0),
      safe(() => prisma.diary.count({ where: { userId: uid } }), 0),
    ]),
  ]);

  const slides: Slide[] = travels
    .filter((t) => t.images?.length)
    .map((t) => ({ src: t.images[0], title: t.title, href: "/life/travel" }));

  const lifeModules = [
    { href: "/life/travel", label: "旅行摄影", icon: Plane, count: counts[0], hint: "按年月归档的图文记录" },
    { href: "/life/wardrobe", label: "衣橱穿搭", icon: Shirt, count: counts[1], hint: "智能穿搭 + 天气推荐" },
    { href: "/life/storage", label: "家庭仓储", icon: Boxes, count: counts[2], hint: "二维码出入库 · 明细导出 · 借还超期预警" },
    { href: "/life/food", label: "餐饮", icon: Utensils, count: counts[3], hint: "节气家常菜 + 饮食记录" },
    { href: "/life/hobbies", label: "兴趣爱好", icon: Heart, count: counts[4], hint: "领域时间线 + 进度" },
    { href: "/life/garden", label: "园艺种植", icon: Sprout, count: counts[5], hint: "节气种植 + 养护提醒" },
  ];
  const libraryModules = [
    { href: "/library/books", label: "读书笔记", icon: BookOpen, count: counts[6], hint: "笔记 + AI 读书报告" },
    { href: "/library/movies", label: "影评", icon: Clapperboard, count: counts[7], hint: "碎片记录 + 观影报告" },
    { href: "/library/study", label: "专业学习", icon: GraduationCap, count: counts[8], hint: "主题笔记 + 总结报告" },
    { href: "/library/diary", label: "日记", icon: NotebookPen, count: counts[9], hint: "纯文字时间线" },
  ];
  const workModules = [{ href: "/work", label: "工作频道", icon: Briefcase, count: 0, hint: "模块规划中" }];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">我的频道</h1>
        <p className="text-sm text-muted">生活 · 图书馆 · 工作（建设中）</p>
      </header>

      <CoverCarousel slides={slides} />

      <TodayBar />

      {/* 功能导航：与仓储页一致的分组快捷入口目录 */}
      <section className="space-y-4 rounded-2xl border border-border bg-surface/60 p-4">
        <FuncGroup title="生活">
          {lifeModules.map((m) => (
            <FuncEntry key={m.href} icon={m.icon} title={m.label} hint={m.hint} href={m.href} badge={m.count} />
          ))}
        </FuncGroup>
        <FuncGroup title="图书馆">
          {libraryModules.map((m) => (
            <FuncEntry key={m.href} icon={m.icon} title={m.label} hint={m.hint} href={m.href} badge={m.count} />
          ))}
        </FuncGroup>
        <FuncGroup title="工作">
          {workModules.map((m) => (
            <FuncEntry key={m.href} icon={m.icon} title={m.label} hint={m.hint} href={m.href} badge={m.count} />
          ))}
        </FuncGroup>
      </section>
    </div>
  );
}
