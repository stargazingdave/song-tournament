import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { cleanText, jsonError, parseJson } from "@/lib/http";

export async function POST(request: Request) {
  const body = await parseJson<{ email?: string; password?: string; name?: string }>(request);
  const name = cleanText(body.name);
  if (!name || name.length > 100) return jsonError("Enter a display name between 1 and 100 characters.");
  const email = cleanText(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || password.length < 8) return jsonError("Enter an email and a password of at least 8 characters.");
  const { data, error } = await getSupabase().auth.signUp({
    email, password, options: { data: { display_name: name }, emailRedirectTo: new URL("/auth/confirm", request.url).toString() },
  });
  if (error) return jsonError(error.message);
  return NextResponse.json({ authenticated: !!data.session });
}
