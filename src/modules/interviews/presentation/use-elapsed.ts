"use client";

import { useEffect, useState } from "react";

/** Segundos transcurridos desde `since` (ms), actualizados cada segundo mientras `active` sea verdadero. */
export function useElapsedSeconds(since: number, active = true): number {
  const [now, setNow] = useState(since);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return Math.max(0, Math.round((now - since) / 1000));
}

export function formatClock(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? "-" : "";
  const abs = Math.abs(Math.round(totalSeconds));
  return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;
}
