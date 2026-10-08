import { db } from "@/lib/db";

export type Line = {
  id: number;
  number: string;
  name: string;
  type: string;
  color: string;
};

export type LineInput = Omit<Line, "id">;

export type TripStop = {
  id: number;
  name: string;
  position: number;
};

// Podle Swagger kontraktu (Lines.yaml) je "direction" textový název
// směru jízdy -- tady jméno konečné zastávky, kam jízda míří.
// Navíc přidáváme "direction_type" (outbound/inbound, jak je uloženo
// v databázi) a seznam zastávek jízdy v pořadí.
export type Trip = {
  id: number;
  direction: string;
  direction_type: "outbound" | "inbound";
  stops: TripStop[];
};

export type LineDetail = Line & { trips: Trip[] };

export function getAllLines(): Line[] {
  return db
    .prepare("SELECT id, number, name, type, color FROM lines ORDER BY id")
    .all() as Line[];
}

export function getLineById(id: number): Line | null {
  const row = db
    .prepare("SELECT id, number, name, type, color FROM lines WHERE id = ?")
    .get(id) as Line | undefined;
  return row ?? null;
}

export function getLineDetail(id: number): LineDetail | null {
  const line = getLineById(id);
  if (!line) return null;

  const routes = db
    .prepare("SELECT id, direction FROM routes WHERE line_id = ? ORDER BY id")
    .all(id) as { id: number; direction: "outbound" | "inbound" }[];

  const stopsStmt = db.prepare(
    `SELECT s.id AS id, s.name AS name, rs.position AS position
     FROM route_stops rs
     JOIN stops s ON s.id = rs.stop_id
     WHERE rs.route_id = ?
     ORDER BY rs.position`
  );

  const trips: Trip[] = routes.map((route) => {
    const stops = stopsStmt.all(route.id) as TripStop[];
    const lastStop = stops[stops.length - 1];

    return {
      id: route.id,
      direction: lastStop?.name ?? route.direction,
      direction_type: route.direction,
      stops,
    };
  });

  return { ...line, trips };
}

export function getLinesByStopId(stopId: number): Line[] {
  return db
    .prepare(
      `SELECT DISTINCT l.id AS id, l.number AS number, l.name AS name,
              l.type AS type, l.color AS color
       FROM lines l
       JOIN routes r ON r.line_id = l.id
       JOIN route_stops rs ON rs.route_id = r.id
       WHERE rs.stop_id = ?
       ORDER BY l.id`
    )
    .all(stopId) as Line[];
}

export function createLine(input: LineInput): Line {
  const result = db
    .prepare(
      "INSERT INTO lines (number, name, type, color) VALUES (@number, @name, @type, @color)"
    )
    .run(input);

  return getLineById(Number(result.lastInsertRowid))!;
}

export function updateLine(id: number, input: LineInput): Line | null {
  const result = db
    .prepare(
      `UPDATE lines SET number = @number, name = @name, type = @type, color = @color
       WHERE id = @id`
    )
    .run({ id, ...input });

  if (result.changes === 0) return null;
  return getLineById(id);
}

export function deleteLine(id: number): boolean {
  // Trasy a jejich zastávky se smažou kaskádou (cizí klíče).
  const result = db.prepare("DELETE FROM lines WHERE id = ?").run(id);
  return result.changes > 0;
}

// --- Validace vstupu podle Lines.yaml ---

const ALLOWED_LINE_INPUT_KEYS = new Set(["number", "name", "type", "color"]);
const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

// Vrátí ověřený LineInput, nebo null, pokud vstup neodpovídá
// specifikaci (chybějící/špatný typ pole, příliš dlouhý text, špatná
// barva, neznámé pole navíc včetně "id" -- to přiděluje jen server).
export function validateLineInput(body: unknown): LineInput | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null;
  }

  const record = body as Record<string, unknown>;

  for (const key of Object.keys(record)) {
    if (!ALLOWED_LINE_INPUT_KEYS.has(key)) return null;
  }

  const { number, name, type, color } = record;

  if (typeof number !== "string" || number.length < 1 || number.length > 20) {
    return null;
  }
  if (typeof name !== "string" || name.length < 1 || name.length > 255) {
    return null;
  }
  if (typeof type !== "string" || type.length < 1 || type.length > 50) {
    return null;
  }
  if (typeof color !== "string" || !COLOR_PATTERN.test(color)) {
    return null;
  }

  return { number, name, type, color };
}
