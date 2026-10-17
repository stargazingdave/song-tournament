import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { requiredEnv } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { getSupabase } from "@/lib/supabase";

export function verifyInvitation(code: string) {
  const expected = Buffer.from(requiredEnv("BAND_SPACE_PASSWORD"));
  const actual = Buffer.from(code);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function getIdentity() {
  const supabase = getSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { supabase, user: null, memberId: null };
  const { data, error } = await supabase.from("users").select("member_id").eq("user_id", user.id).maybeSingle();
  if (error) throw new Error(`Could not load Song Tournament membership: ${error.message}`);
  return { supabase, user, memberId: (data?.member_id as string | undefined) ?? null };
}

export async function requireMember() {
  const identity = await getIdentity();
  if (!identity.user) return { error: jsonError("Sign in first.", 401), memberId: null };
  if (!identity.memberId) return { error: jsonError("Join Song Tournament first.", 403), memberId: null };
  return { error: null, memberId: identity.memberId };
}

export function clearLegacyCookies() {
  cookies().delete("band_session");
  cookies().delete("band_member_id");
}
