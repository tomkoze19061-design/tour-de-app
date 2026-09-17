// Tahle stránka volá vlastní API endpoint, takže její obsah
// se musí generovat vždy znovu při každém požadavku (ne jednou
// dopředu při "npm run build"). Proto "force-dynamic" -- jinak
// by build appky selhal, protože při buildu server ještě neběží.
export const dynamic = "force-dynamic";

async function getHealth() {
  const port = process.env.PORT ?? 3000;
  const res = await fetch(`http://127.0.0.1:${port}/api/v1/health`, {
    cache: "no-store",
  });
  return res.json();
}

export default async function Home() {
  const data = await getHealth();

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-brand-blue-dark">
        Think different Academy
      </h1>
      <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-green/30 px-4 py-1.5 text-sm font-medium text-brand-blue-dark">
        <span className="h-2 w-2 rounded-full bg-brand-teal-2" aria-hidden />
        Status: {data.status.toUpperCase()}
      </p>
    </div>
  );
}
