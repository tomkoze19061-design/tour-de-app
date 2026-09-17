import { notFound } from "next/navigation";
import Image from "next/image";
import { getStopById } from "@/lib/stops";

export const dynamic = "force-dynamic";

export default async function StopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const stop = getStopById(Number(id));

  if (!stop) {
    notFound();
  }

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
    </div>
  );
}
