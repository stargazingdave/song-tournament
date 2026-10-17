import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import { supabaseConfig } from "../src/lib/env.ts";

const names = ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SECRET_KEY"];
const original = new Map(names.map(name => [name, process.env[name]]));
beforeEach(() => { for (const name of names) delete process.env[name]; });
after(() => { for (const [name, value] of original) { if (value === undefined) delete process.env[name]; else process.env[name] = value; } });

test("server URL and publishable key resolve consistently for proxy and routes", () => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_example";
  assert.deepEqual(supabaseConfig(), { url: "https://example.supabase.co", key: "sb_publishable_example" });
});

for (const name of ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]) {
  test(`supports hosted configuration using ${name}`, () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env[name] = "public-key-example";
    assert.deepEqual(supabaseConfig(), { url: "https://example.supabase.co", key: "public-key-example" });
  });
}

test("server publishable settings take precedence and values are trimmed", () => {
  process.env.SUPABASE_URL = " https://example.supabase.co ";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fallback.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = " sb_publishable_example ";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "fallback-key";
  assert.deepEqual(supabaseConfig(), { url: "https://example.supabase.co", key: "sb_publishable_example" });
});

test("blank primary settings allow configured public aliases", () => {
  process.env.SUPABASE_URL = " ";
  process.env.SUPABASE_PUBLISHABLE_KEY = " ";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_example";
  assert.equal(supabaseConfig().key, "sb_publishable_example");
});

test("missing URL identifies the deployment setting without logging credentials", () => {
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_do_not_log";
  assert.throws(supabaseConfig, error => /Missing Supabase URL/.test(error.message) && !error.message.includes("do_not_log"));
});

test("a secret key alone is insufficient and never substitutes for public auth configuration", () => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_do_not_log";
  assert.throws(supabaseConfig, error => /Missing Supabase public key/.test(error.message) && /SUPABASE_PUBLISHABLE_KEY/.test(error.message) && !error.message.includes("do_not_log"));
});
