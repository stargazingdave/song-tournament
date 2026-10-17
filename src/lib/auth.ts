import { cookies } from "next/headers";
import { jsonError } from "@/lib/http";
import { getSupabase } from "@/lib/supabase";

export async function getIdentity() {
  const supabase = (await getSupabase());
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { supabase, user: null, profile: null };
  const { data: profile, error } = await supabase.from("users")
    .select("user_id,display_name,settings").eq("user_id", user.id).maybeSingle();
  if (error) throw new Error(`Could not load your profile: ${error.message}`);
  return { supabase, user, profile };
}

export async function requireBand(request: Request) {
  const { supabase, user, profile } = await getIdentity();
  const bandId = request.headers.get("x-band-id") ?? "";
  if (!user) return { error: jsonError("Sign in first.", 401), bandId, userId: "" };
  if (!profile) return { error: jsonError("Set up your Song Tournament profile first.", 403), bandId, userId: user.id };
  if (!/^[0-9a-f-]{36}$/i.test(bandId)) return { error: jsonError("Choose a band first.", 403), bandId, userId: user.id };
  const { data, error } = await supabase.from("band_members").select("state")
    .eq("band_id", bandId).eq("user_id", user.id).maybeSingle();
  if (error) return { error: jsonError(error.message, 500), bandId, userId: user.id };
  if (data?.state !== "active") return {
    error: jsonError("Band approval and any required data migration must be completed first.", 403), bandId, userId: user.id,
  };
  return { error: null, bandId, userId: user.id };
}

export async function clearLegacyCookies() {
  const store = await cookies();
  store.delete("band_session");
  store.delete("band_member_id");
}
