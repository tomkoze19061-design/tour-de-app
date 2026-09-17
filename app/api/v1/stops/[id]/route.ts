import { NextResponse } from "next/server";
import {
  getStopById,
  updateStop,
  deleteStop,
  toApiStop,
  type StopInput,
} from "@/lib/stops";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const stop = getStopById(Number(id));

  if (!stop) {
    return NextResponse.json({ error: "Stop not found" }, { status: 404 });
  }

  return NextResponse.json(toApiStop(stop));
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json()) as StopInput;
  const stop = updateStop(Number(id), body);

  if (!stop) {
    return NextResponse.json({ error: "Stop not found" }, { status: 404 });
  }

  return NextResponse.json(toApiStop(stop));
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const deleted = deleteStop(Number(id));

  if (!deleted) {
    return NextResponse.json({ error: "Stop not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
