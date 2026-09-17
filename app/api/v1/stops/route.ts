import { NextResponse } from "next/server";
import {
  getAllStops,
  createStop,
  toApiStop,
  type StopInput,
} from "@/lib/stops";

export async function GET() {
  const stops = getAllStops();
  return NextResponse.json(stops.map(toApiStop));
}

export async function POST(request: Request) {
  const body = (await request.json()) as StopInput;
  // Pole "id" generuje aplikace/databáze -- i kdyby ho klient
  // poslal, ignorujeme ho a přidělí ho AUTOINCREMENT.
  const stop = createStop(body);
  return NextResponse.json(toApiStop(stop), { status: 201 });
}
