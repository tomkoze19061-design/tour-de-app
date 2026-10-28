import { NextResponse } from "next/server";
import { getLineById } from "@/lib/lines";
import { parseStopId } from "@/lib/stops";
import { getLineTrips } from "@/lib/timetables";

type Params = { params: Promise<{ id: string }> };

// Spoje linky, chronologicky podle odjezdu z výchozí zastávky.
export async function GET(_request: Request, { params }: Params) {
  const id = parseStopId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: "Invalid line ID" }, { status: 400 });
  }

  if (!getLineById(id)) {
    return NextResponse.json({ error: "Line not found" }, { status: 404 });
  }

  return NextResponse.json(getLineTrips(id));
}
