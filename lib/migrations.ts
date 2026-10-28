import type Database from "better-sqlite3";

// Migrace schématu databáze.
//
// Základní tabulky (tým, zastávky, linky, trasy) vytváří db.ts pomocí
// CREATE TABLE IF NOT EXISTS. Změny schématu, které už nejdou udělat
// jen přidáním nové tabulky (např. změna existující tabulky), děláme
// tady jako číslované migrace.
//
// Aktuální verzi schématu si SQLite pamatuje v hlavičce souboru
// (PRAGMA user_version). Při startu se spustí jen ty migrace, které
// databáze ještě nemá -- nová databáze projde všemi, existující jen
// novými. Každá migrace se proto smí spustit jen jednou a nikdy se
// po nasazení nemění; další změna = nová migrace s vyšším číslem.

type Migration = {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
};

const migrations: Migration[] = [
  {
    version: 1,
    description:
      "route_stops dostává vlastní id, aby na konkrétní zastávku trasy šlo odkazovat z jízdního řádu",
    up(db) {
      const exists = db
        .prepare(
          "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'route_stops'"
        )
        .get();

      db.exec(`
        CREATE TABLE route_stops_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          route_id INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
          stop_id INTEGER NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
          position INTEGER NOT NULL CHECK (position >= 1),
          UNIQUE (route_id, position),
          UNIQUE (route_id, stop_id),
          -- Dvojice (id, route_id) je unikátní už díky id, ale jako
          -- samostatný UNIQUE klíč na ni může odkazovat jízdní řád.
          -- Tím databáze sama vynutí, že zastávka v jízdním řádu
          -- patří do trasy spoje (viz migrace 2).
          UNIQUE (id, route_id)
        );
      `);

      // Starší databáze (z fáze Linky) už tabulku má, jen bez id --
      // data převezmeme, ať se nic neztratí.
      if (exists) {
        db.exec(`
          INSERT INTO route_stops_new (route_id, stop_id, position)
            SELECT route_id, stop_id, position
            FROM route_stops
            ORDER BY route_id, position;
          DROP TABLE route_stops;
        `);
      }

      db.exec("ALTER TABLE route_stops_new RENAME TO route_stops;");
    },
  },
  {
    version: 2,
    description: "spoje (trips) a jejich jízdní řády (stop_times)",
    up(db) {
      db.exec(`
        -- Spoj = konkrétní jízda po jedné trase. Linku, směr i pořadí
        -- zastávek určuje trasa, proto je tu znovu neukládáme.
        CREATE TABLE trips (
          id INTEGER PRIMARY KEY,
          route_id INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
          -- Doplňkové údaje ze zdrojových dat (stabilní externí
          -- reference, označení oběhu vozu, bezbariérovost spoje).
          source_trip_id TEXT UNIQUE,
          service_ref TEXT,
          block_ref TEXT,
          wheelchair_accessible INTEGER NOT NULL DEFAULT 0
            CHECK (wheelchair_accessible IN (0, 1)),
          UNIQUE (id, route_id)
        );
        CREATE INDEX trips_route_id ON trips(route_id);

        -- Jízdní řád spoje: příjezd a odjezd na zastávce jeho trasy.
        --
        -- Časy ukládáme jako počet minut od začátku provozního dne,
        -- ve kterém spoj vyjel. Spoj, který vyjede ve 23:52 a dojede
        -- v 0:14, má tak poslední zastávku na minutě 1454 (24 h 14 min),
        -- ne 14 -- zůstává večerním spojem a s minutami jde snadno
        -- počítat i řadit. Do formátu HH:MM se převádí až v API.
        --
        -- route_id je tu jen jako kontrolní klíč: složené cizí klíče
        -- (trip_id, route_id) a (route_stop_id, route_id) zajistí, že
        -- zastávka v jízdním řádu patří do stejné trasy jako spoj.
        -- Pořadí zastávek se nebere odsud, ale z route_stops.position.
        CREATE TABLE stop_times (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          trip_id INTEGER NOT NULL,
          route_id INTEGER NOT NULL,
          route_stop_id INTEGER NOT NULL,
          arrival_minutes INTEGER NOT NULL CHECK (arrival_minutes >= 0),
          departure_minutes INTEGER NOT NULL
            CHECK (departure_minutes >= arrival_minutes),
          FOREIGN KEY (trip_id, route_id)
            REFERENCES trips(id, route_id) ON DELETE CASCADE,
          FOREIGN KEY (route_stop_id, route_id)
            REFERENCES route_stops(id, route_id) ON DELETE CASCADE,
          UNIQUE (trip_id, route_stop_id)
        );
        CREATE INDEX stop_times_route_stop_id ON stop_times(route_stop_id);
      `);
    },
  },
];

export function runMigrations(db: Database.Database) {
  // Stejně jako seed běží migrace v IMMEDIATE transakci: paralelní
  // procesy (workery při `next build`) se seřadí a každý si verzi
  // přečte až po dokončení předchozího, takže nic neproběhne dvakrát.
  // Když migrace selže, transakce se vrátí a verze se nezvýší.
  const migrate = db.transaction(() => {
    const current = db.pragma("user_version", { simple: true }) as number;

    for (const migration of migrations) {
      if (migration.version <= current) continue;
      migration.up(db);
      db.pragma(`user_version = ${migration.version}`);
    }
  });

  migrate.immediate();
}
