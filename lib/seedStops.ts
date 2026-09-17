import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";

// Zastávky se jmenují např. "Turing Terminal" -- jejich obrázek
// najdeme podle stejně vytvořeného slugu: "turing-terminal.png".
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// stops.csv je jednoduchý soubor bez uvozovek ani čárek uvnitř
// hodnot, takže stačí rozdělit řádky podle čárky.
function parseCsv(content: string): Record<string, string>[] {
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = (values[i] ?? "").trim();
    });
    return row;
  });
}

const toBool = (value: string) => (value === "true" ? 1 : 0);

// Naplní tabulku stops daty ze zdrojového souboru public/data/stops.csv.
// Volá se při každém startu appky (viz db.ts) -- pokud tabulka
// už data obsahuje, nic se nemění.
export function seedStops(db: Database.Database) {
  const stopsCount = (
    db.prepare("SELECT COUNT(*) as count FROM stops").get() as {
      count: number;
    }
  ).count;

  if (stopsCount > 0) return;

  const csvPath = path.join(process.cwd(), "public", "data", "stops.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const rows = parseCsv(csvContent);

  const insert = db.prepare(`
    INSERT INTO stops (
      id, name, image_url, is_transfer, x, y,
      wheelchair_accessible, has_shelter, has_bench,
      has_ticket_machine, has_display
    ) VALUES (@id, @name, @image_url, @is_transfer, @x, @y,
      @wheelchair_accessible, @has_shelter, @has_bench,
      @has_ticket_machine, @has_display)
  `);

  const insertMany = db.transaction((rows: Record<string, string>[]) => {
    for (const row of rows) {
      insert.run({
        id: Number(row.id),
        name: row.name,
        image_url: `/images/stops/${slugify(row.name)}.png`,
        is_transfer: toBool(row.is_transfer),
        x: Number(row.x),
        y: Number(row.y),
        wheelchair_accessible: toBool(row.wheelchair_accessible),
        has_shelter: toBool(row.has_shelter),
        has_bench: toBool(row.has_bench),
        has_ticket_machine: toBool(row.has_ticket_machine),
        has_display: toBool(row.has_display),
      });
    }
  });

  insertMany(rows);
}
