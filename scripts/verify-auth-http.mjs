import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const songUrl = process.env.SONG_APP_URL || "http://localhost:3101";
const tasksUrl = process.env.TASKS_APP_URL || "http://localhost:3102";
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const email = "auth-validation-" + randomUUID() + "@example.invalid";
const password = randomBytes(32).toString("base64url");
const jar = new Map();
let userId, memberId, songId;
function checked(result) { if(result.error) throw new Error(result.error.message); return result.data; }
async function request(path, body, expected = 200) {
  const response = await fetch(new URL(path,songUrl), {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type":"application/json", Cookie:[...jar].map(([k,v])=>k+"="+v).join(";") },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  for(const cookie of response.headers.getSetCookie()) {
    const pair=cookie.split(";")[0], index=pair.indexOf("=");
    jar.set(pair.slice(0,index),pair.slice(index+1));
  }
  const payload = await response.json();
  assert.equal(response.status,expected, path + ": " + (payload.error || "unexpected response"));
  return payload;
}
try {
  userId = checked(await admin.auth.admin.createUser({ email,password,email_confirm:true })).user.id;
  assert.ok(userId);

  assert.equal((await request("/api/state")).authenticated,false);
  assert.equal((await fetch(songUrl+"/api/login",{method:"POST",headers:{"Content-Type":"application/json",Origin:"https://example.invalid"},body:JSON.stringify({email,password})})).status,403);
  assert.equal((await fetch(songUrl+"/api/login",{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify({email,password})})).status,415);
  console.log("PASS auth mutations reject foreign origins and non-JSON form submissions");
  await request("/api/login",{email,password:"incorrect"},401);
  await request("/api/login",{email,password});
  let state = await request("/api/state");
  assert.equal(state.authenticated,true); assert.equal(state.selectedMemberId,null);
  assert.equal(state.members.length,0); assert.equal(state.songs.length,0);
  assert.equal(checked(await admin.schema("tasks").from("users").select("user_id").eq("user_id",userId)).length,0);
  console.log("PASS email/password login creates a session without automatically joining either app");

  await request("/api/members",{name:"Validation "+userId,invitation:"incorrect"},403);
  memberId = (await request("/api/members",{name:"Validation "+userId,invitation:process.env.BAND_SPACE_PASSWORD})).memberId;
  assert.ok(memberId);
  jar.set("band_member_id",randomUUID()); jar.set("band_session","forged-old-session");
  state=await request("/api/state");
  assert.equal(state.selectedMemberId,memberId);
  await request("/api/members/select",{memberId:randomUUID()},403);
  console.log("PASS invitation enrollment succeeds and forged legacy identity cookies are ignored");

  const song=await request("/api/songs",{title:"__auth_validation_"+userId});
  songId=song.song.id;
  const voteResponse=await fetch(new URL("/api/songs/"+songId+"/vote",songUrl),{
    method:"PUT",headers:{"Content-Type":"application/json",Cookie:[...jar].map(([k,v])=>k+"="+v).join(";")},
    body:JSON.stringify({vote:"yes",memberId:randomUUID()}),
  });
  assert.equal(voteResponse.status,200);
  const votes=checked(await admin.schema("song_tournament").from("song_votes").select("member_id").eq("song_id",songId));
  assert.deepEqual(votes,[{member_id:memberId}]);
  console.log("PASS API derives voting identity from the signed-in app membership");

  const taskJar = new Map();
  const tasks = createServerClient(url,key,{cookies:{
    getAll:()=>[...taskJar].map(([name,value])=>({name,value})),
    setAll:values=>values.forEach(({name,value})=>taskJar.set(name,value)),
  }});
  checked(await tasks.auth.signInWithPassword({email,password}));
  const cookie=()=>[...taskJar].map(([k,v])=>k+"="+v).join(";");
  const home=await fetch(tasksUrl,{headers:{Cookie:cookie()},redirect:"manual"});
  const homeText = await home.text();
  const location = home.headers.get("location");
  assert.ok(location ? new URL(location,tasksUrl).pathname === "/auth/join" : homeText.includes("NEXT_REDIRECT;replace;/auth/join;"), "Tasks must redirect unenrolled account to onboarding");
  checked(await tasks.schema("tasks").rpc("enroll",{p_display_name:"Validation"}));
  const enrolled=await fetch(tasksUrl,{headers:{Cookie:cookie()},redirect:"manual"});
  assert.equal(enrolled.status,200);
  await enrolled.text();
  console.log("PASS the same credentials work in Tasks, with a separate enrollment requirement");

  for(const [app,base] of [["Song Tournament",songUrl],["Tasks",tasksUrl]]) {
    const target=base+"/auth/confirm?next=/auth/update-password";
    const link=checked(await admin.auth.admin.generateLink({type:"recovery",email,options:{redirectTo:target}}));
    const verified = await fetch(link.properties.action_link, { redirect: "manual" });
    const actual = new URL(verified.headers.get("location"));
    assert.equal(actual.origin + actual.pathname, base + "/auth/confirm", "Email verification must return to the originating app");
    console.log("PASS " + app + " email verification returns to its own callback URL");
  }

  await request("/api/logout",{});
  assert.equal((await request("/api/state")).authenticated,false);
  await request("/api/songs",{title:"blocked"},401);
  console.log("PASS logout removes access and protected endpoints reject signed-out requests");

  const recovery = checked(await admin.auth.admin.generateLink({type:"recovery",email}));
  const callback = await fetch(songUrl + "/auth/confirm?token_hash=" + encodeURIComponent(recovery.properties.hashed_token) + "&type=recovery&next=https://example.invalid", {redirect:"manual"});
  assert.equal(new URL(callback.headers.get("location")).pathname,"/auth/update-password");
  for(const cookie of callback.headers.getSetCookie()) {
    const pair=cookie.split(";")[0],index=pair.indexOf("=");jar.set(pair.slice(0,index),pair.slice(index+1));
  }
  assert.equal((await request("/api/state")).authenticated,true);
  const newPassword=randomBytes(32).toString("base64url");
  await request("/api/password/update",{password:newPassword});
  const sharedLogin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  checked(await sharedLogin.auth.signInWithPassword({email,password:newPassword}));
  checked(await sharedLogin.auth.signOut({scope:"local"}));
  console.log("PASS recovery callback establishes a session, rejects external redirects, and updates the shared password");

  const taskRecovery=checked(await admin.auth.admin.generateLink({type:"recovery",email}));
  const taskCallback=await fetch(tasksUrl+"/auth/confirm?token_hash="+encodeURIComponent(taskRecovery.properties.hashed_token)+"&type=recovery",{redirect:"manual"});
  assert.equal(new URL(taskCallback.headers.get("location"),tasksUrl).pathname,"/auth/update-password");
  assert.ok(taskCallback.headers.getSetCookie().length);
  console.log("PASS Tasks also accepts verified email tokens and directs recovery to password update");
} catch(error) {
  console.error(error instanceof Error ? error.message : "HTTP validation failed");
  process.exitCode=1;
} finally {
  if(songId) checked(await admin.schema("song_tournament").from("songs").delete().eq("id",songId));
  if(userId) checked(await admin.auth.admin.deleteUser(userId));
  if(memberId) checked(await admin.schema("song_tournament").from("members").delete().eq("id",memberId));
  console.log("Removed all temporary validation identities and data. No emails were sent.");
}
