import { NextResponse } from "next/server";
import { createSessionToken, setSessionCookie, verifyPassword } from "@/lib/auth";
import { cleanText, jsonError, parseJson } from "@/lib/http";

export async function POST(request: Request) {
  const body = await parseJson<{ password?: string }>(request);
  const password = cleanText(body.password);

  if (!password || !verifyPassword(password)) {
    return jsonError("That password did not match.", 401);
  }

  setSessionCookie(createSessionToken());

  return NextResponse.json({ ok: true });
}
