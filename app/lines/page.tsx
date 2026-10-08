"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Line, LineDetail } from "@/lib/lines";
import LineBadge from "@/components/LineBadge";
import { lineTypeLabel } from "@/lib/lineDisplay";

// Ke každé lince si navíc načteme detail, abychom cestujícímu ukázali
// i to nejdůležitější: odkud kam jede a kolik má zastávek.
// Když se detail nepodaří načíst, zobrazíme aspoň základní údaje.
type LineRow = Line & {
  from: string | null;
  to: string | null;
  stopCount: number | null;
};

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ok"; lines: LineRow[] };

async function loadLines(): Promise<LineRow[]> {
  const res = await fetch("/api/v1/lines");
  if (!res.ok) throw new Error("Nepodařilo se načíst linky");
  const lines = (await res.json()) as Line[];

  return Promise.all(
    lines.map(async (line): Promise<LineRow> => {
      try {
        const detailRes = await fetch(`/api/v1/lines/${line.id}`);
        if (!detailRes.ok) throw new Error();
        const detail = (await detailRes.json()) as LineDetail;

        const outbound =
          detail.trips.find((t) => t.direction_type === "outbound") ??
          detail.trips[0];
        const stops = outbound?.stops ?? [];

        return {
          ...line,
          from: stops[0]?.name ?? null,
          to: stops[stops.length - 1]?.name ?? null,
          stopCount: stops.length || null,
        };
      } catch {
        return { ...line, from: null, to: null, stopCount: null };
      }
    })
  );
}

export default function LinesPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    loadLines()
      .then((lines) => {
        if (!cancelled) setState({ status: "ok", lines });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-brand-blue-dark">Linky</h1>
      <p className="mt-2 text-brand-black/70">
        Přehled všech linek, které jezdí po kampusu Think different Academy.
      </p>

      {state.status === "loading" && (
        <p className="mt-8 text-brand-black/70">Načítám linky…</p>
      )}

      {state.status === "error" && (
        <p className="mt-8 text-brand-black/70">
          Linky se nepodařilo načíst. Zkuste to prosím znovu.
        </p>
      )}

      {state.status === "ok" && state.lines.length === 0 && (
        <p className="mt-8 text-brand-black/70">
          Momentálně nejsou v systému evidované žádné linky.
        </p>
      )}

      {state.status === "ok" && state.lines.length > 0 && (
        <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {state.lines.map((line) => (
            <li key={line.id}>
              <Link
                href={`/lines/${line.id}`}
                className="group flex h-full gap-4 overflow-hidden rounded-xl border border-brand-blue/15 p-4 transition hover:border-brand-blue/40 hover:shadow-md"
                style={{ borderLeft: `6px solid ${line.color}` }}
              >
              <LineBadge number={line.number} color={line.color} />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 className="text-lg font-semibold text-brand-black group-hover:text-brand-blue">
                    {line.name}
                  </h2>
                  <span className="rounded-full bg-brand-blue/10 px-3 py-0.5 text-xs font-medium text-brand-blue-dark">
                    {lineTypeLabel(line.type)}
                  </span>
                </div>

                {line.from && line.to && (
                  <p className="mt-1 text-sm text-brand-black/80">
                    {line.from} <span aria-hidden>↔</span>
                    <span className="sr-only">až</span> {line.to}
                  </p>
                )}

                {line.stopCount !== null && (
                  <p className="mt-0.5 text-xs text-brand-black/60">
                    {line.stopCount}{" "}
                    {line.stopCount === 1
                      ? "zastávka"
                      : line.stopCount < 5
                        ? "zastávky"
                        : "zastávek"}
                  </p>
                )}
              </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
