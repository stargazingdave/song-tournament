import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig, supabaseSchema } from "@/lib/env";
import { authCookieOptions } from "@/lib/supabase-options";

// Ordinary requests use the caller's JWT, so database RLS applies.
export async function getSupabase() {
  const store = await cookies();
  const { url, key } = supabaseConfig();
  return createServerClient(url, key, {
    db: { schema: supabaseSchema() },
    cookieOptions: authCookieOptions,
    cookies: {
      getAll: () => store.getAll(),
      setAll: values => values.forEach(({ name, value, options }) => store.set(name, value, options)),
    },
  });
}
