import { NextResponse } from "next/server";
import { parseStopId } from "@/lib/stops";
import { getTripDetail } from "@/lib/timetables";

type Params = { params: Promise<{ id: string }> };

// Detail spoje: linka, směr a jízdní řád v pořadí trasy.
export async function GET(_request: Request, { params }: Params) {
  const id = parseStopId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: "Invalid trip ID" }, { status: 400 });
  }

  const trip = getTripDetail(id);
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  return NextResponse.json(trip);
}
