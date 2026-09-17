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
