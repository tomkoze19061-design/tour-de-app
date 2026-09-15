import { NextResponse } from "next/server";

// Next.js App Router pozná podle názvu funkce (GET, POST, ...),
// na jakou HTTP metodu má reagovat. Tahle funkce se zavolá,
// když někdo pošle GET požadavek na /api/v1/health.
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
