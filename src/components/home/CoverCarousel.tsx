"use client";
import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface Slide {
  src: string;
  title: string;
  href: string;
}

export function CoverCarousel({ slides }: { slides: Slide[] }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [index, setIndex] = React.useState(0);
  const count = slides.length;

  React.useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, 4500);
    return () => clearInterval(t);
  }, [count]);

  React.useEffect(() => {
    ref.current?.scrollTo({
      left: index * ref.current.clientWidth,
      behavior: "smooth",
    });
  }, [index]);

  if (count === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl bg-surface-2 text-muted sm:h-72">
        还没有封面照片，去「旅行摄影」上传第一张吧
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={ref}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-2xl"
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {slides.map((s, i) => (
          <Link
            key={i}
            href={s.href}
            className="relative h-56 w-full flex-shrink-0 snap-center sm:h-80"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.src}
              alt={s.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 text-white">
              <p className="text-xs opacity-80">封面</p>
              <p className="text-lg font-semibold drop-shadow">{s.title}</p>
            </div>
          </Link>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white"
            onClick={() => setIndex((i) => (i - 1 + count) % count)}
            aria-label="上一张"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white"
            onClick={() => setIndex((i) => (i + 1) % count)}
            aria-label="下一张"
          >
            <ChevronRight size={18} />
          </button>
          <div className="absolute bottom-3 right-4 flex gap-1.5">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${
                  i === index ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
