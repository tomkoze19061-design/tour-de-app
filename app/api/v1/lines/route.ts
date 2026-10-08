import { NextResponse } from "next/server";
import { getAllLines, createLine, validateLineInput } from "@/lib/lines";
import { isAuthorized } from "@/lib/auth";

export async function GET() {
  return NextResponse.json(getAllLines());
}

export async function POST(request: Request) {
  // Autorizace se ověřuje jako první -- neautorizovaný požadavek
  // nesmí nijak ovlivnit stav databáze.
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request data" },
      { status: 400 }
    );
  }

  const input = validateLineInput(body);
  if (!input) {
    return NextResponse.json(
      { error: "Invalid request data" },
      { status: 400 }
    );
  }

  return NextResponse.json(createLine(input), { status: 201 });
}
