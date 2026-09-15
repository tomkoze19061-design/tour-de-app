import Database from "better-sqlite3";
import path from "node:path";

const dbPath = path.join(process.cwd(), "app.db");
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS team (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
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
