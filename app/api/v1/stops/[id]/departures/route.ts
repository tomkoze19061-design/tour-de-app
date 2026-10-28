import { NextResponse } from "next/server";
import { getStopById, parseStopId } from "@/lib/stops";
import { getStopDepartures } from "@/lib/timetables";
import { isValidServiceDate } from "@/lib/time";

type Params = { params: Promise<{ id: string }> };

// Odjezdy ze zastávky napříč linkami, seřazené podle času odjezdu.
// Volitelný parametr ?service_date=YYYY-MM-DD (viz lines/[id]/trips).
export async function GET(request: Request, { params }: Params) {
  const id = parseStopId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: "Invalid stop ID" }, { status: 400 });
  }

  const serviceDate = new URL(request.url).searchParams.get("service_date");
  if (!isValidServiceDate(serviceDate)) {
    return NextResponse.json({ error: "Invalid service_date" }, { status: 400 });
  }

  if (!getStopById(id)) {
    return NextResponse.json({ error: "Stop not found" }, { status: 404 });
  }

  return NextResponse.json(getStopDepartures(id));
}
