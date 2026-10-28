import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import { parseSourceTime } from "@/lib/time";

// Zdrojová data jsou uložená v projektu beze změny tak, jak je dodali
// organizátoři (public/data/trips.json a public/data/stop_times.json),
// takže spoje i jízdní řády jde kdykoliv znovu vytvořit.

type SourceTrip = {
  id: number;
  source_trip_id: string;
  line_ref: string;
  route_ref: string;
  service_ref: string;
  direction_id: 0 | 1;
  headsign: string;
  block_ref: string;
  wheelchair_accessible: boolean;
};

type SourceStopTime = {
  trip_id: number;
  route_ref: string;
  stop_sequence: number;
  stop_name: string;
  arrival_time: string;
  departure_time: string;
};

type RouteInfo = {
  id: number;
  direction: "outbound" | "inbound";
  // názvy zastávek v pořadí trasy (malými písmeny pro porovnání)
  stopNames: string[];
  // pozice na trase -> id záznamu v route_stops
  routeStopIdByPosition: Map<number, number>;
};

function readJson<T>(fileName: string): T {
  const filePath = path.join(process.cwd(), "public", "data", fileName);
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

const normalize = (name: string) => name.trim().toLowerCase();

// Načte spoje a jejich jízdní řády do databáze. Volá se při každém
// startu appky (viz db.ts); pokud už spoje v databázi jsou, nic se
// nemění. Kontrola i vkládání běží v jedné IMMEDIATE transakci
// (viz seedStops.ts), aby paralelní procesy nevložily data dvakrát.
//
// Zdrojová data na naši síť napojujeme přes pořadí zastávek: každou
// zdrojovou trasu (route_ref) přiřadíme k trase v databázi se stejnými
// zastávkami ve stejném pořadí. Když něco nesedí (jiné pořadí, jiný
// směr, chybějící zastávka, časy jdou pozpátku), seed skončí chybou --
// raději nespustit aplikaci než do ní tiše nahrát špatná data.
export function seedTimetables(db: Database.Database) {
  const { trips } = readJson<{ trips: SourceTrip[] }>("trips.json");
  const { stop_times: stopTimes } = readJson<{
    stop_times: SourceStopTime[];
  }>("stop_times.json");

  const seed = db.transaction(() => {
    const tripsCount = (
      db.prepare("SELECT COUNT(*) AS count FROM trips").get() as {
        count: number;
      }
    ).count;
    if (tripsCount > 0) return;

    // --- Trasy v naší databázi ---
    const routeRows = db
      .prepare("SELECT id, direction FROM routes ORDER BY id")
      .all() as { id: number; direction: "outbound" | "inbound" }[];
    const routeStopsStmt = db.prepare(
      `SELECT rs.id AS id, rs.position AS position, s.name AS name
       FROM route_stops rs
       JOIN stops s ON s.id = rs.stop_id
       WHERE rs.route_id = ?
       ORDER BY rs.position`
    );
    const routes: RouteInfo[] = routeRows.map((route) => {
      const rows = routeStopsStmt.all(route.id) as {
        id: number;
        position: number;
        name: string;
      }[];
      return {
        id: route.id,
        direction: route.direction,
        stopNames: rows.map((r) => normalize(r.name)),
        routeStopIdByPosition: new Map(rows.map((r) => [r.position, r.id])),
      };
    });

    // --- Zdrojové trasy: pořadí zastávek podle stop_sequence ---
    const timesByTrip = new Map<number, SourceStopTime[]>();
    for (const st of stopTimes) {
      const list = timesByTrip.get(st.trip_id) ?? [];
      list.push(st);
      timesByTrip.set(st.trip_id, list);
    }
    for (const list of timesByTrip.values()) {
      list.sort((a, b) => a.stop_sequence - b.stop_sequence);
    }

    const sourceRouteStops = new Map<string, string[]>();
    for (const trip of trips) {
      const list = timesByTrip.get(trip.id);
      if (!list || list.length === 0) {
        throw new Error(`Seed jízdních řádů: spoj ${trip.id} nemá jízdní řád.`);
      }
      const names = list.map((st) => normalize(st.stop_name));
      const known = sourceRouteStops.get(trip.route_ref);
      if (!known) {
        sourceRouteStops.set(trip.route_ref, names);
      } else if (known.join("|") !== names.join("|")) {
        throw new Error(
          `Seed jízdních řádů: spoje trasy ${trip.route_ref} mají různé pořadí zastávek.`
        );
      }
    }

    // --- Přiřazení zdrojových tras k trasám v databázi ---
    const routeByRef = new Map<string, RouteInfo>();
    for (const [ref, names] of sourceRouteStops) {
      const match = routes.find(
        (r) => r.stopNames.join("|") === names.join("|")
      );
      if (!match) {
        throw new Error(
          `Seed jízdních řádů: trasa ${ref} (${names.join(" → ")}) neodpovídá žádné trase v síti.`
        );
      }
      routeByRef.set(ref, match);
    }

    const insertTrip = db.prepare(
      `INSERT INTO trips (id, route_id, source_trip_id, service_ref, block_ref, wheelchair_accessible)
       VALUES (@id, @route_id, @source_trip_id, @service_ref, @block_ref, @wheelchair_accessible)`
    );
    const insertStopTime = db.prepare(
      `INSERT INTO stop_times (trip_id, route_id, route_stop_id, arrival_minutes, departure_minutes)
       VALUES (?, ?, ?, ?, ?)`
    );

    for (const trip of trips) {
      const route = routeByRef.get(trip.route_ref)!;

      const expectedDirection = trip.direction_id === 0 ? "outbound" : "inbound";
      if (route.direction !== expectedDirection) {
        throw new Error(
          `Seed jízdních řádů: spoj ${trip.id} jede ve směru ${expectedDirection}, ale odpovídající trasa je ${route.direction}.`
        );
      }

      const lastStop = route.stopNames[route.stopNames.length - 1];
      if (normalize(trip.headsign) !== lastStop) {
        throw new Error(
          `Seed jízdních řádů: spoj ${trip.id} má cíl „${trip.headsign}“, ale trasa končí jinde.`
        );
      }

      insertTrip.run({
        id: trip.id,
        route_id: route.id,
        source_trip_id: trip.source_trip_id,
        service_ref: trip.service_ref,
        block_ref: trip.block_ref,
        wheelchair_accessible: trip.wheelchair_accessible ? 1 : 0,
      });

      let previousDeparture = -1;
      for (const st of timesByTrip.get(trip.id)!) {
        // Pořadí bereme z trasy: stop_sequence ze zdroje musí sedět
        // s pozicí zastávky na trase, jinak by spoj měl vlastní pořadí.
        const routeStopId = route.routeStopIdByPosition.get(st.stop_sequence);
        if (
          routeStopId === undefined ||
          route.stopNames[st.stop_sequence - 1] !== normalize(st.stop_name)
        ) {
          throw new Error(
            `Seed jízdních řádů: zastávka „${st.stop_name}“ spoje ${trip.id} není na ${st.stop_sequence}. místě jeho trasy.`
          );
        }

        const arrival = parseSourceTime(st.arrival_time);
        const departure = parseSourceTime(st.departure_time);
        if (arrival === null || departure === null) {
          throw new Error(
            `Seed jízdních řádů: neplatný čas u spoje ${trip.id}, zastávka „${st.stop_name}“.`
          );
        }
        if (arrival < previousDeparture) {
          throw new Error(
            `Seed jízdních řádů: spoj ${trip.id} přijíždí na „${st.stop_name}“ dřív, než odjel z předchozí zastávky.`
          );
        }
        // Příjezd po odjezdu odmítne i databáze (CHECK v migraci).
        insertStopTime.run(trip.id, route.id, routeStopId, arrival, departure);
        previousDeparture = departure;
      }
    }
  });

  seed.immediate();
}
