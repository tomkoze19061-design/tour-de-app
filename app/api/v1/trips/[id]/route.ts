import { NextResponse } from "next/server";
import { parseStopId } from "@/lib/stops";
import { getTripDetail } from "@/lib/timetables";
import { isValidServiceDate } from "@/lib/time";

type Params = { params: Promise<{ id: string }> };

// Detail spoje: linka, směr a jízdní řád v pořadí trasy.
// Volitelný parametr ?service_date=YYYY-MM-DD (viz lines/[id]/trips).
export async function GET(request: Request, { params }: Params) {
  const id = parseStopId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: "Invalid trip ID" }, { status: 400 });
  }

  const serviceDate = new URL(request.url).searchParams.get("service_date");
  if (!isValidServiceDate(serviceDate)) {
    return NextResponse.json({ error: "Invalid service_date" }, { status: 400 });
  }

  const trip = getTripDetail(id);
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  return NextResponse.json(trip);
}
