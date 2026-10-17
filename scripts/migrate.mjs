import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL to a PostgreSQL connection string before running migrations.");
  process.exit(1);
}

let databaseUrl;
let client;
const migrationDirectory = new URL("../supabase/migrations/", import.meta.url);

try {
  databaseUrl = new URL(process.env.DATABASE_URL);
  if (process.env.DATABASE_PASSWORD) databaseUrl.password = process.env.DATABASE_PASSWORD;
  client = new pg.Client({ connectionString: databaseUrl.toString(), connectionTimeoutMillis: 15000 });
  await client.connect();
  await client.query("begin");
  await client.query("select pg_advisory_xact_lock(hashtext('song_tournament:migrations'))");
  if (!(await client.query("select to_regclass('song_tournament.members') as name")).rows[0].name) {
    await client.query(await readFile(new URL("../supabase/song_tournament.sql", import.meta.url), "utf8"));
  }
  await client.query(`
    create table if not exists song_tournament.schema_migrations (
      name text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    );
    alter table song_tournament.schema_migrations enable row level security;
    revoke all on song_tournament.schema_migrations from public, anon, authenticated;
  `);
  const applied = new Map((await client.query("select name, checksum from song_tournament.schema_migrations")).rows.map(row => [row.name, row.checksum]));
  const filenames = (await readdir(migrationDirectory)).filter(name => /^\d+_.+\.sql$/.test(name)).sort();
  const pending = [];
  for (const name of filenames) {
    const sql = await readFile(new URL(name, migrationDirectory), "utf8");
    // Normalize Git's Windows line endings so checksums survive a cross-platform checkout.
    const checksum = createHash("sha256").update(sql.replaceAll("\r\n", "\n")).digest("hex");
    if (applied.has(name)) {
      if (applied.get(name) !== checksum) throw new Error(`Applied migration has changed: ${name}`);
      continue;
    }
    await client.query(sql);
    await client.query("insert into song_tournament.schema_migrations(name, checksum) values ($1, $2)", [name, checksum]);
    pending.push(name);
  }
  await client.query("commit");
  for (const name of pending) console.log(`Applied ${name}`);
  console.log(pending.length ? "Database migrations committed." : "Database is up to date.");
} catch (error) {
  if (client) await client.query("rollback").catch(() => {});
  let message = error instanceof Error ? error.message : "Unknown database error";
  for (const secret of [process.env.DATABASE_URL, process.env.DATABASE_PASSWORD, databaseUrl && decodeURIComponent(databaseUrl.password)]) {
    if (secret) message = message.replaceAll(secret, "[redacted]");
  }
  console.error(`Migration failed; no migrations were committed. ${message}`);
  process.exitCode = 1;
} finally {
  if (client) await client.end();
}
