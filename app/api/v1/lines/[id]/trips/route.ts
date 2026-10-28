import { NextResponse } from "next/server";
import { getLineById } from "@/lib/lines";
import { parseStopId } from "@/lib/stops";
import { getLineTrips } from "@/lib/timetables";
import { isValidServiceDate } from "@/lib/time";

type Params = { params: Promise<{ id: string }> };

// Spoje linky, chronologicky podle odjezdu z výchozí zastávky.
// Volitelný parametr ?service_date=YYYY-MM-DD určuje den provozu;
// všechny současné spoje jezdí denně, takže den výsledek nemění.
export async function GET(request: Request, { params }: Params) {
  const id = parseStopId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: "Invalid line ID" }, { status: 400 });
  }

  const serviceDate = new URL(request.url).searchParams.get("service_date");
  if (!isValidServiceDate(serviceDate)) {
    return NextResponse.json({ error: "Invalid service_date" }, { status: 400 });
  }

  if (!getLineById(id)) {
    return NextResponse.json({ error: "Line not found" }, { status: 404 });
  }

  return NextResponse.json(getLineTrips(id));
}
