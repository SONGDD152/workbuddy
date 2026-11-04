// Open-Meteo 免费天气（无需 API Key）。前端直接调用或经此服务端封装。
export interface WeatherNow {
  temperature: number;
  code: number; // WMO weather code
  desc: string;
  windSpeed: number;
  precipitation: number;
}

const WMO: Record<number, string> = {
  0: "晴",
  1: "大致晴朗",
  2: "局部多云",
  3: "阴",
  45: "雾",
  48: "雾凇",
  51: "小毛雨",
  53: "毛毛雨",
  55: "大毛雨",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  66: "冻雨",
  67: "强冻雨",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  77: "雪粒",
  80: "阵雨",
  81: "强阵雨",
  82: "暴雨",
  85: "阵雪",
  86: "强阵雪",
  95: "雷阵雨",
  96: "雷阵雨伴冰雹",
  99: "强雷暴冰雹",
};

export function wmoDesc(code: number) {
  return WMO[code] ?? "未知";
}

export function isRainy(code: number) {
  return [51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code);
}

/** 浏览器定位 → 经纬度 → 当前天气 */
export async function getWeatherByCoords(
  lat: number,
  lon: number
): Promise<WeatherNow> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,precipitation&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("weather fetch failed");
  const json = await res.json();
  const c = json.current;
  return {
    temperature: Math.round(c.temperature_2m),
    code: c.weather_code,
    desc: wmoDesc(c.weather_code),
    windSpeed: c.wind_speed_10m,
    precipitation: c.precipitation ?? 0,
  };
}

/** 未来 48h 降雨总量（mm），用于养护提醒 */
export async function getRainNext48h(
  lat: number,
  lon: number
): Promise<number> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation&forecast_days=2&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) return 0;
  const json = await res.json();
  const arr: number[] = json.hourly?.precipitation ?? [];
  return arr.slice(0, 48).reduce((a, b) => a + (b || 0), 0);
}
