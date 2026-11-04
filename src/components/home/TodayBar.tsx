"use client";
import * as React from "react";
import Link from "next/link";
import { MapPin, Shirt, Utensils, Cloud } from "lucide-react";
import { getWeatherByCoords, wmoDesc } from "@/lib/weather";
import { currentSolarTerm } from "@/lib/utils";

export function TodayBar() {
  const [weather, setWeather] = React.useState<
    { temperature: number; desc: string } | null
  >(null);
  const [geoState, setGeoState] = React.useState<"idle" | "loading" | "denied" | "ok">(
    "idle"
  );
  const term = currentSolarTerm();

  React.useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoState("denied");
      return;
    }
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const w = await getWeatherByCoords(
            pos.coords.latitude,
            pos.coords.longitude
          );
          setWeather({ temperature: w.temperature, desc: w.desc });
          setGeoState("ok");
        } catch {
          setGeoState("denied");
        }
      },
      () => setGeoState("denied"),
      { timeout: 8000 }
    );
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-3 text-sm">
      <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-3 py-1 font-medium text-brand">
        {term}
      </span>

      <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1">
        <Cloud size={14} />
        {geoState === "loading" && "定位中…"}
        {geoState === "ok" && weather && (
          <>
            {weather.temperature}℃ {weather.desc}
          </>
        )}
        {geoState === "denied" && (
          <span className="text-muted">未授权定位（手动查看天气）</span>
        )}
        {geoState === "idle" && <MapPin size={14} />}
      </span>

      <Link
        href="/life/wardrobe"
        className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1 hover:bg-border"
      >
        <Shirt size={14} /> 今日穿搭
      </Link>
      <Link
        href="/life/food"
        className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1 hover:bg-border"
      >
        <Utensils size={14} /> 今日饮食
      </Link>
    </div>
  );
}
