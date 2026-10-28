"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { TripDetail, TripStopTime } from "@/lib/timetables";
import LineBadge from "@/components/LineBadge";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; trip: TripDetail };

const GENERIC_ERROR = "Spoj se nepodařilo načíst. Zkuste to prosím znovu.";

// Čas s poznámkou, když už je po půlnoci (spoj vyjel předchozí den).
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

// Na zastávce, kde spoj chvíli stojí, ukážeme příjezd i odjezd.
// Kde je čas stejný, stačí jeden údaj -- „příjezd 8:10, odjezd 8:10“
// cestujícího jen mate.
function StopTimes({ stop, isFirst, isLast }: {
  stop: TripStopTime;
  isFirst: boolean;
  isLast: boolean;
}) {
  const waits =
    stop.arrival_time !== stop.departure_time ||
    stop.arrival_day_offset !== stop.departure_day_offset;

  if (isFirst) {
    return (
      <span className="font-semibold text-brand-black">
        odj. <TimeLabel time={stop.departure_time} dayOffset={stop.departure_day_offset} />
      </span>
    );
  }
  if (isLast) {
    return (
      <span className="font-semibold text-brand-black">
        příj. <TimeLabel time={stop.arrival_time} dayOffset={stop.arrival_day_offset} />
      </span>
    );
  }
  if (!waits) {
    return (
      <span className="font-semibold text-brand-black">
        <TimeLabel time={stop.departure_time} dayOffset={stop.departure_day_offset} />
      </span>
    );
  }
  return (
    <span className="flex flex-col items-end leading-tight">
      <span className="text-sm text-brand-black/70">
        příj. <TimeLabel time={stop.arrival_time} dayOffset={stop.arrival_day_offset} />
      </span>
      <span className="font-semibold text-brand-black">
        odj. <TimeLabel time={stop.departure_time} dayOffset={stop.departure_day_offset} />
      </span>
    </span>
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

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href={`/lines/${line.id}`}
        className="text-sm font-medium text-brand-blue hover:underline"
      >
        ← Linka {line.number} – {line.name}
      </Link>

      <div className="mt-4 flex items-center gap-4">
        <LineBadge number={line.number} color={line.color} size="lg" />
        <div>
          <h1 className="text-2xl font-semibold text-brand-blue-dark">
            Směr {trip.destination.name}
          </h1>
          <p className="mt-1 text-sm text-brand-black/70">
            Odjezd z {trip.origin.name} v{" "}
            <TimeLabel
              time={trip.departure_time}
              dayOffset={trip.departure_day_offset}
            />
          </p>
        </div>
      </div>

      <ol className="mt-8">
        {trip.stops.map((stop, index) => {
          const isFirst = index === 0;
          const isLast = index === trip.stops.length - 1;

          return (
            <li key={stop.stop_order} className="relative flex gap-4">
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
                className="group my-1 flex flex-1 items-center justify-between gap-4 rounded-lg px-3 py-3 transition hover:bg-brand-blue/5"
              >
                <span
                  className={`text-brand-black group-hover:text-brand-blue ${
                    isFirst || isLast ? "font-semibold" : "font-medium"
                  }`}
                >
                  {stop.stop.name}
                </span>
                <StopTimes stop={stop} isFirst={isFirst} isLast={isLast} />
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
