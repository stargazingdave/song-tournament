import assert from "node:assert/strict";
import { test, before, beforeEach, afterEach, after } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const alice = "10000000-0000-0000-0000-000000000001";
const bob = "10000000-0000-0000-0000-000000000002";
const outsider = "10000000-0000-0000-0000-000000000003";
const unverified = "10000000-0000-0000-0000-000000000004";
let memberA, memberB, song, poll;
async function asUser(id, role = "authenticated") {
  await db.exec("reset role; set local role " + role);
  await db.query("select set_config('request.jwt.claim.sub', $1, true)", [id ?? ""]);
}
async function deny(sql, args = [], pattern = /permission denied|row-level security/) {
  await db.exec("savepoint expected_denial");
  await assert.rejects(db.query(sql, args), pattern);
  await db.exec("rollback to savepoint expected_denial");
}
before(async () => {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
    $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
  `);
  const baseline = (await readFile(new URL("../supabase/song_tournament.sql", import.meta.url), "utf8"))
    .replace("create extension if not exists pgcrypto;", "");
  await db.exec(baseline);
  // Model legacy band identities before auth is installed.
  await db.exec("insert into song_tournament.members(name) values ('Legacy musician')");
  await db.exec(await readFile(new URL("../supabase/migrations/20261017120000_app_membership.sql", import.meta.url), "utf8"));
});
beforeEach(async () => {
  await db.exec("begin");
  await db.query("insert into auth.users values ($1,now()),($2,now()),($3,now()),($4,null)", [alice,bob,outsider,unverified]);
  await asUser(null,"service_role");
  memberA = (await db.query("select song_tournament.enroll($1,'Alice') as id",[alice])).rows[0].id;
  memberB = (await db.query("select song_tournament.enroll($1,'Bob') as id",[bob])).rows[0].id;
  await asUser(alice);
  song = (await db.query("insert into song_tournament.songs(title,added_by_member_id) values ('Song',$1) returning id",[memberA])).rows[0].id;
  poll = (await db.query("insert into song_tournament.polls(title) values ('Poll') returning id")).rows[0].id;
  await db.query("insert into song_tournament.poll_songs(poll_id,song_id) values ($1,$2)",[poll,song]);
});
afterEach(async () => { await db.exec("rollback; reset role"); });
after(async () => { await db.close(); });

test("shared Auth identity alone grants no band data or enrollment RPC access", async () => {
  await asUser(outsider);
  for (const table of ["members","songs","polls","poll_songs","song_votes","poll_scores","chosen_songs","users"]) {
    assert.equal((await db.query("select * from song_tournament."+table)).rows.length,0,table);
  }
  await deny("insert into song_tournament.polls(title) values ('Blocked')");
  await deny("select song_tournament.enroll($1,'Bypassed')",[outsider]);
  await deny("insert into song_tournament.users(user_id,member_id) values ($1,$2)",[outsider,memberA]);
});
test("members share the band workspace but only see their own app profile", async () => {
  await asUser(bob);
  assert.equal((await db.query("select * from song_tournament.songs")).rows.length,1);
  assert.equal((await db.query("select * from song_tournament.members")).rows.length,3);
  assert.equal((await db.query("select * from song_tournament.users")).rows.length,1);
  assert.equal((await db.query("select song_tournament.current_member_id() as id")).rows[0].id,memberB);
  await db.query("update song_tournament.songs set title='Edited' where id=$1",[song]);
  await db.query("update song_tournament.users set settings='{\"theme\":\"dark\"}' where user_id=$1",[bob]);
  await deny("update song_tournament.users set member_id=$1 where user_id=$2",[memberA,bob]);
  await deny("delete from song_tournament.users where user_id=$1",[bob]);
});
test("votes and scores are readable by members and writable only for oneself", async () => {
  await asUser(alice);
  await db.query("insert into song_tournament.song_votes(song_id,member_id,vote) values ($1,$2,'yes')",[song,memberA]);
  await db.query("insert into song_tournament.poll_scores(poll_id,song_id,member_id,score) values ($1,$2,$3,5)",[poll,song,memberA]);
  await asUser(bob);
  assert.equal((await db.query("select * from song_tournament.song_votes")).rows.length,1);
  assert.equal((await db.query("select * from song_tournament.poll_scores")).rows.length,1);
  await deny("insert into song_tournament.song_votes(song_id,member_id,vote) values ($1,$2,'no')",[song,memberA]);
  await deny("insert into song_tournament.poll_scores(poll_id,song_id,member_id,score) values ($1,$2,$3,1)",[poll,song,memberA]);
  assert.equal((await db.query("delete from song_tournament.song_votes where member_id=$1 returning *",[memberA])).rows.length,0);
  assert.equal((await db.query("update song_tournament.poll_scores set score=1 where member_id=$1 returning *",[memberA])).rows.length,0);
  await db.query("insert into song_tournament.song_votes(song_id,member_id,vote) values ($1,$2,'no')",[song,memberB]);
  await db.query("delete from song_tournament.song_votes where member_id=$1",[memberB]);
});
test("song authorship cannot be forged or replaced", async () => {
  await asUser(bob);
  await deny("insert into song_tournament.songs(title,added_by_member_id) values ('Forged',$1)",[memberA],/own band identity/);
  await deny("update song_tournament.songs set added_by_member_id=$1 where id=$2",[memberB,song],/authorship cannot/);
});
test("legacy identities remain intact and can be linked exactly once by invited enrollment", async () => {
  await asUser(null,"service_role");
  const legacy = (await db.query("select id from song_tournament.members where name='Legacy musician'")).rows[0].id;
  const linked = (await db.query("select song_tournament.enroll($1,'legacy MUSICIAN',true) as id",[outsider])).rows[0].id;
  assert.equal(linked,legacy);
  assert.equal((await db.query("select song_tournament.enroll($1,'Ignored',false) as id",[outsider])).rows[0].id,legacy);
  await db.exec("reset role");
  await db.query("delete from song_tournament.users where user_id=$1",[bob]);
  await asUser(null,"service_role");
  await deny("select song_tournament.enroll($1,'Legacy musician',true)",[bob],/already linked/);
});
test("unverified enrollment and anonymous data access are denied", async () => {
  await asUser(null,"service_role");
  await deny("select song_tournament.enroll($1,'Unverified')",[unverified],/Verify your email/);
  await asUser(null,"anon");
  for(const table of ["members","songs","song_votes","polls","poll_scores","poll_songs","chosen_songs","users"]) {
    await deny("select * from song_tournament."+table);
  }
  await deny("select song_tournament.enroll($1,'Anonymous')",[outsider]);
});
test("the old broad grants no longer permit TRUNCATE or direct identity edits", async () => {
  await asUser(alice);
  await deny("truncate song_tournament.songs cascade");
  await deny("update song_tournament.members set name='Taken' where id=$1",[memberB]);
  await deny("delete from song_tournament.members where id=$1",[memberA]);
});
test("deleting a shared identity removes app enrollment while preserving historical band data", async () => {
  await db.exec("reset role");
  await db.query("delete from auth.users where id=$1",[alice]);
  assert.equal((await db.query("select * from song_tournament.users where user_id=$1",[alice])).rows.length,0);
  assert.equal((await db.query("select * from song_tournament.members where id=$1",[memberA])).rows.length,1);
  assert.equal((await db.query("select * from song_tournament.songs where id=$1",[song])).rows.length,1);
});
