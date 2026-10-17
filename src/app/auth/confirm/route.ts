import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

const allowedTypes = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") === "/auth/update-password" || type === "recovery" ? "/auth/update-password" : "/";
  const supabase = (await getSupabase());
  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : hash && type && allowedTypes.includes(type)
      ? await supabase.auth.verifyOtp({ token_hash: hash, type: type as EmailOtpType })
      : { error: new Error("Missing confirmation token.") };
  return NextResponse.redirect(new URL(result.error ? "/auth/error" : next, url.origin));
}
