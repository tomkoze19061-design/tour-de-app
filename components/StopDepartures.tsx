"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Departure } from "@/lib/timetables";
import { readableTextColor } from "@/lib/lineDisplay";

type Props = { stopId: string };

// Čas z API (HH:MM + počet dní navíc) -> minuty od začátku provozního dne.
function toMinutes(time: string, dayOffset: number): number {
  const [h, m] = time.split(":").map(Number);
  return dayOffset * 24 * 60 + h * 60 + m;
}

function nowInMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

// Klíč směru: linka + cílová zastávka (např. „B → Campus Gate“).
function directionKey(d: Departure): string {
  return `${d.line.id}:${d.direction}`;
}

// Přehled odjezdů ze zastávky. API je vrací už seřazené podle času
// odjezdu (ne příjezdu) napříč všemi linkami -- tak cestující hned
// vidí, co jede první, ať je to jakákoliv linka.
export default function StopDepartures({ stopId }: Props) {
  const [departures, setDepartures] = useState<Departure[] | null | "error">(
    null
  );
  const [filter, setFilter] = useState<string>("all");
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/v1/stops/${stopId}/departures`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: Departure[]) => {
        if (!cancelled) setDepartures(data);
      })
      .catch(() => {
        if (!cancelled) setDepartures("error");
      });

    return () => {
      cancelled = true;
    };
  }, [stopId]);

  // Aktuální čas jen v prohlížeči (ne při renderu na serveru)
  // a každou minutu ho obnovíme, ať zvýraznění nejbližšího odjezdu sedí.
  useEffect(() => {
    setNow(nowInMinutes());
    const timer = setInterval(() => setNow(nowInMinutes()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const directions = useMemo(() => {
    if (!Array.isArray(departures)) return [];
    const map = new Map<string, Departure>();
    for (const d of departures) {
      if (!map.has(directionKey(d))) map.set(directionKey(d), d);
    }
    return [...map.entries()];
  }, [departures]);

  const visible = useMemo(() => {
    if (!Array.isArray(departures)) return [];
    return filter === "all"
      ? departures
      : departures.filter((d) => directionKey(d) === filter);
  }, [departures, filter]);

  // Nejbližší odjezd od teď (v rámci dnešního jízdního řádu).
  const nextTripId = useMemo(() => {
    if (now === null) return null;
    const next = visible.find(
      (d) => toMinutes(d.departure_time, d.departure_day_offset) >= now
    );
    return next?.trip_id ?? null;
  }, [visible, now]);

  return (
    <section className="mt-10" aria-labelledby="departures-heading">
      <h2
        id="departures-heading"
        className="text-lg font-semibold text-brand-blue-dark"
      >
        Odjezdy ze zastávky
      </h2>

      {departures === null && (
        <p className="mt-3 text-sm text-brand-black/60">Načítám odjezdy…</p>
      )}

      {departures === "error" && (
        <p className="mt-3 text-sm text-brand-black/70">
          Odjezdy se nepodařilo načíst. Zkuste to prosím znovu.
        </p>
      )}

      {Array.isArray(departures) && departures.length === 0 && (
        <p className="mt-3 text-sm text-brand-black/70">
          Z této zastávky momentálně neodjíždí žádný spoj.
        </p>
      )}

      {Array.isArray(departures) && departures.length > 0 && (
        <>
          {directions.length > 1 && (
            <div
              className="mt-4 flex flex-wrap gap-2"
              role="group"
              aria-label="Filtrovat podle směru"
            >
              <FilterButton
                active={filter === "all"}
                onClick={() => setFilter("all")}
              >
                Vše
              </FilterButton>
              {directions.map(([key, d]) => (
                <FilterButton
                  key={key}
                  active={filter === key}
                  onClick={() => setFilter(key)}
                >
                  <span
                    className="mr-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-xs font-bold"
                    style={{
                      backgroundColor: d.line.color,
                      color: readableTextColor(d.line.color),
                    }}
                  >
                    {d.line.number}
                  </span>
                  → {d.destination.name}
                </FilterButton>
              ))}
            </div>
          )}

          <div className="mt-4 overflow-hidden rounded-xl border border-brand-blue/15">
            <div className="flex items-center gap-3 border-b border-brand-blue/15 bg-brand-blue/5 px-4 py-2 text-xs font-medium uppercase tracking-wide text-brand-black/60">
              <span className="w-16 shrink-0">Odjezd</span>
              <span className="flex-1">Linka a směr</span>
              <span className="hidden w-20 text-right sm:block">Příjezd</span>
              <span className="w-24 shrink-0" aria-hidden />
            </div>

            <ul className="divide-y divide-brand-blue/10">
              {visible.map((d) => {
                const isNext = d.trip_id === nextTripId;
                const waits = d.arrival_time !== d.departure_time ||
                  d.arrival_day_offset !== d.departure_day_offset;

                return (
                  <li key={d.trip_id}>
                    <Link
                      href={`/trips/${d.trip_id}`}
                      className={`group flex items-center gap-3 px-4 py-3 transition hover:bg-brand-blue/5 ${
                        isNext ? "bg-brand-green/20" : ""
                      }`}
                    >
                      <span className="w-16 shrink-0">
                        <span className="block text-lg font-semibold tabular-nums text-brand-black">
                          {d.departure_time}
                        </span>
                        {d.departure_day_offset > 0 && (
                          <span className="block text-xs text-brand-black/60">
                            po půlnoci
                          </span>
                        )}
                      </span>

                      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                        <span
                          className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-sm font-bold"
                          style={{
                            backgroundColor: d.line.color,
                            color: readableTextColor(d.line.color),
                          }}
                          aria-label={`Linka ${d.line.number}`}
                        >
                          {d.line.number}
                        </span>
                        <span className="text-sm text-brand-black">
                          směr <span className="font-medium">{d.destination.name}</span>
                        </span>
                        {isNext && (
                          <span className="rounded-full bg-brand-green px-2 py-0.5 text-xs font-semibold text-brand-blue-dark">
                            nejbližší
                          </span>
                        )}
                        {/* Na mobilu se sloupec příjezdu nevejde -- ukážeme ho tady */}
                        <span className="w-full text-xs text-brand-black/60 sm:hidden">
                          příjezd {d.arrival_time}
                          {waits && " · stojí na zastávce"}
                        </span>
                      </span>

                      <span className="hidden w-20 text-right text-sm tabular-nums text-brand-black/70 sm:block">
                        {d.arrival_time}
                      </span>

                      <span className="w-24 shrink-0 text-right text-sm font-medium text-brand-blue group-hover:underline">
                        Detail spoje →
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "border-brand-blue bg-brand-blue text-brand-white"
          : "border-brand-blue/20 text-brand-blue-dark hover:bg-brand-blue/5"
      }`}
    >
      {children}
    </button>
  );
}
