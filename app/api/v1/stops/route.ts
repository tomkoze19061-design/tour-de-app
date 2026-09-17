import { NextResponse } from "next/server";
import {
  getAllStops,
  createStop,
  toApiStop,
  validateStopInput,
} from "@/lib/stops";
import { isAuthorized } from "@/lib/auth";

export async function GET() {
  const stops = getAllStops();
  return NextResponse.json(stops.map(toApiStop));
}

export async function POST(request: Request) {
  // Autorizaci ověřujeme jako úplně první krok -- neautorizovaný
  // požadavek nesmí nijak ovlivnit stav databáze, i kdyby byla
  // data jinak platná.
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Missing or invalid administrator API key" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Pole "id" generuje aplikace/databáze -- pokud ho klient přesto
  // pošle, jde o pole mimo specifikaci a vstup je neplatný.
  const input = validateStopInput(body);
  if (!input) {
    return NextResponse.json(
      { error: "Invalid input data" },
      { status: 400 }
    );
  }

  const stop = createStop(input);
  return NextResponse.json(toApiStop(stop), { status: 201 });
}
