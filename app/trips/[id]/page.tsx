"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { TripDetail } from "@/lib/timetables";
import LineBadge from "@/components/LineBadge";
import { lineTypeLabel } from "@/lib/lineDisplay";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; trip: TripDetail };

const GENERIC_ERROR = "Spoj se nepodařilo načíst. Zkuste to prosím znovu.";

// Čas z API (HH:MM + počet dní navíc) -> minuty od začátku provozního
// dne, ve kterém spoj vyjel. Slouží k výpočtu doby jízdy a stání.
function toMinutes(time: string, dayOffset: number): number {
  const [h, m] = time.split(":").map(Number);
  return dayOffset * 24 * 60 + h * 60 + m;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

// Čas s poznámkou, když už je po půlnoci (spoj vyjel předchozí den).
// Spoj ve 23:52 s příjezdem v 0:14 tak zůstává večerním spojem.
function TimeLabel({ time, dayOffset }: { time: string; dayOffset: number }) {
  return (
    <>
      <span className="tabular-nums">{time}</span>
      {dayOffset > 0 && (
        <span className="ml-1 text-xs font-normal text-brand-black/60">
          (+{dayOffset} {dayOffset === 1 ? "den" : "dny"})
        </span>
      )}
    </>
  );
}

export default function TripDetailPage() {
  const params = useParams<{ id: string }>();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/v1/trips/${params.id}`);
        if (res.status === 400 || res.status === 404) {
          if (!cancelled) {
            setState({ status: "error", message: "Spoj nebyl nalezen." });
          }
          return;
        }
        if (!res.ok) throw new Error();
        const trip = (await res.json()) as TripDetail;
        if (!cancelled) setState({ status: "ok", trip });
      } catch {
        if (!cancelled) setState({ status: "error", message: GENERIC_ERROR });
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
        <p className="text-brand-black/70">Načítám spoj…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-semibold text-brand-blue-dark">Spoj</h1>
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

  const { trip } = state;
  const { line } = trip;
  const first = trip.stops[0];
  const last = trip.stops[trip.stops.length - 1];
  const duration =
    toMinutes(last.arrival_time, last.arrival_day_offset) -
    toMinutes(first.departure_time, first.departure_day_offset);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href={`/lines/${line.id}`}
        className="text-sm font-medium text-brand-blue hover:underline"
      >
        ← Linka {line.number} – {line.name}
      </Link>

      {/* Linka, směr, výchozí a cílová zastávka */}
      <div className="mt-4 flex items-start gap-4">
        <LineBadge number={line.number} color={line.color} size="lg" />
        <div className="min-w-0">
          <p className="text-sm text-brand-black/70">
            Linka {line.number} · {line.name} · {lineTypeLabel(line.type)}
          </p>
          <h1 className="text-2xl font-semibold text-brand-blue-dark">
            Směr {trip.destination.name}
          </h1>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-brand-blue/15 p-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-brand-black/60">Výchozí zastávka</dt>
          <dd className="font-semibold text-brand-black">{trip.origin.name}</dd>
        </div>
        <div>
          <dt className="text-brand-black/60">Odjezd</dt>
          <dd className="font-semibold text-brand-black">
            <TimeLabel
              time={trip.departure_time}
              dayOffset={trip.departure_day_offset}
            />
          </dd>
        </div>
        <div>
          <dt className="text-brand-black/60">Cílová zastávka</dt>
          <dd className="font-semibold text-brand-black">
            {trip.destination.name}
          </dd>
        </div>
        <div>
          <dt className="text-brand-black/60">Příjezd do cíle</dt>
          <dd className="font-semibold text-brand-black">
            <TimeLabel time={last.arrival_time} dayOffset={last.arrival_day_offset} />
            <span className="ml-1 font-normal text-brand-black/60">
              ({formatDuration(duration)})
            </span>
          </dd>
        </div>
      </dl>

      {/* Jízdní řád: zastávky v pořadí trasy s příjezdem a odjezdem */}
      <h2 className="mt-10 text-lg font-semibold text-brand-blue-dark">
        Jízdní řád spoje
      </h2>

      <div className="mt-3 flex items-center gap-4 border-b border-brand-blue/15 pb-2 pr-2 text-xs font-medium uppercase tracking-wide text-brand-black/60">
        <span className="w-8 shrink-0" aria-hidden />
        <span className="flex-1 pl-1">Zastávka</span>
        <span className="w-20 text-right sm:w-24">Příjezd</span>
        <span className="w-20 text-right sm:w-24">Odjezd</span>
      </div>

      <ol aria-label="Zastávky spoje">
        {trip.stops.map((stop, index) => {
          const isFirst = index === 0;
          const isLast = index === trip.stops.length - 1;
          const dwell =
            toMinutes(stop.departure_time, stop.departure_day_offset) -
            toMinutes(stop.arrival_time, stop.arrival_day_offset);

          return (
            <li key={stop.stop_order} className="relative flex items-stretch gap-4">
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
                  aria-hidden
                  className={`relative z-10 my-auto rounded-full border-4 bg-brand-white ${
                    isFirst || isLast ? "h-6 w-6" : "h-5 w-5"
                  }`}
                  style={{ borderColor: line.color }}
                />
              </div>

              <Link
                href={`/stops/${stop.stop.id}`}
                className="group my-1 flex flex-1 items-center gap-4 rounded-lg py-3 pl-1 pr-2 transition hover:bg-brand-blue/5"
              >
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                  <span
                    className={`text-brand-black group-hover:text-brand-blue ${
                      isFirst || isLast ? "font-semibold" : "font-medium"
                    }`}
                  >
                    {stop.stop.name}
                  </span>
                  {dwell > 0 && !isFirst && !isLast && (
                    <span className="rounded-full bg-brand-green/30 px-2 py-0.5 text-xs font-medium text-brand-blue-dark">
                      stojí {dwell} min
                    </span>
                  )}
                </span>

                <span className="w-20 text-right text-sm text-brand-black/80 sm:w-24">
                  {isFirst ? (
                    <span className="text-brand-black/50">začátek</span>
                  ) : (
                    <TimeLabel time={stop.arrival_time} dayOffset={stop.arrival_day_offset} />
                  )}
                </span>
                <span className="w-20 text-right font-semibold text-brand-black sm:w-24">
                  {isLast ? (
                    <span className="text-sm font-normal text-brand-black/50">konec</span>
                  ) : (
                    <TimeLabel
                      time={stop.departure_time}
                      dayOffset={stop.departure_day_offset}
                    />
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      <p className="mt-6 text-xs text-brand-black/60">
        Časy jsou plánované podle jízdního řádu. Kliknutím na zastávku
        zobrazíte její detail.
      </p>
    </div>
  );
}
