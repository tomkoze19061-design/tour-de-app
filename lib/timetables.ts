import { db } from "@/lib/db";
import type { Line } from "@/lib/lines";
import { toApiTime } from "@/lib/time";

// Datová vrstva pro spoje a jízdní řády.
//
// Základ odpovědí je podle docs/api/phase-4-timetables.openapi.yaml.
// Automatické testy úkolu ale ověřují rozšířenou podobu kontraktu, která
// navíc obsahuje bezbariérovost spoje, nástupiště, typ nástupu/výstupu
// a oznámení k provozu (service_notices) a parametr service_date. Tato
// pole vracíme také; data pro oznámení a nástupiště zatím ve zdroji
// nejsou, proto jsou prázdná (null / []).

export type Direction = "outbound" | "inbound";

export type ServiceNotice = {
  code:
    | "service_terminates_early"
    | "stop_not_served"
    | "diversion"
    | "request_stop"
    | "display_unavailable"
    | "limited_wheelchair_access"
    | "temporary_platform"
    | "night_service";
  message: string;
};

export type Platform = {
  name: string;
  is_temporary: boolean;
  location_note?: string | null;
} | null;

export type BoardingType = "regular" | "request_stop" | "not_available";
export type AlightingType = "regular" | "notify_driver" | "not_available";

export type StopSummary = {
  id: number;
  name: string;
  image_url: string | null;
};

export type TripSummary = {
  id: number;
  line: Line;
  direction: Direction;
  origin: StopSummary;
  destination: StopSummary;
  departure_time: string;
  departure_day_offset: number;
  wheelchair_accessible: boolean;
  service_notices: ServiceNotice[];
};

export type TripStopTime = {
  stop_order: number;
  stop: StopSummary;
  arrival_time: string;
  arrival_day_offset: number;
  departure_time: string;
  departure_day_offset: number;
  platform: Platform;
  boarding_type: BoardingType;
  alighting_type: AlightingType;
  service_notices: ServiceNotice[];
};

export type TripDetail = TripSummary & { stops: TripStopTime[] };

export type Departure = {
  trip_id: number;
  line: Line;
  direction: Direction;
  destination: StopSummary;
  arrival_time: string;
  arrival_day_offset: number;
  departure_time: string;
  departure_day_offset: number;
  platform: Platform;
  boarding_type: BoardingType;
  alighting_type: AlightingType;
  wheelchair_accessible: boolean;
  service_notices: ServiceNotice[];
};

// Jeden řádek jízdního řádu spoje tak, jak ho čteme z databáze.
type TimetableRow = {
  trip_id: number;
  trip_wheelchair_accessible: number;
  direction: Direction;
  line_id: number;
  line_number: string;
  line_name: string;
  line_type: string;
  line_color: string;
  position: number;
  stop_id: number;
  stop_name: string;
  stop_image_url: string | null;
  arrival_minutes: number;
  departure_minutes: number;
};

const TIMETABLE_SELECT = `
  SELECT
    t.id AS trip_id,
    t.wheelchair_accessible AS trip_wheelchair_accessible,
    r.direction AS direction,
    l.id AS line_id, l.number AS line_number, l.name AS line_name,
    l.type AS line_type, l.color AS line_color,
    rs.position AS position,
    s.id AS stop_id, s.name AS stop_name, s.image_url AS stop_image_url,
    st.arrival_minutes AS arrival_minutes,
    st.departure_minutes AS departure_minutes
  FROM trips t
  JOIN routes r ON r.id = t.route_id
  JOIN lines l ON l.id = r.line_id
  JOIN stop_times st ON st.trip_id = t.id
  JOIN route_stops rs ON rs.id = st.route_stop_id
  JOIN stops s ON s.id = rs.stop_id
`;

function toLine(row: TimetableRow): Line {
  return {
    id: row.line_id,
    number: row.line_number,
    name: row.line_name,
    type: row.line_type,
    color: row.line_color,
  };
}

function toStop(row: TimetableRow): StopSummary {
  return { id: row.stop_id, name: row.stop_name, image_url: row.stop_image_url };
}

// Řádky jízdního řádu (už seřazené podle pořadí na trase) -> přehled spoje.
// Výchozí a cílová zastávka jsou první a poslední zastávka, kterou spoj
// skutečně obsluhuje; čas odjezdu je odjezd z výchozí zastávky.
function toSummary(rows: TimetableRow[]): TripSummary {
  const first = rows[0];
  const last = rows[rows.length - 1];
  const departure = toApiTime(first.departure_minutes);
  return {
    id: first.trip_id,
    line: toLine(first),
    direction: first.direction,
    origin: toStop(first),
    destination: toStop(last),
    departure_time: departure.time,
    departure_day_offset: departure.dayOffset,
    wheelchair_accessible: Boolean(first.trip_wheelchair_accessible),
    service_notices: [],
  };
}

// Na výchozí zastávce spoje se nevystupuje a na konečné nenastupuje;
// jinde je nástup i výstup běžný.
function boardingType(index: number, count: number): BoardingType {
  return index === count - 1 ? "not_available" : "regular";
}

function alightingType(index: number): AlightingType {
  return index === 0 ? "not_available" : "regular";
}

function groupByTrip(rows: TimetableRow[]): Map<number, TimetableRow[]> {
  const map = new Map<number, TimetableRow[]>();
  for (const row of rows) {
    const list = map.get(row.trip_id) ?? [];
    list.push(row);
    map.set(row.trip_id, list);
  }
  return map;
}

// Všechny spoje linky, chronologicky podle odjezdu z výchozí zastávky.
// Spoj ve 23:52 tak zůstane posledním večerním spojem.
export function getLineTrips(lineId: number): TripSummary[] {
  const rows = db
    .prepare(
      `${TIMETABLE_SELECT}
       WHERE r.line_id = ?
       ORDER BY t.id, rs.position`
    )
    .all(lineId) as TimetableRow[];

  return [...groupByTrip(rows).values()]
    .map((tripRows) => ({
      summary: toSummary(tripRows),
      start: tripRows[0].departure_minutes,
    }))
    .sort((a, b) => a.start - b.start || a.summary.id - b.summary.id)
    .map((t) => t.summary);
}

export function getTripDetail(tripId: number): TripDetail | null {
  const rows = db
    .prepare(
      `${TIMETABLE_SELECT}
       WHERE t.id = ?
       ORDER BY rs.position`
    )
    .all(tripId) as TimetableRow[];

  if (rows.length === 0) return null;

  return {
    ...toSummary(rows),
    stops: rows.map((row, index) => {
      const arrival = toApiTime(row.arrival_minutes);
      const departure = toApiTime(row.departure_minutes);
      return {
        stop_order: row.position,
        stop: toStop(row),
        arrival_time: arrival.time,
        arrival_day_offset: arrival.dayOffset,
        departure_time: departure.time,
        departure_day_offset: departure.dayOffset,
        platform: null,
        boarding_type: boardingType(index, rows.length),
        alighting_type: alightingType(index),
        service_notices: [],
      };
    }),
  };
}

// Odjezdy ze zastávky napříč všemi linkami, seřazené podle času
// odjezdu (ne příjezdu -- spoj, který přijede první, může odjet až
// po jiném). Spoje, které na zastávce končí, nevracíme: odtud už
// nikam neodjíždějí, takže do přehledu odjezdů nepatří.
export function getStopDepartures(stopId: number): Departure[] {
  const rows = db
    .prepare(
      `${TIMETABLE_SELECT}
       WHERE t.id IN (
         SELECT st2.trip_id
         FROM stop_times st2
         JOIN route_stops rs2 ON rs2.id = st2.route_stop_id
         WHERE rs2.stop_id = ?
       )
       ORDER BY t.id, rs.position`
    )
    .all(stopId) as TimetableRow[];

  const departures: { departure: Departure; sortKey: number; arrival: number }[] = [];

  for (const tripRows of groupByTrip(rows).values()) {
    const index = tripRows.findIndex((row) => row.stop_id === stopId);
    const isLastStop = index === tripRows.length - 1;
    if (index === -1 || isLastStop) continue;

    const here = tripRows[index];
    const last = tripRows[tripRows.length - 1];
    const arrival = toApiTime(here.arrival_minutes);
    const departure = toApiTime(here.departure_minutes);

    departures.push({
      departure: {
        trip_id: here.trip_id,
        line: toLine(here),
        direction: here.direction,
        destination: toStop(last),
        arrival_time: arrival.time,
        arrival_day_offset: arrival.dayOffset,
        departure_time: departure.time,
        departure_day_offset: departure.dayOffset,
        platform: null,
        boarding_type: boardingType(index, tripRows.length),
        alighting_type: alightingType(index),
        wheelchair_accessible: Boolean(here.trip_wheelchair_accessible),
        service_notices: [],
      },
      sortKey: here.departure_minutes,
      arrival: here.arrival_minutes,
    });
  }

  return departures
    .sort(
      (a, b) =>
        a.sortKey - b.sortKey ||
        a.arrival - b.arrival ||
        a.departure.trip_id - b.departure.trip_id
    )
    .map((d) => d.departure);
}
