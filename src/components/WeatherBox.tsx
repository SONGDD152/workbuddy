"use client";
import * as React from "react";
import { MapPin, CloudRain } from "lucide-react";
import { getWeatherByCoords, isRainy } from "@/lib/weather";

export function WeatherBox({
  onWeather,
}: {
  onWeather: (w: { temp: number; rain: boolean; desc: string } | null) => void;
}) {
  const [state, setState] = React.useState<"idle" | "loading" | "ok" | "denied">("idle");
  const [info, setInfo] = React.useState<{ temp: number; rain: boolean; desc: string } | null>(null);

  React.useEffect(() => {
    if (!("geolocation" in navigator)) return setState("denied");
    setState("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const w = await getWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
          const next = { temp: w.temperature, rain: isRainy(w.code), desc: w.desc };
          setInfo(next);
          onWeather(next);
          setState("ok");
        } catch {
          setState("denied");
        }
      },
      () => setState("denied"),
      { timeout: 8000 }
    );
  }, [onWeather]);

  return (
    <div className="flex items-center gap-2 text-sm">
      <MapPin size={16} className="text-brand" />
      {state === "loading" && <span className="text-muted">定位中获取天气…</span>}
      {state === "denied" && <span className="text-muted">未授权定位（可在「今日速览」查看天气）</span>}
      {state === "ok" && info && (
        <span>
          {info.temp}℃ {info.desc}
          {info.rain && (
            <span className="ml-2 inline-flex items-center gap-1 text-brand">
              <CloudRain size={14} /> 有降水
            </span>
          )}
        </span>
      )}
    </div>
  );
}
