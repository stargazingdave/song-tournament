import { NextResponse } from "next/server";
import { clearLegacyCookies } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { jsonError } from "@/lib/http";

export async function POST() {
  const { error } = await (await getSupabase()).auth.signOut({ scope: "local" });
  if (error) return jsonError("Could not sign out. Please try again.", 500);
  await clearLegacyCookies();
  return NextResponse.json({ ok: true });
}
