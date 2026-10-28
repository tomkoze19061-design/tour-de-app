// Práce s časy jízdních řádů.
//
// V databázi je čas uložen jako počet minut od začátku provozního dne,
// ve kterém spoj vyjel. Hodnota může být i 1440 a víc -- to jsou časy
// po půlnoci téhož spoje (zdrojová data je píší jako 24:00–47:59).
// Tento soubor neimportuje databázi, lze ho použít i ve frontendu.

const MINUTES_PER_DAY = 24 * 60;

// Převede čas ze zdrojových dat ("07:05", "24:14") na minuty.
// Vrátí null pro neplatný formát.
export function parseSourceTime(value: string): number | null {
  const match = /^(\d{2}):([0-5]\d)$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  if (hours > 47) return null;
  return hours * 60 + Number(match[2]);
}

// Ověří parametr service_date (den provozu ve formátu YYYY-MM-DD).
// Vrátí true, pokud parametr chybí nebo je to skutečné datum;
// false pro nesmysly jako "2026-13-45" nebo "abc".
export function isValidServiceDate(value: string | null): boolean {
  if (value === null) return true;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// Minuty provozního dne -> čas ve formátu HH:MM a počet dní navíc
// (podle API kontraktu: odjezd v 0:14 po výjezdu ve 23:52 má
// day_offset 1).
export function toApiTime(minutes: number): { time: string; dayOffset: number } {
  const dayOffset = Math.floor(minutes / MINUTES_PER_DAY);
  const inDay = minutes - dayOffset * MINUTES_PER_DAY;
  const hh = String(Math.floor(inDay / 60)).padStart(2, "0");
  const mm = String(inDay % 60).padStart(2, "0");
  return { time: `${hh}:${mm}`, dayOffset };
}
