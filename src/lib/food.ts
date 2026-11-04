// 餐饮智能推荐规则引擎（节气 + 天气 + 餐次；支持减脂模式）
export interface Dish {
  name: string;
  steps: string[];
  burden: "低" | "中" | "高"; // 油糖负担
  tags: string[]; // 如 清淡/高蛋白/应季
  suitable: string[]; // 适宜节气或季节关键词
}

const DISHES: Dish[] = [
  { name: "番茄炒蛋", steps: ["鸡蛋打散，番茄切块", "热锅少油，下番茄炒出汁", "倒入蛋液翻炒，少许盐"], burden: "低", tags: ["家常", "清淡", "高蛋白"], suitable: ["春", "夏", "秋", "冬"] },
  { name: "清炒时蔬", steps: ["时令蔬菜洗净切段", "蒜末爆香", "大火快炒，少盐"], burden: "低", tags: ["清淡", "膳食纤维"], suitable: ["春", "夏", "秋", "冬"] },
  { name: "冬瓜排骨汤", steps: ["排骨焯水", "加冬瓜、姜片小火炖 1h", "加盐调味"], burden: "中", tags: ["汤品", "应季"], suitable: ["夏", "秋"] },
  { name: "小米南瓜粥", steps: ["小米淘净", "南瓜切块同煮 30 分钟", "至软烂"], burden: "低", tags: ["养胃", "清淡"], suitable: ["秋", "冬"] },
  { name: "凉拌黄瓜", steps: ["黄瓜拍碎切段", "蒜泥、醋、少许香油拌匀"], burden: "低", tags: ["清爽", "低卡"], suitable: ["夏"] },
  { name: "红烧肉", steps: ["五花肉焯水", "冰糖炒色，加生抽老抽", "小火慢炖 40 分钟"], burden: "高", tags: ["硬菜"], suitable: ["冬"] },
  { name: "蒸鲈鱼", steps: ["鱼身改刀，铺姜片", "水开后蒸 8 分钟", "淋蒸鱼豉油、热油"], burden: "低", tags: ["高蛋白", "清淡"], suitable: ["春", "秋", "冬"] },
  { name: "燕麦牛奶", steps: ["燕麦入碗", "冲入热牛奶", "可加少量水果"], burden: "低", tags: ["早餐", "低GI"], suitable: ["春", "夏", "秋", "冬"] },
  { name: "紫菜蛋花汤", steps: ["水开下紫菜", "淋入蛋液成花", "加盐、香油"], burden: "低", tags: ["清淡", "快手"], suitable: ["春", "夏", "秋", "冬"] },
  { name: "白灼虾", steps: ["水加姜片料酒烧开", "下虾煮 2 分钟至变红", "蘸生抽"], burden: "低", tags: ["高蛋白", "低脂"], suitable: ["夏", "秋"] },
];

export interface FoodSuggestOpts {
  meal: "BREAKFAST" | "LUNCH" | "DINNER";
  term: string; // 当前节气名
  temp: number;
  rain: boolean;
  reduceFat: boolean; // 减脂期
}

export function suggestDishes(opts: FoodSuggestOpts): Dish[] {
  let pool = DISHES;
  if (opts.reduceFat) {
    pool = pool.filter((d) => d.burden !== "高");
  }
  // 早餐偏轻食
  if (opts.meal === "BREAKFAST") {
    pool = pool.filter((d) =>
      ["燕麦牛奶", "小米南瓜粥", "番茄炒蛋", "紫菜蛋花汤"].includes(d.name)
    );
  }
  // 按油温负担排序：减脂期低负担优先
  const sorted = [...pool].sort((a, b) => {
    const w = { 低: 0, 中: 1, 高: 2 };
    return w[a.burden] - w[b.burden];
  });
  return sorted.slice(0, 4);
}
