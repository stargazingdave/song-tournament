import { NextResponse } from "next/server";
import { requireBand } from "@/lib/auth";
import { jsonError, parseJson, cleanText } from "@/lib/http";
import { getSupabase } from "@/lib/supabase";
type Context={params: Promise<{setId:string;entryId:string}>};
export async function PATCH(request:Request,{params}:Context){
  const {error:accessError,bandId}=await requireBand(request);if(accessError)return accessError;
  const body=await parseJson<{note?:string}>(request);
  const {data,error}=await (await getSupabase()).from("set_songs").update({note:cleanText(body.note)||null}).eq("band_id",bandId).eq("set_id",(await params).setId).eq("id",(await params).entryId).select("id").maybeSingle();
  return error||!data ? jsonError(error?.message??"You cannot edit this set.",403) : NextResponse.json({ok:true});
}
export async function DELETE(request:Request,{params}:Context){
  const {error:accessError,bandId}=await requireBand(request);if(accessError)return accessError;
  const {data,error}=await (await getSupabase()).from("set_songs").delete().eq("band_id",bandId).eq("set_id",(await params).setId).eq("id",(await params).entryId).select("id").maybeSingle();
  return error||!data ? jsonError(error?.message??"You cannot edit this set.",403) : NextResponse.json({ok:true});
}
