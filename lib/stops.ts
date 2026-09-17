import { db } from "@/lib/db";

export type Stop = {
  id: number;
  name: string;
  image_url: string | null;
  is_transfer: boolean;
  x: number;
  y: number;
  wheelchair_accessible: boolean;
  has_shelter: boolean;
  has_bench: boolean;
  has_ticket_machine: boolean;
  has_display: boolean;
};

type StopRow = {
  id: number;
  name: string;
  image_url: string | null;
  is_transfer: number;
  x: number;
  y: number;
  wheelchair_accessible: number;
  has_shelter: number;
  has_bench: number;
  has_ticket_machine: number;
  has_display: number;
};

function mapRow(row: StopRow): Stop {
  return {
    id: row.id,
    name: row.name,
    image_url: row.image_url,
    is_transfer: Boolean(row.is_transfer),
    x: row.x,
    y: row.y,
    wheelchair_accessible: Boolean(row.wheelchair_accessible),
    has_shelter: Boolean(row.has_shelter),
    has_bench: Boolean(row.has_bench),
    has_ticket_machine: Boolean(row.has_ticket_machine),
    has_display: Boolean(row.has_display),
  };
}

export function getAllStops(): Stop[] {
  const rows = db
    .prepare("SELECT * FROM stops ORDER BY name")
    .all() as StopRow[];
  return rows.map(mapRow);
}

export function getStopById(id: number): Stop | null {
  const row = db
    .prepare("SELECT * FROM stops WHERE id = ?")
    .get(id) as StopRow | undefined;
  return row ? mapRow(row) : null;
}

// --- REST API podůra (API zastávek) ---
// API vystavuje jen podmnožinu sloupců podle závazného kontraktu
// (stops-happy-path.yaml). Ostatní sloupce (is_transfer, x, y,
// has_bench, has_display) zůstávají při API opereacích nezměněné.

export type StopInput = {
  name: string;
  image_url: string | null;
  wheelchair_accessible: boolean;
  has_shelter: boolean;
  has_ticket_machine: boolean;
};

export type ApiStop = {
  id: number;
  name: string;
  image_url: string | null;
  wheelchair_accessible: boolean;
  has_shelter: boolean;
  has_ticket_machine: boolean;
};

export function toApiStop(stop: Stop): ApiStop {
  return {
    id: stop.id,
    name: stop.name,
    image_url: stop.image_url,
    wheelchair_accessible: stop.wheelchair_accessible,
    has_shelter: stop.has_shelter,
    has_ticket_machine: stop.has_ticket_machine,
  };
}

export function createStop(input: StopInput): Stop {
  const result = db
    .prepare(
      `INSERT INTO stops (
        name, image_url, is_transfer, x, y,
        wheelchair_accessible, has_shelter, has_bench,
        has_ticket_machine, has_display
      ) VALUES (
        @name, @image_url, 0, 0, 0,
        @wheelchair_accessible, @has_shelter, 0,
        @has_ticket_machine, 0
      )`
    )
    .run({
      name: input.name,
      image_url: input.image_url,
      wheelchair_accessible: input.wheelchair_accessible ? 1 : 0,
      has_shelter: input.has_shelter ? 1 : 0,
      has_ticket_machine: input.has_ticket_machine ? 1 : 0,
    });

  return getStopById(Number(result.lastInsertRowid))!;
}

export function updateStop(id: number, input: StopInput): Stop | null {
  const existing = getStopById(id);
  if (!existing) return null;

  db.prepare(
    `UPDATE stops SET
      name = @name,
      image_url = @image_url,
      wheelchair_accessible = @wheelchair_accessible,
      has_shelter = @has_shelter,
      has_ticket_machine = @has_ticket_machine
    WHERE id = @id`
  ).run({
    id,
    name: input.name,
    image_url: input.image_url,
    wheelchair_accessible: input.wheelchair_accessible ? 1 : 0,
    has_shelter: input.has_shelter ? 1 : 0,
    has_ticket_machine: input.has_ticket_machine ? 1 : 0,
  });

  return getStopById(id);
}

export function deleteStop(id: number): boolean {
  const result = db.prepare("DELETE FROM stops WHERE id = ?").run(id);
  return result.changes > 0;
}
