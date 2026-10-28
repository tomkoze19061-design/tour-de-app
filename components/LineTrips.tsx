import Link from "next/link";
import type { Direction, TripSummary } from "@/lib/timetables";

type Props = {
  // null = ještě se načítá, "error" = API selhalo
  trips: TripSummary[] | null | "error";
  direction: Direction;
  directionLabel: string;
  lineColor: string;
};

// Seznam spojů jednoho směru linky. Ukazujeme jen spoje vybraného
// směru -- cestujícího zajímá jen to, co jede jeho směrem.
export default function LineTrips({
  trips,
  direction,
  directionLabel,
  lineColor,
}: Props) {
  return (
    <section className="mt-12" aria-labelledby="line-trips-heading">
      <h2
        id="line-trips-heading"
        className="text-lg font-semibold text-brand-blue-dark"
      >
        Spoje ve směru {directionLabel}
      </h2>

      {trips === null && (
        <p className="mt-3 text-sm text-brand-black/60">Načítám spoje…</p>
      )}

      {trips === "error" && (
        <p className="mt-3 text-sm text-brand-black/70">
          Spoje se nepodařilo načíst. Zkuste to prosím znovu.
        </p>
      )}

      {Array.isArray(trips) && <TripRows trips={trips} direction={direction} lineColor={lineColor} />}
    </section>
  );
}

function TripRows({
  trips,
  direction,
  lineColor,
}: {
  trips: TripSummary[];
  direction: Direction;
  lineColor: string;
}) {
  const inDirection = trips.filter((t) => t.direction === direction);

  if (inDirection.length === 0) {
    return (
      <p className="mt-3 text-sm text-brand-black/70">
        V tomto směru nejede žádný spoj.
      </p>
    );
  }

  return (
    <ul className="mt-4 divide-y divide-brand-blue/10 overflow-hidden rounded-xl border border-brand-blue/15">
      {inDirection.map((trip) => (
        <li key={trip.id}>
          <Link
            href={`/trips/${trip.id}`}
            className="group flex items-center gap-4 px-4 py-3 transition hover:bg-brand-blue/5"
          >
            <span
              aria-hidden
              className="h-8 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: lineColor }}
            />
            <span className="w-14 shrink-0 text-lg font-semibold tabular-nums text-brand-black">
              {trip.departure_time}
            </span>
            <span className="min-w-0 flex-1 text-sm text-brand-black/80">
              z {trip.origin.name} <span aria-hidden>→</span>
              <span className="sr-only">do</span> {trip.destination.name}
              {trip.departure_day_offset > 0 && (
                <span className="ml-2 text-xs text-brand-black/60">
                  (následující den)
                </span>
              )}
            </span>
            <span className="shrink-0 text-sm font-medium text-brand-blue group-hover:underline">
              Detail spoje →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
