import Database from "better-sqlite3";
import path from "node:path";
import { seedStops } from "@/lib/seedStops";

const dbPath = path.join(process.cwd(), "app.db");
export const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS team (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS stops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK (length(name) <= 255),
    image_url TEXT CHECK (image_url IS NULL OR length(image_url) <= 255),
    is_transfer INTEGER NOT NULL DEFAULT 0,
    x REAL NOT NULL,
    y REAL NOT NULL,
    wheelchair_accessible INTEGER NOT NULL DEFAULT 0,
    has_shelter INTEGER NOT NULL DEFAULT 0,
    has_bench INTEGER NOT NULL DEFAULT 0,
    has_ticket_machine INTEGER NOT NULL DEFAULT 0,
    has_display INTEGER NOT NULL DEFAULT 0
  );
`);

// Databázi naplníme daty jen jednou -- při prvním spuštění,
// kdy jsou tabulky ještě prázdné.
const teamCount = (
  db.prepare("SELECT COUNT(*) as count FROM team").get() as { count: number }
).count;

if (teamCount === 0) {
  db.prepare("INSERT INTO team (name) VALUES (?)").run("OBLÁČKOVÝ_MEDVÝDCY");

  const insertMember = db.prepare("INSERT INTO members (name) VALUES (?)");
  for (const name of ["Tomáš Koželuh", "Jakub Vejšický", "Jan Junek"]) {
    insertMember.run(name);
  }
}

seedStops(db);

export function getTeamInfo() {
  const team = db.prepare("SELECT name FROM team LIMIT 1").get() as
    | { name: string }
    | undefined;
  const members = db.prepare("SELECT name FROM members").all() as {
    name: string;
  }[];

  return {
    teamName: team?.name ?? "",
    members: members.map((m) => m.name),
  };
}
