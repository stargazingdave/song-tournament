import assert from "node:assert/strict";
import { test, before, beforeEach, afterEach, after } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const db=new PGlite();
const owner="10000000-0000-0000-0000-000000000001", bob="10000000-0000-0000-0000-000000000002", outsider="10000000-0000-0000-0000-000000000003", unverified="10000000-0000-0000-0000-000000000004";
let original, oldBob, song, poll;
async function identity(id,role="authenticated"){await db.exec("reset role; set local role "+role);await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id??""]);}
async function deny(sql,args=[],pattern=/permission denied|row-level security|Only the|own account|cannot|not approved|approved.*request|permanent|no longer|already final|not found|Verify|verify/){await db.exec("savepoint denied");await assert.rejects(db.query(sql,args),pattern);await db.exec("rollback to savepoint denied");}
async function enroll(id,name){await identity(id);await db.query("select song_tournament.enroll($1)",[name]);}
async function join(id,band,approve=true){await identity(owner);const code=(await db.query("select code from song_tournament.band_codes where band_id=$1",[band])).rows[0].code;await identity(id);await db.query("select song_tournament.request_band_join($1)",[code]);await identity(owner);await db.query("select song_tournament.review_join_request($1,$2,$3)",[band,id,approve]);}
before(async()=>{
 await db.exec(`begin;create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;
 grant usage on schema auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`);
 await db.exec((await readFile(new URL("../supabase/song_tournament.sql",import.meta.url),"utf8")).replace("create extension if not exists pgcrypto;",""));
 await db.exec(await readFile(new URL("../supabase/migrations/20261017120000_app_membership.sql",import.meta.url),"utf8"));
 await db.query("insert into auth.users values($1,now()),($2,now()),($3,now()),($4,null)",[owner,bob,outsider,unverified]);
 await identity(null,"service_role");const linked=(await db.query("select song_tournament.enroll($1,'Owner') id",[owner])).rows[0].id;
 await db.exec("reset role");oldBob=(await db.query("insert into song_tournament.members(name) values ('Old Bob') returning id")).rows[0].id;
 await identity(owner);song=(await db.query("insert into song_tournament.songs(title,added_by_member_id) values('Original song',$1) returning id",[linked])).rows[0].id;
 poll=(await db.query("insert into song_tournament.polls(title) values('Original poll') returning id")).rows[0].id;
 await db.query("insert into song_tournament.poll_songs(poll_id,song_id) values($1,$2)",[poll,song]);
 await db.exec("reset role");await db.query("insert into song_tournament.song_votes(song_id,member_id,vote) values($1,$2,'yes'),($1,$3,'no')",[song,linked,oldBob]);
 await db.query("insert into song_tournament.poll_scores(poll_id,song_id,member_id,score) values($1,$2,$3,5),($1,$2,$4,3)",[poll,song,linked,oldBob]);
 await db.query("insert into song_tournament.chosen_songs(song_id,note,position) values($1,'Legacy note',4)",[song]);
 await db.exec(await readFile(new URL("../supabase/migrations/20261017150000_bands.sql",import.meta.url),"utf8"));
 original=(await db.query("select id from song_tournament.bands")).rows[0].id;
 await db.exec("commit;reset role");
});
beforeEach(async()=>{await db.exec("begin");await enroll(bob,"Bob");await enroll(outsider,"Other");});
afterEach(async()=>{await db.exec("rollback;reset role");});after(async()=>{await db.close();});
test("migration creates one owned band, migrates the existing account, deletes its member, and preserves every vote",async()=>{
 await identity(owner);
 assert.equal((await db.query("select owner_user_id from song_tournament.bands")).rows[0].owner_user_id,owner);
 assert.deepEqual((await db.query("select user_id,state from song_tournament.band_members")).rows,[{user_id:owner,state:"active"}]);
 assert.equal((await db.query("select * from song_tournament.song_votes")).rows.length,2);
 assert.equal((await db.query("select * from song_tournament.poll_scores")).rows.length,2);
 assert.equal((await db.query("select user_id from song_tournament.song_votes where user_id=$1",[owner])).rows.length,1);
 await db.exec("reset role");assert.deepEqual((await db.query("select id from song_tournament.members")).rows,[{id:oldBob}]);
 assert.equal((await db.query("select legacy_member_id from song_tournament.legacy_imports")).rows.length,1);
});
test("creating a profile alone grants no band or legacy data; old linking RPC is gone",async()=>{
 await identity(bob);assert.equal((await db.query("select * from song_tournament.bands")).rows.length,0);assert.equal((await db.query("select * from song_tournament.songs")).rows.length,0);
 await deny("select * from song_tournament.members");await deny("select song_tournament.get_legacy_import_options($1)",[original]);
 await deny("select song_tournament.enroll($1,'Old Bob',true)",[bob],/does not exist/);
 await deny("insert into song_tournament.band_members(band_id,user_id,state) values($1,$2,'active')",[original,bob]);
});
test("users can create multiple independent bands and may not move records between them",async()=>{
 await identity(owner);const second=(await db.query("select song_tournament.create_band('Second') id")).rows[0].id;
 const third=(await db.query("select song_tournament.create_band('Third') id")).rows[0].id;
 assert.equal((await db.query("select * from song_tournament.bands")).rows.length,3);
 await deny("update song_tournament.songs set band_id=$1 where id=$2",[second,song]);
 const wrongPoll=(await db.query("insert into song_tournament.polls(band_id,title,created_by_user_id) values($1,'Wrong band',$2) returning id",[third,owner])).rows[0].id;
 await deny("insert into song_tournament.poll_songs(poll_id,song_id,band_id) values($1,$2,$3)",[wrongPoll,song,third],/foreign key/);
});
test("band code creates only a pending request; members cannot approve themselves or read data",async()=>{
 await identity(owner);const code=(await db.query("select code from song_tournament.band_codes")).rows[0].code;
 await identity(bob);await db.query("select song_tournament.request_band_join($1)",[code.toLowerCase()]);
 assert.equal((await db.query("select status from song_tournament.band_join_requests")).rows[0].status,"pending");
 assert.equal((await db.query("select * from song_tournament.songs")).rows.length,0);
 await deny("select song_tournament.review_join_request($1,$2,true)",[original,bob]);
 await deny("select song_tournament.get_legacy_import_options($1)",[original]);
 assert.equal((await db.query("select * from song_tournament.band_codes")).rows.length,0);
});
test("owner approval gates entry behind a mandatory one-time selection and deletes the claimed source",async()=>{
 await join(bob,original);await identity(bob);
 assert.equal((await db.query("select state from song_tournament.band_members where user_id=$1",[bob])).rows[0].state,"migration_required");
 assert.equal((await db.query("select * from song_tournament.songs")).rows.length,0);
 assert.deepEqual((await db.query("select * from song_tournament.get_legacy_import_options($1)",[original])).rows,[{id:oldBob,name:"Old Bob"}]);
 await deny("select song_tournament.complete_legacy_import($1,null,true)",[original]);
 await deny("select song_tournament.complete_legacy_import($1,$2,false)",[original,oldBob]);
 await db.query("select song_tournament.complete_legacy_import($1,$2,true)",[original,oldBob]);
 assert.equal((await db.query("select * from song_tournament.songs")).rows.length,1);
 assert.equal((await db.query("select vote from song_tournament.song_votes where user_id=$1",[bob])).rows[0].vote,"no");
 assert.equal((await db.query("select score from song_tournament.poll_scores where user_id=$1",[bob])).rows[0].score,3);
 await deny("select song_tournament.complete_legacy_import($1,$2,true)",[original,oldBob]);
 await db.exec("reset role");assert.equal((await db.query("select * from song_tournament.members")).rows.length,0);
 assert.equal((await db.query("select count(*) n from song_tournament.song_votes")).rows[0].n,2);
});
test("the final migration retires the legacy prompt for future approved members",async()=>{
 await join(bob,original);await identity(bob);await db.query("select song_tournament.complete_legacy_import($1,$2,true)",[original,oldBob]);
 await join(outsider,original);await identity(outsider);assert.equal((await db.query("select state from song_tournament.band_members where user_id=$1",[outsider])).rows[0].state,"active");
});
test("rotation invalidates the old code and only owners manage codes or requests",async()=>{
 await identity(owner);const old=(await db.query("select code from song_tournament.band_codes")).rows[0].code;
 const fresh=(await db.query("select song_tournament.rotate_band_code($1) code",[original])).rows[0].code;assert.notEqual(fresh,old);
 await identity(bob);await deny("select song_tournament.request_band_join($1)",[old]);await db.query("select song_tournament.request_band_join($1)",[fresh]);
 await deny("select song_tournament.rotate_band_code($1)",[original]);await deny("select song_tournament.get_band_requests($1)",[original]);
});
test("join requests can be declined; unrelated bands and votes remain isolated",async()=>{
 await join(bob,original,false);await identity(bob);assert.equal((await db.query("select status from song_tournament.band_join_requests")).rows[0].status,"rejected");
 const other=(await db.query("select song_tournament.create_band('Bob band') id")).rows[0].id;
 await db.query("insert into song_tournament.songs(band_id,title,added_by_user_id) values($1,'Private',$2)",[other,bob]);
 assert.equal((await db.query("select * from song_tournament.songs")).rows.length,1);await deny("insert into song_tournament.song_votes(band_id,song_id,user_id,vote) values($1,$2,$3,'yes')",[original,song,bob]);
});
test("members can collaborate after approval but cannot impersonate votes or change song authorship",async()=>{
 await join(bob,original);await identity(bob);await db.query("select song_tournament.complete_legacy_import($1,$2,true)",[original,oldBob]);
 assert.equal((await db.query("update song_tournament.songs set title='Blocked' where id=$1 returning *",[song])).rows.length,0);
 await identity(owner);await db.query("select song_tournament.set_member_permissions($1,$2,true,false,false)",[original,bob]);await identity(bob);
 await db.query("update song_tournament.songs set title='Edited' where id=$1",[song]);
 await deny("update song_tournament.songs set added_by_user_id=$1 where id=$2",[bob,song],/authorship/);
 await deny("insert into song_tournament.song_votes(band_id,song_id,user_id,vote) values($1,$2,$3,'yes')",[original,song,owner]);
 assert.equal((await db.query("delete from song_tournament.song_votes where user_id=$1 returning *",[owner])).rows.length,0);
 await deny("truncate song_tournament.songs cascade");await deny("update song_tournament.users set user_id=$1 where user_id=$2",[owner,bob]);
});
test("removing membership revokes access; owners cannot be removed and imports cannot be repeated after rejoining",async()=>{
 await join(bob,original);await identity(bob);await db.query("select song_tournament.complete_legacy_import($1,$2,true)",[original,oldBob]);
 await identity(owner);await deny("select song_tournament.remove_band_member($1,$2)",[original,owner]);await db.query("select song_tournament.remove_band_member($1,$2)",[original,bob]);
 await identity(bob);assert.equal((await db.query("select * from song_tournament.songs")).rows.length,0);
 await join(bob,original);await identity(bob);assert.equal((await db.query("select state from song_tournament.band_members where user_id=$1",[bob])).rows[0].state,"active");
 await deny("select song_tournament.complete_legacy_import($1,$2,true)",[original,oldBob]);
});
test("unverified and anonymous callers cannot enroll, join, or access band data",async()=>{
 await identity(unverified);await deny("select song_tournament.enroll('Unverified')");
 await identity(null,"anon");for(const table of ["users","bands","band_codes","band_members","band_join_requests","members","songs","song_votes","poll_scores"])await deny("select * from song_tournament."+table);
 await deny("select song_tournament.create_band('Anonymous')");
});

test("members manage their own songs and polls; owner-configured permissions apply immediately and can be revoked",async()=>{
 await join(bob,original);await identity(bob);await db.query("select song_tournament.complete_legacy_import($1,$2,true)",[original,oldBob]);
 const ownSong=(await db.query("insert into song_tournament.songs(band_id,title,added_by_user_id) values($1,'Mine',$2) returning id",[original,bob])).rows[0].id;
 const ownPoll=(await db.query("select song_tournament.save_poll($1,null,'My poll',$2::uuid[]) id",[original,[ownSong]])).rows[0].id;
 await db.query("update song_tournament.songs set title='Own edit' where id=$1",[ownSong]);
 await db.query("select song_tournament.save_poll($1,$2,'Own poll edit',$3::uuid[])",[original,ownPoll,[song]]);
 assert.equal((await db.query("update song_tournament.songs set title='Blocked' where id=$1 returning *",[song])).rows.length,0);
 await deny("select song_tournament.save_poll($1,$2,'Blocked',$3::uuid[])",[original,poll,[song]]);
 await deny("insert into song_tournament.sets(band_id,name,created_by_user_id) values($1,'Blocked',$2)",[original,bob]);
 await deny("select song_tournament.set_member_permissions($1,$2,true,true,true)",[original,bob]);
 await identity(owner);await db.query("select song_tournament.set_member_permissions($1,$2,true,true,true)",[original,bob]);
 await identity(bob);await db.query("update song_tournament.songs set title='Allowed' where id=$1",[song]);
 await db.query("select song_tournament.save_poll($1,$2,'Allowed',$3::uuid[])",[original,poll,[song]]);
 await db.query("insert into song_tournament.sets(band_id,name,created_by_user_id) values($1,'Allowed set',$2)",[original,bob]);
 await identity(owner);await db.query("select song_tournament.set_member_permissions($1,$2,false,false,false)",[original,bob]);
 await identity(bob);assert.equal((await db.query("delete from song_tournament.polls where id=$1 returning *",[poll])).rows.length,0);
 await db.query("delete from song_tournament.polls where id=$1",[ownPoll]);await db.query("delete from song_tournament.songs where id=$1",[ownSong]);
});
test("legacy chosen songs become Main set and the same song can appear in several independently ordered sets",async()=>{
 await identity(owner);
 const main=(await db.query("select id,name from song_tournament.sets where band_id=$1",[original])).rows[0];assert.equal(main.name,"Main set");
 assert.deepEqual((await db.query("select note,position from song_tournament.set_songs where set_id=$1",[main.id])).rows,[{note:"Legacy note",position:4}]);
 const second=(await db.query("insert into song_tournament.sets(band_id,name,created_by_user_id) values($1,'Second set',$2) returning id",[original,owner])).rows[0].id;
 const entry=(await db.query("insert into song_tournament.set_songs(band_id,set_id,song_id,note,position) values($1,$2,$3,'Second note',0) returning id",[original,second,song])).rows[0].id;
 await db.query("select song_tournament.reorder_set($1,$2,$3::uuid[])",[original,second,[entry]]);
 assert.deepEqual((await db.query("select note,position from song_tournament.set_songs where set_id=$1",[main.id])).rows,[{note:"Legacy note",position:4}]);
 await deny("update song_tournament.set_songs set set_id=$1 where id=$2",[main.id,entry]);
 await db.query("delete from song_tournament.sets where id=$1",[second]);
 assert.equal((await db.query("select id from song_tournament.songs where id=$1",[song])).rows.length,1);
 assert.equal((await db.query("select * from song_tournament.set_songs where set_id=$1",[main.id])).rows.length,1);
});
test("cross-band set references and invalid poll updates fail atomically even when the user owns both bands",async()=>{
 await identity(owner);const other=(await db.query("select song_tournament.create_band('Other') id")).rows[0].id;
 const otherSet=(await db.query("select id from song_tournament.sets where band_id=$1",[other])).rows[0].id;
 await deny("insert into song_tournament.set_songs(band_id,set_id,song_id) values($1,$2,$3)",[original,otherSet,song],/foreign key/);
 const privateSong=(await db.query("insert into song_tournament.songs(band_id,title,added_by_user_id) values($1,'Other',$2) returning id",[other,owner])).rows[0].id;
 await deny("select song_tournament.save_poll($1,$2,'Invalid',$3::uuid[])",[original,poll,[privateSong]],/this band/);
 assert.equal((await db.query("select title from song_tournament.polls where id=$1",[poll])).rows[0].title,"Original poll");
 assert.equal((await db.query("select * from song_tournament.poll_songs where poll_id=$1",[poll])).rows.length,1);
});
test("only the owner can delete a band, and deletion cascades its contents without deleting accounts or other bands",async()=>{
 await identity(bob);await deny("select song_tournament.delete_band($1,'פקטור שלילי')",[original]);
 await identity(owner);const disposable=(await db.query("select song_tournament.create_band('Disposable') id")).rows[0].id;
 await deny("select song_tournament.delete_band($1,'Wrong name')",[disposable],/exact band name/);
 await db.query("select song_tournament.delete_band($1,'Disposable')",[disposable]);
 assert.equal((await db.query("select id from song_tournament.bands where id=$1",[original])).rows.length,1);
 assert.equal((await db.query("select * from song_tournament.sets where band_id=$1",[disposable])).rows.length,0);
 assert.equal((await db.query("select * from song_tournament.users")).rows.length,1);
});
