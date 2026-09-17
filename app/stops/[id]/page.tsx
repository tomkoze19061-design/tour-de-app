"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import type { ApiStop } from "@/lib/stops";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; stop: ApiStop };

export default function StopDetailPage() {
  const params = useParams<{ id: string }>();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/v1/stops/${params.id}`);

        if (res.status === 404) {
          if (!cancelled) {
            setState({ status: "error", message: "Zastávka nebyla nalezena." });
          }
          return;
        }

        if (!res.ok) {
          if (!cancelled) {
            setState({
              status: "error",
              message: "Zastávku se nepodařilo načíst. Zkuste to prosím znovu.",
            });
          }
          return;
        }

        const stop = (await res.json()) as ApiStop;
        if (!cancelled) {
          setState({ status: "ok", stop });
        }
      } catch {
        if (!cancelled) {
          setState({
            status: "error",
            message: "Zastávku se nepodařilo načíst. Zkuste to prosím znovu.",
          });
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
        <p className="text-brand-black/70">Načítám zastávku…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-semibold text-brand-blue-dark">
          Zastávka
        </h1>
        <p className="mt-4 text-brand-black/70">{state.message}</p>
      </div>
    );
  }

  const { stop } = state;

  const features: { label: string; active: boolean }[] = [
    { label: "Bezbariérový přístup", active: stop.wheelchair_accessible },
    { label: "Přístřešek", active: stop.has_shelter },
    { label: "Automat na jízdenky", active: stop.has_ticket_machine },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-brand-blue-dark">
        {stop.name}
      </h1>

      {stop.image_url && (
        <div className="relative mt-6 h-64 w-full overflow-hidden rounded-xl bg-brand-blue/5">
          <Image
            src={stop.image_url}
            alt={stop.name}
            fill
            className="object-cover"
            sizes="100vw"
          />
        </div>
      )}

      <ul className="mt-6 flex flex-wrap gap-2">
        {features.map((feature) => (
          <li
            key={feature.label}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${
              feature.active
                ? "bg-brand-green/30 text-brand-blue-dark"
                : "bg-brand-black/5 text-brand-black/50"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                feature.active ? "bg-brand-teal-2" : "bg-brand-black/30"
              }`}
              aria-hidden
            />
            {feature.label}: {feature.active ? "ano" : "ne"}
          </li>
        ))}
      </ul>
    </div>
  );
}
