import { NextResponse } from "next/server";
import {
  getLineDetail,
  updateLine,
  deleteLine,
  validateLineInput,
} from "@/lib/lines";
import { parseStopId } from "@/lib/stops";
import { isAuthorized } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

const badRequest = () =>
  NextResponse.json({ error: "Invalid request data" }, { status: 400 });
const notFound = () =>
  NextResponse.json({ error: "Line not found" }, { status: 404 });
const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function GET(_request: Request, { params }: Params) {
  const id = parseStopId((await params).id);
  if (id === null) return badRequest();

  const line = getLineDetail(id);
  if (!line) return notFound();

  return NextResponse.json(line);
}

export async function PUT(request: Request, { params }: Params) {
  if (!isAuthorized(request)) return unauthorized();

  const id = parseStopId((await params).id);
  if (id === null) return badRequest();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest();
  }

  const input = validateLineInput(body);
  if (!input) return badRequest();

  const line = updateLine(id, input);
  if (!line) return notFound();

  return NextResponse.json(line);
}

export async function DELETE(request: Request, { params }: Params) {
  if (!isAuthorized(request)) return unauthorized();

  const id = parseStopId((await params).id);
  if (id === null) return badRequest();

  if (!deleteLine(id)) return notFound();

  return new NextResponse(null, { status: 204 });
}
