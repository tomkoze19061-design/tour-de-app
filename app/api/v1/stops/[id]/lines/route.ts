import { NextResponse } from "next/server";
import { getStopById, parseStopId } from "@/lib/stops";
import { getLinesByStopId } from "@/lib/lines";

type Params = { params: Promise<{ id: string }> };

// Linky, které obsluhují danou zastávku (veřejné čtení).
export async function GET(_request: Request, { params }: Params) {
  const id = parseStopId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: "Invalid stop ID" }, { status: 400 });
  }

  if (!getStopById(id)) {
    return NextResponse.json({ error: "Stop not found" }, { status: 404 });
  }

  return NextResponse.json(getLinesByStopId(id));
}
