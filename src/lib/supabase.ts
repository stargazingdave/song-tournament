import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requiredEnv, supabaseSchema } from "@/lib/env";
import { authCookieOptions } from "@/lib/supabase-options";

// Ordinary requests use the caller's JWT, so database RLS applies.
export function getSupabase() {
  const store = cookies();
  return createServerClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_PUBLISHABLE_KEY"), {
    db: { schema: supabaseSchema() },
    cookieOptions: authCookieOptions,
    cookies: {
      getAll: () => store.getAll(),
      setAll: values => values.forEach(({ name, value, options }) => store.set(name, value, options)),
    },
  });
}
