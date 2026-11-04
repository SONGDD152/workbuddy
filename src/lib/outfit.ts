// 穿搭推荐规则引擎（不依赖大模型，确定性逻辑）
import type { Clothing, OutfitFeedback, Season, Occasion } from "@prisma/client";

export interface Outfit {
  top?: Clothing;
  bottom?: Clothing;
  skirt?: Clothing;
  outer?: Clothing;
  shoe?: Clothing;
  accessory?: Clothing;
}

export interface OutfitSuggestion {
  items: Clothing[];
  reason: string;
  score: number;
}

function seasonForTemp(temp: number): Season[] {
  if (temp >= 28) return ["SUMMER"];
  if (temp >= 20) return ["SPRING", "SUMMER", "AUTUMN"];
  if (temp >= 12) return ["SPRING", "AUTUMN", "WINTER"];
  return ["WINTER", "AUTUMN"];
}

function fit(
  c: Clothing,
  seasons: Season[],
  occasion: Occasion,
  rain: boolean,
  hasWorn: Set<string>
): number {
  let s = 0;
  if (c.seasons.some((x) => seasons.includes(x))) s += 2;
  if (c.occasions.includes(occasion)) s += 2;
  if (rain && (c.type === "OUTER" || c.type === "SHOE")) s += 1;
  // 偏好权重：被采纳过的组合相关单品加权
  if (hasWorn.has(c.id)) s += 1;
  return s;
}

/**
 * 根据天气 + 场合 + 历史反馈，生成多套搭配。
 */
export function suggestOutfits(
  clothes: Clothing[],
  opts: { temp: number; rain: boolean; occasion: Occasion; feedbacks: OutfitFeedback[] }
): OutfitSuggestion[] {
  const seasons = seasonForTemp(opts.temp);
  const byType = (t: Clothing["type"]) =>
    clothes.filter((c) => c.type === t);

  // 偏好单品集合（被采纳过的组合键里的 id）
  const worn = new Set<string>();
  for (const f of opts.feedbacks) {
    if (f.adopted) f.comboKey.split("|").forEach((k) => worn.add(k.split(":")[1]));
  }

  const tops = byType("TOP");
  const bottoms = byType("BOTTOM");
  const skirts = byType("SKIRT");
  const outers = byType("OUTER");
  const shoes = byType("SHOE");
  const accessories = byType("ACCESSORY");

  const lowers = [...bottoms, ...skirts];
  const out: OutfitSuggestion[] = [];

  for (const top of tops) {
    const lower = lowers.length
      ? lowers.sort(
          (a, b) =>
            fit(b, seasons, opts.occasion, opts.rain, worn) -
            fit(a, seasons, opts.occasion, opts.rain, worn)
        )[0]
      : undefined;
    const shoe = shoes.length
      ? shoes.sort(
          (a, b) =>
            fit(b, seasons, opts.occasion, opts.rain, worn) -
            fit(a, seasons, opts.occasion, opts.rain, worn)
        )[0]
      : undefined;
    const outer =
      opts.temp < 18 || opts.rain
        ? outers.sort(
            (a, b) =>
              fit(b, seasons, opts.occasion, opts.rain, worn) -
              fit(a, seasons, opts.occasion, opts.rain, worn)
          )[0]
        : undefined;
    const acc = accessories.sort(
      (a, b) =>
        fit(b, seasons, opts.occasion, opts.rain, worn) -
        fit(a, seasons, opts.occasion, opts.rain, worn)
    )[0];

    const items = [top, lower, shoe, outer, acc].filter(Boolean) as Clothing[];
    const score = items.reduce(
      (sum, c) => sum + fit(c, seasons, opts.occasion, opts.rain, worn),
      0
    );
    const reasons: string[] = [];
    reasons.push(`气温 ${opts.temp}℃ 适配季节：${seasons.join("/")}`);
    if (opts.rain) reasons.push("有降水，优先外套/雨鞋");
    if (outer) reasons.push("气温偏低，已加入外套");
    if (worn.has(top.id)) reasons.push("基于你过往采纳偏好加权");

    out.push({
      items,
      reason: reasons.join("；"),
      score,
    });
  }

  return out.sort((a, b) => b.score - a.score).slice(0, 4);
}
