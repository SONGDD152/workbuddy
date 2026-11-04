// 内置菜库（默认）。生产环境可用 prisma seed 写入数据库；此处作为离线默认与自定义合并。
export interface VegSeed {
  name: string;
  growDays: number;
  suitableTerm: string;
  tag: string;
}

export const DEFAULT_VEGETABLES: VegSeed[] = [
  { name: "番茄", growDays: 90, suitableTerm: "春", tag: "喜温" },
  { name: "黄瓜", growDays: 60, suitableTerm: "夏", tag: "喜温" },
  { name: "生菜", growDays: 40, suitableTerm: "春", tag: "耐寒" },
  { name: "菠菜", growDays: 50, suitableTerm: "秋", tag: "耐寒" },
  { name: "辣椒", growDays: 80, suitableTerm: "夏", tag: "喜温" },
  { name: "萝卜", growDays: 55, suitableTerm: "秋", tag: "耐寒" },
  { name: "土豆", growDays: 100, suitableTerm: "春", tag: "耐寒" },
  { name: "草莓", growDays: 120, suitableTerm: "春", tag: "喜温" },
  { name: "空心菜", growDays: 45, suitableTerm: "夏", tag: "喜温" },
  { name: "大白菜", growDays: 70, suitableTerm: "秋", tag: "耐寒" },
];
