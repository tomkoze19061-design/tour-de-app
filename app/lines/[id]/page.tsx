"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Line, LineDetail } from "@/lib/lines";
import LineBadge from "@/components/LineBadge";
import { lineTypeLabel, readableTextColor } from "@/lib/lineDisplay";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; line: LineDetail };

const GENERIC_ERROR = "Linku se nepodařilo načíst. Zkuste to prosím znovu.";

export default function LineDetailPage() {
  const params = useParams<{ id: string }>();
  const [state, setState] = useState<State>({ status: "loading" });
  const [activeTripId, setActiveTripId] = useState<number | null>(null);
  // Pro každou zastávku: ostatní linky, na které se tam dá přestoupit.
  const [transfers, setTransfers] = useState<Record<number, Line[]>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/v1/lines/${params.id}`);

        // 400 = nesmyslné ID v adrese, 404 = linka neexistuje.
        // Pro cestujícího je to v obou případech totéž.
        if (res.status === 400 || res.status === 404) {
          if (!cancelled) {
            setState({ status: "error", message: "Linka nebyla nalezena." });
          }
          return;
        }
        if (!res.ok) throw new Error();

        const line = (await res.json()) as LineDetail;
        if (cancelled) return;

        setState({ status: "ok", line });
        const firstTrip =
          line.trips.find((t) => t.direction_type === "outbound") ??
          line.trips[0];
        setActiveTripId(firstTrip?.id ?? null);

        // Přestupy dotahujeme až potom -- stránka se zobrazí hned
        // a když se přestupy nenačtou, nic důležitého nechybí.
        const stopIds = [
          ...new Set(line.trips.flatMap((t) => t.stops.map((s) => s.id))),
        ];
        const entries = await Promise.all(
          stopIds.map(async (stopId) => {
            try {
              const r = await fetch(`/api/v1/stops/${stopId}/lines`);
              if (!r.ok) return [stopId, []] as const;
              const lines = (await r.json()) as Line[];
              return [stopId, lines.filter((l) => l.id !== line.id)] as const;
            } catch {
              return [stopId, []] as const;
            }
          })
        );
        if (!cancelled) setTransfers(Object.fromEntries(entries));
      } catch {
        if (!cancelled) {
          setState({ status: "error", message: GENERIC_ERROR });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (state.status === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-brand-black/70">Načítám linku…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-semibold text-brand-blue-dark">Linka</h1>
        <p className="mt-4 text-brand-black/70">{state.message}</p>
        <Link
          href="/lines"
          className="mt-6 inline-block text-sm font-medium text-brand-blue hover:underline"
        >
          ← Zpět na seznam linek
        </Link>
      </div>
    );
  }

  const { line } = state;
  const activeTrip =
    line.trips.find((t) => t.id === activeTripId) ?? line.trips[0];

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/lines"
        className="text-sm font-medium text-brand-blue hover:underline"
      >
        ← Všechny linky
      </Link>

      <div className="mt-4 flex items-center gap-4">
        <LineBadge number={line.number} color={line.color} size="lg" />
        <div>
          <h1 className="text-2xl font-semibold text-brand-blue-dark">
            {line.name}
          </h1>
          <span className="mt-1 inline-block rounded-full bg-brand-blue/10 px-3 py-0.5 text-xs font-medium text-brand-blue-dark">
            {lineTypeLabel(line.type)}
          </span>
        </div>
      </div>

      {line.trips.length === 0 || !activeTrip ? (
        <p className="mt-8 text-brand-black/70">
          Tato linka zatím nemá zadanou žádnou trasu.
        </p>
      ) : (
        <>
          {line.trips.length > 1 && (
            <div
              role="tablist"
              aria-label="Směr jízdy"
              className="mt-8 inline-flex flex-wrap gap-1 rounded-xl bg-brand-blue/5 p-1"
            >
              {line.trips.map((trip) => {
                const active = trip.id === activeTrip.id;
                return (
                  <button
                    key={trip.id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTripId(trip.id)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                      active
                        ? "shadow-sm"
                        : "text-brand-blue-dark hover:bg-brand-white/70"
                    }`}
                    style={
                      active
                        ? {
                            backgroundColor: line.color,
                            color: readableTextColor(line.color),
                          }
                        : undefined
                    }
                  >
                    Směr {trip.direction}
                  </button>
                );
              })}
            </div>
          )}

          <p className="mt-6 text-sm text-brand-black/70">
            {activeTrip.stops[0]?.name} → {activeTrip.direction} ·{" "}
            {activeTrip.stops.length}{" "}
            {activeTrip.stops.length < 5 ? "zastávky" : "zastávek"}
          </p>

          <ol className="mt-4">
            {activeTrip.stops.map((stop, index) => {
              const isFirst = index === 0;
              const isLast = index === activeTrip.stops.length - 1;
              const otherLines = transfers[stop.id] ?? [];

              return (
                <li key={stop.id} className="relative flex gap-4">
                  {/* Svislá čára trasy v barvě linky */}
                  <div className="relative flex w-8 shrink-0 justify-center">
                    <span
                      aria-hidden
                      className="absolute w-1.5"
                      style={{
                        backgroundColor: line.color,
                        top: isFirst ? "50%" : 0,
                        bottom: isLast ? "50%" : 0,
                      }}
                    />
                    <span
                      className={`relative z-10 my-auto flex items-center justify-center rounded-full border-4 bg-brand-white text-xs font-bold text-brand-black ${
                        isFirst || isLast ? "h-8 w-8" : "h-7 w-7"
                      }`}
                      style={{ borderColor: line.color }}
                    >
                      {stop.position}
                    </span>
                  </div>

                  <Link
                    href={`/stops/${stop.id}`}
                    className="group my-1 flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-3 transition hover:bg-brand-blue/5"
                  >
                    <span
                      className={`text-brand-black group-hover:text-brand-blue ${
                        isFirst || isLast ? "font-semibold" : "font-medium"
                      }`}
                    >
                      {stop.name}
                    </span>

                    {otherLines.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-brand-black/60">
                        přestup na
                        {otherLines.map((other) => (
                          <span
                            key={other.id}
                            className="inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[11px] font-bold"
                            style={{
                              backgroundColor: other.color,
                              color: readableTextColor(other.color),
                            }}
                            title={other.name}
                          >
                            {other.number}
                          </span>
                        ))}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
