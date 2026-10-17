import assert from "node:assert/strict";
import { randomUUID,randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
const base=process.env.SONG_APP_URL||"http://localhost:3101",tasksBase=process.env.TASKS_APP_URL||"http://localhost:3102";
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
const admin=createClient(url,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const users=[],bands=[];
function checked(r){if(r.error)throw new Error(r.error.message);return r.data;}
function client(){
 const jar=new Map();return {band:null,set:null,jar,async request(path,method="GET",body,expected=200){
  const response=await fetch(base+path,{method,headers:{"Content-Type":"application/json",Cookie:[...jar].map(([k,v])=>k+"="+v).join(";"),...(this.band?{"X-Band-Id":this.band}:{}),...(this.set?{"X-Set-Id":this.set}:{})},body:body===undefined?undefined:JSON.stringify(body),redirect:"manual"});
  for(const raw of response.headers.getSetCookie()){const pair=raw.split(";")[0],i=pair.indexOf("=");jar.set(pair.slice(0,i),pair.slice(i+1));}
  const text=await response.text();let payload;try{payload=JSON.parse(text);}catch{throw new Error(path+": expected JSON, received HTTP "+response.status);}
  assert.equal(response.status,expected,path+": "+(payload.error??"unexpected response"));return payload;
 }};
}
try{
 const accounts=[];
 for(const name of ["Owner","Member"]){
  const email="bands-validation-"+randomUUID()+"@example.invalid",password=randomBytes(32).toString("base64url");
  const user=checked(await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:name}})).user;
  users.push(user.id);const http=client();await http.request("/api/login","POST",{email,password});
  const state=await http.request("/api/state");assert.equal(state.profile,null);assert.equal(state.suggestedDisplayName,name);
  await http.request("/api/profile","POST",{displayName:name});
  accounts.push({id:user.id,email,password,http});
 }
 const [owner,member]=accounts;
 await owner.http.request("/api/signup","POST",{email:"no-send@example.invalid",password:"long-password"},400);
 await owner.http.request("/api/members","POST",{},410);
 const band=(await owner.http.request("/api/bands","POST",{name:"__bands_validation__"})).bandId;bands.push(band);owner.http.band=band;
 let state=await owner.http.request("/api/state");assert.equal(state.bands.length,1);assert.ok(state.bandCode);assert.equal(state.sets[0].name,"Main set");
 const main=state.sets[0].id,oldCode=state.bandCode;owner.http.set=main;
 const song=(await owner.http.request("/api/songs","POST",{title:"Owner song"})).song.id;
 const poll=(await owner.http.request("/api/polls","POST",{title:"Owner poll",songIds:[song]})).pollId;
 // A disposable legacy source exercises the one-time migration without touching real band data.
 const legacy=checked(await admin.schema("song_tournament").from("members").insert({band_id:band,name:"__legacy_"+randomUUID()}).select("id").single()).id;
 checked(await admin.schema("song_tournament").from("bands").update({requires_legacy_import:true}).eq("id",band));
 checked(await admin.schema("song_tournament").from("song_votes").insert({band_id:band,song_id:song,legacy_member_id:legacy,vote:"yes"}));
 await member.http.request("/api/bands/join","POST",{code:oldCode});member.http.band=band;
 state=await member.http.request("/api/state");assert.equal(state.bands[0].membership_status,"pending");assert.equal(state.songs.length,0);
 await member.http.request("/api/bands/"+band+"/requests","POST",{userId:member.id,approve:true},403);
 await owner.http.request("/api/bands/"+band+"/requests","POST",{userId:member.id,approve:true});
 state=await member.http.request("/api/state");assert.equal(state.bands[0].membership_status,"migration_required");assert.equal(state.songs.length,0);
 assert.deepEqual(state.legacyOptions.map(x=>x.id),[legacy]);
 await member.http.request("/api/bands/"+band+"/import","POST",{confirmed:true},400);
 await member.http.request("/api/bands/"+band+"/import","POST",{memberId:legacy,confirmed:false},400);
 await member.http.request("/api/bands/"+band+"/import","POST",{memberId:legacy,confirmed:true});
 state=await member.http.request("/api/state");assert.equal(state.bands[0].membership_status,"active");assert.equal(state.songs[0].current_user_vote,"yes");assert.equal(state.canManageSets,false);
 assert.equal(checked(await admin.schema("song_tournament").from("members").select("id").eq("id",legacy)).length,0);
 await member.http.request("/api/bands/"+band+"/import","POST",{memberId:legacy,confirmed:true},409);
 console.log("PASS owner-approved requests, mandatory selection, final migration, legacy-row deletion, and replay protection");

 const memberSong=(await member.http.request("/api/songs","POST",{title:"Member song"})).song.id;
 const memberPoll=(await member.http.request("/api/polls","POST",{title:"Member poll",songIds:[memberSong]})).pollId;
 await member.http.request("/api/songs/"+memberSong,"PATCH",{title:"Own edit"});
 await member.http.request("/api/polls/"+memberPoll,"PATCH",{title:"Own edit",songIds:[memberSong]});
 await member.http.request("/api/songs/"+song,"PATCH",{title:"Blocked"},403);
 await member.http.request("/api/polls/"+poll,"PATCH",{title:"Blocked",songIds:[song]},403);
 await member.http.request("/api/sets","POST",{name:"Blocked"},403);
 await member.http.request("/api/bands/"+band+"/people","PATCH",{userId:member.id,songs:true,polls:true,sets:true},403);
 await owner.http.request("/api/bands/"+band+"/people","PATCH",{userId:member.id,songs:true,polls:true,sets:true});
 await member.http.request("/api/songs/"+song,"PATCH",{title:"Permitted edit"});
 await member.http.request("/api/polls/"+poll,"PATCH",{title:"Permitted edit",songIds:[song]});
 console.log("PASS default own-content permissions and owner-controlled grants");

 const secondSet=(await member.http.request("/api/sets","POST",{name:"Second set"})).setId;
 await owner.http.request("/api/sets/"+main+"/songs","POST",{songId:song,note:"Main note"});
 const secondEntry=(await member.http.request("/api/sets/"+secondSet+"/songs","POST",{songId:song,note:"Second note"})).entry.id;
 member.http.set=secondSet;state=await member.http.request("/api/state");assert.equal(state.setSongs.length,1);assert.equal(state.setSongs[0].note,"Second note");
 owner.http.set=main;state=await owner.http.request("/api/state");assert.equal(state.setSongs[0].note,"Main note");
 await member.http.request("/api/sets/"+secondSet+"/reorder","PUT",{orderedIds:[secondEntry]});
 await member.http.request("/api/sets/"+secondSet,"PATCH",{name:"Renamed set"});
 const other=(await member.http.request("/api/bands","POST",{name:"__other_validation__"})).bandId;bands.push(other);member.http.band=other;
 state=await member.http.request("/api/state");assert.equal(state.songs.length,0);assert.equal(state.setSongs.length,0);
 await member.http.request("/api/songs/"+song,"PATCH",{title:"Wrong band"},403);
 await member.http.request("/api/sets/"+secondSet,"PATCH",{name:"Wrong band"},403);
 member.http.band=band;
 await member.http.request("/api/bands/"+band,"DELETE",{confirmationName:"__bands_validation__",confirmed:true},403);
 await owner.http.request("/api/bands/"+band+"/people","PATCH",{userId:member.id,songs:false,polls:false,sets:false});
 await member.http.request("/api/sets/"+secondSet,"PATCH",{name:"Revoked"},403);
 await owner.http.request("/api/bands/"+band+"/code","POST",{});
 await member.http.request("/api/bands/join","POST",{code:oldCode},400);
 console.log("PASS named sets, independent notes/order, band isolation, code rotation, and immediate permission revocation");

 const taskJar=new Map();const tasks=createServerClient(url,key,{cookies:{getAll:()=>[...taskJar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>taskJar.set(name,value))}});
 checked(await tasks.auth.signInWithPassword({email:owner.email,password:owner.password}));
 const home=await fetch(tasksBase,{headers:{Cookie:[...taskJar].map(([k,v])=>k+"="+v).join(";")},redirect:"manual"});const html=await home.text();
 assert.ok(home.headers.get("location")?.includes("/auth/join")||html.includes("NEXT_REDIRECT;replace;/auth/join;"));
 checked(await tasks.schema("tasks").rpc("enroll",{p_display_name:"Validation"}));
 console.log("PASS shared credentials still require separate Tasks enrollment");

 await owner.http.request("/api/bands/"+band+"/people","DELETE",{userId:member.id});
 state=await member.http.request("/api/state");assert.equal(state.songs.some(s=>s.id===song),false);
 await owner.http.request("/api/bands/"+band,"DELETE",{confirmationName:"__bands_validation__",confirmed:true});
 bands.splice(bands.indexOf(band),1);
 await owner.http.request("/api/logout","POST",{});
 assert.equal((await owner.http.request("/api/state")).authenticated,false);
 console.log("PASS membership removal, owner-only band deletion, and logout");

 const recovery=checked(await admin.auth.admin.generateLink({type:"recovery",email:owner.email}));
 const callback=await fetch(base+"/auth/confirm?token_hash="+encodeURIComponent(recovery.properties.hashed_token)+"&type=recovery&next=https://example.invalid",{redirect:"manual"});
 assert.equal(new URL(callback.headers.get("location"),base).pathname,"/auth/update-password");
 console.log("PASS recovery callback still works and ignores external redirect targets");
}catch(error){console.error(error.message);process.exitCode=1;}
finally{
 let failed=false;
 for(const id of bands){const result=await admin.schema("song_tournament").from("bands").delete().eq("id",id);if(result.error){console.error("Band cleanup failed: "+result.error.message);failed=true;}}
 for(const id of users){const result=await admin.auth.admin.deleteUser(id);if(result.error){console.error("Account cleanup failed: "+result.error.message);failed=true;}}
 if(failed)process.exitCode=1;else console.log("Removed all disposable accounts, bands, and fixtures. No emails were sent.");
}
