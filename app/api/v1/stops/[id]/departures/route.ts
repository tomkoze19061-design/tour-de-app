import { NextResponse } from "next/server";
import { getStopById, parseStopId } from "@/lib/stops";
import { getStopDepartures } from "@/lib/timetables";

type Params = { params: Promise<{ id: string }> };

// Odjezdy ze zastávky napříč linkami, seřazené podle času odjezdu.
export async function GET(_request: Request, { params }: Params) {
  const id = parseStopId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: "Invalid stop ID" }, { status: 400 });
  }

  if (!getStopById(id)) {
    return NextResponse.json({ error: "Stop not found" }, { status: 404 });
  }

  return NextResponse.json(getStopDepartures(id));
}
