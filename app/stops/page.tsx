"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { ApiStop } from "@/lib/stops";
import { useStopLines } from "@/lib/useStopLines";
import LineLinks from "@/components/LineLinks";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ok"; stops: ApiStop[] };

export default function StopsPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [query, setQuery] = useState("");
  const { linesByStop } = useStopLines();

  useEffect(() => {
    let cancelled = false;

    fetch("/api/v1/stops")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((stops: ApiStop[]) => {
        if (!cancelled) setState({ status: "ok", stops });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stops = state.status === "ok" ? state.stops : [];

  const filteredStops = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stops;

    // Když dotaz přesně odpovídá označení některé linky (např. "b"),
    // uživatel nejspíš hledá zastávky té linky -- ukážeme jen je,
    // a ne všechny zastávky, které mají v názvu písmeno "b".
    const lineNumbers = new Set(
      [...linesByStop.values()].flat().map((l) => l.number.toLowerCase())
    );
    if (lineNumbers.has(q)) {
      return stops.filter((stop) =>
        (linesByStop.get(stop.id) ?? []).some(
          (l) => l.number.toLowerCase() === q
        )
      );
    }

    return stops.filter((stop) => {
      // Jinak hledáme v názvu, vlastnostech i názvech linek
      // (např. "yellow" nebo "linka b").
      const lines = linesByStop.get(stop.id) ?? [];

      const haystack = [
        stop.name,
        stop.wheelchair_accessible ? "bezbariérová bezbariérový přístup" : "",
        stop.has_shelter ? "přístřešek" : "",
        stop.has_ticket_machine ? "automat jízdenky" : "",
        ...lines.map((l) => `linka ${l.number} ${l.name}`),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [stops, query, linesByStop]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-brand-blue-dark">
        Zastávky
      </h1>

      {state.status === "loading" && (
        <p className="mt-4 text-brand-black/70">Načítám zastávky…</p>
      )}

      {state.status === "error" && (
        <p className="mt-4 text-brand-black/70">
          Zastávky se nepodařilo načíst. Zkuste to prosím znovu.
        </p>
      )}

      {state.status === "ok" && (
        <>
          <div className="mt-6 flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Hledat podle názvu, vlastností nebo linky…"
              aria-label="Hledat zastávky"
              className="w-full max-w-sm rounded-lg border border-brand-blue/20 px-4 py-2 text-brand-black outline-none focus:border-brand-blue"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="rounded-lg border border-brand-blue/20 px-4 py-2 text-sm text-brand-blue-dark hover:bg-brand-blue/5"
              >
                Zrušit
              </button>
            )}
          </div>

          {stops.length === 0 ? (
            <p className="mt-8 text-brand-black/70">
              Momentálně nejsou v systému evidované žádné zastávky.
            </p>
          ) : filteredStops.length === 0 ? (
            <p className="mt-8 text-brand-black/70">
              Žádná zastávka neodpovídá hledanému dotazu „{query}“.
            </p>
          ) : (
            <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
              {filteredStops.map((stop) => {
                const lines = linesByStop.get(stop.id) ?? [];

                // Karta není jeden velký odkaz: odkazy na linky by pak
                // byly odkazem uvnitř odkazu, což HTML nedovoluje.
                // Na detail zastávky vede obrázek a název, na linky odznaky.
                return (
                  <li
                    key={stop.id}
                    className="group flex flex-col overflow-hidden rounded-xl border border-brand-blue/15 transition hover:border-brand-blue/40 hover:shadow-md"
                  >
                    <Link
                      href={`/stops/${stop.id}`}
                      tabIndex={-1}
                      aria-hidden
                      className="relative block h-40 w-full bg-brand-blue/5"
                    >
                      {stop.image_url && (
                        <Image
                          src={stop.image_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      )}
                    </Link>
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <Link
                        href={`/stops/${stop.id}`}
                        className="font-medium text-brand-black hover:text-brand-blue"
                      >
                        {stop.name}
                      </Link>
                      <LineLinks lines={lines} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
