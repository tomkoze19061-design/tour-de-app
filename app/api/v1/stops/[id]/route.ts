import { NextResponse } from "next/server";
import {
  getStopById,
  updateStop,
  deleteStop,
  toApiStop,
  validateStopInput,
  parseStopId,
} from "@/lib/stops";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id: idParam } = await params;
  const id = parseStopId(idParam);

  if (id === null) {
    return NextResponse.json({ error: "Invalid stop ID" }, { status: 400 });
  }

  const stop = getStopById(id);
  if (!stop) {
    return NextResponse.json({ error: "Stop not found" }, { status: 404 });
  }

  return NextResponse.json(toApiStop(stop));
}

export async function PUT(request: Request, { params }: Params) {
  const { id: idParam } = await params;
  const id = parseStopId(idParam);

  if (id === null) {
    return NextResponse.json({ error: "Invalid stop ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = validateStopInput(body);
  if (!input) {
    return NextResponse.json(
      { error: "Invalid input data" },
      { status: 400 }
    );
  }

  const stop = updateStop(id, input);
  if (!stop) {
    return NextResponse.json({ error: "Stop not found" }, { status: 404 });
  }

  return NextResponse.json(toApiStop(stop));
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id: idParam } = await params;
  const id = parseStopId(idParam);

  if (id === null) {
    return NextResponse.json({ error: "Invalid stop ID" }, { status: 400 });
  }

  const deleted = deleteStop(id);
  if (!deleted) {
    return NextResponse.json({ error: "Stop not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
