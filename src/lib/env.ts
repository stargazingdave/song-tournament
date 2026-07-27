export function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function supabaseSchema() {
  return process.env.SUPABASE_SCHEMA || "song_tournament";
}
