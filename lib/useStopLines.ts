"use client";

import { useEffect, useState } from "react";
import type { Line, LineDetail } from "@/lib/lines";

// Načte všechny linky z REST API a sestaví mapu
// "ID zastávky -> linky, které ji obsluhují".
//
// Místo dotazu /api/v1/stops/:id/lines pro každou zastávku zvlášť
// (u 15 zastávek 15 požadavků) stačí seznam linek a jejich detaily,
// takže počet požadavků roste s počtem linek, ne zastávek.
//
// Když se linky nepodaří načíst, vrátí prázdnou mapu -- stránka
// se zastávkami pak funguje dál, jen bez odznaků linek.
export function useStopLines(): {
  linesByStop: Map<number, Line[]>;
  loaded: boolean;
} {
  const [linesByStop, setLinesByStop] = useState<Map<number, Line[]>>(
    () => new Map()
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/v1/lines");
        if (!res.ok) throw new Error();
        const lines = (await res.json()) as Line[];

        const details = await Promise.all(
          lines.map(async (line) => {
            const r = await fetch(`/api/v1/lines/${line.id}`);
            if (!r.ok) return null;
            return (await r.json()) as LineDetail;
          })
        );

        const map = new Map<number, Line[]>();
        for (const detail of details) {
          if (!detail) continue;
          const { trips, ...line } = detail;
          const stopIds = new Set(
            trips.flatMap((t) => t.stops.map((s) => s.id))
          );
          for (const stopId of stopIds) {
            const list = map.get(stopId) ?? [];
            list.push(line);
            map.set(stopId, list);
          }
        }

        if (!cancelled) setLinesByStop(map);
      } catch {
        // Linky jsou doplňková informace -- chybu nezobrazujeme.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { linesByStop, loaded };
}
