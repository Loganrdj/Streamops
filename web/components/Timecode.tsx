"use client";

import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

function format(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h >= 24) return `${Math.floor(h / 24)}d ${pad(h % 24)}:${pad(m)}:${pad(s)}`;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Broadcast-style running clock: elapsed since `from` (on air) or remaining until `until` (next up). */
export function Timecode({ from, until, className }: { from?: string; until?: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const value =
    now === null ? "--:--:--" : from ? format(now - new Date(from).getTime()) : until ? format(new Date(until).getTime() - now) : "--:--:--";

  return (
    <span className={className} aria-live="off">
      {value}
    </span>
  );
}
