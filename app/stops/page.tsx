import Link from "next/link";
import Image from "next/image";
import { getAllStops } from "@/lib/stops";

export const dynamic = "force-dynamic";

export default function StopsPage() {
  const stops = getAllStops();

  if (stops.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-2xl font-semibold text-brand-blue-dark">
          Zastávky
        </h1>
        <p className="mt-4 text-brand-black/70">
          Momentálně nejsou v systému evidované žádné zastávky.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-brand-blue-dark">
        Zastávky
      </h1>

      <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
        {stops.map((stop) => (
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
    </div>
  );
}
