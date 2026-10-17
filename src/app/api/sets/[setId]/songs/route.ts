import { NextResponse } from "next/server";
import { requireBand } from "@/lib/auth";
import { jsonError, parseJson, cleanText } from "@/lib/http";
import { getSupabase } from "@/lib/supabase";
export async function POST(request:Request,{params}:{params: Promise<{setId:string}>}){
  const {error:accessError,bandId}=await requireBand(request);if(accessError)return accessError;
  const body=await parseJson<{songId?:string;note?:string}>(request);
  const supabase=(await getSupabase());
  const {count,error:countError}=await supabase.from("set_songs").select("id",{count:"exact",head:true}).eq("band_id",bandId).eq("set_id",(await params).setId);
  if(countError)return jsonError(countError.message,400);
  const {data,error}=await supabase.from("set_songs").insert({band_id:bandId,set_id:(await params).setId,song_id:cleanText(body.songId),note:cleanText(body.note)||null,position:count??0}).select("*").single();
  return error ? jsonError(error.code==="23505"?"That song is already in this set.":error.message,error.code==="42501"?403:400) : NextResponse.json({entry:data});
}
