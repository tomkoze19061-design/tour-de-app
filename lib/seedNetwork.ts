import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";

type NetworkLine = {
  number: string;
  name: string;
  type: string;
  color: string;
  stops: string[];
};

// Načte dopravní síť ze zdrojového souboru public/data/network.json
// (linky + pořadí zastávek podle dodané mapy) do databáze.
// Volá se při každém startu appky -- pokud už linky v databázi jsou,
// nic se nemění. Každá linka dostane dvě trasy: outbound (z výchozí
// zastávky) a inbound (stejné zastávky v opačném pořadí).
export function seedNetwork(db: Database.Database) {
  const linesCount = (
    db.prepare("SELECT COUNT(*) as count FROM lines").get() as {
      count: number;
    }
  ).count;

  if (linesCount > 0) return;

  const filePath = path.join(process.cwd(), "public", "data", "network.json");
  const { lines } = JSON.parse(fs.readFileSync(filePath, "utf-8")) as {
    lines: NetworkLine[];
  };

  const stopRows = db.prepare("SELECT id, name FROM stops").all() as {
    id: number;
    name: string;
  }[];
  const stopIdByName = new Map(
    stopRows.map((s) => [s.name.trim().toLowerCase(), s.id])
  );

  const insertLine = db.prepare(
    "INSERT INTO lines (number, name, type, color) VALUES (?, ?, ?, ?)"
  );
  const insertRoute = db.prepare(
    "INSERT INTO routes (line_id, direction) VALUES (?, ?)"
  );
  const insertRouteStop = db.prepare(
    "INSERT INTO route_stops (route_id, stop_id, position) VALUES (?, ?, ?)"
  );

  const seed = db.transaction(() => {
    for (const line of lines) {
      const stopIds = line.stops.map((name) => {
        const id = stopIdByName.get(name.trim().toLowerCase());
        if (id === undefined) {
          throw new Error(
            `Seed sítě: zastávka "${name}" z linky ${line.number} není v databázi.`
          );
        }
        return id;
      });

      const lineId = Number(
        insertLine.run(line.number, line.name, line.type, line.color)
          .lastInsertRowid
      );

      const directions: ["outbound" | "inbound", number[]][] = [
        ["outbound", stopIds],
        ["inbound", [...stopIds].reverse()],
      ];

      for (const [direction, ids] of directions) {
        const routeId = Number(
          insertRoute.run(lineId, direction).lastInsertRowid
        );
        ids.forEach((stopId, index) => {
          insertRouteStop.run(routeId, stopId, index + 1);
        });
      }
    }
  });

  seed();
}
