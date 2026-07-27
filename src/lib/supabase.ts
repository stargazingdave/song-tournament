import { createClient } from "@supabase/supabase-js";
import { requiredEnv, supabaseSchema } from "@/lib/env";

export function getSupabase() {
  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SECRET_KEY"), {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: supabaseSchema()
    }
  });
}
