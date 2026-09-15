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
    <div>
      <h1>Think different Academy</h1>
      <p>Status: {data.status.toUpperCase()}</p>
    </div>
  );
}
