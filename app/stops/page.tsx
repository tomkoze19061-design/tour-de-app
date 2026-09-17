"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { ApiStop } from "@/lib/stops";

export default function StopsPage() {
  const [stops, setStops] = useState<ApiStop[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/v1/stops")
      .then((res) => res.json())
      .then((data: ApiStop[]) => setStops(data));
  }, []);

  const filteredStops = useMemo(() => {
    if (!stops) return [];
    const q = query.trim().toLowerCase();
    if (!q) return stops;

    return stops.filter((stop) => {
      const haystack = [
        stop.name,
        stop.wheelchair_accessible ? "bezbariérová bezbariérový přístup" : "",
        stop.has_shelter ? "přístřešek" : "",
        stop.has_ticket_machine ? "automat jízdenky" : "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [stops, query]);

  if (stops === null) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-2xl font-semibold text-brand-blue-dark">
          Zastávky
        </h1>
        <p className="mt-4 text-brand-black/70">Načítám zastávky…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-brand-blue-dark">
        Zastávky
      </h1>

      <div className="mt-6 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Hledat podle názvu nebo vlastností…"
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
          {filteredStops.map((stop) => (
            <li key={stop.id}>
              <Link
                href={`/stops/${stop.id}`}
                className="group block overflow-hidden rounded-xl border border-brand-blue/15 transition hover:border-brand-blue/40 hover:shadow-md"
              >
                <div className="relative h-40 w-full bg-brand-blue/5">
                  {stop.image_url && (
                    <Image
                      src={stop.image_url}
                      alt={stop.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  )}
                </div>
                <div className="p-4">
                  <p className="font-medium text-brand-black group-hover:text-brand-blue">
                    {stop.name}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
