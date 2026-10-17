import { NextResponse } from "next/server";
import { requireBand } from "@/lib/auth";
import { jsonError, parseJson, cleanText } from "@/lib/http";
import { getSupabase } from "@/lib/supabase";
type Context={params:{setId:string}};
export async function PATCH(request:Request,{params}:Context){
  const {error:accessError,bandId}=await requireBand(request);if(accessError)return accessError;
  const body=await parseJson<{name?:string}>(request);const name=cleanText(body.name);
  if(!name || name.length>100)return jsonError("Enter a set name between 1 and 100 characters.");
  const {data,error}=await getSupabase().from("sets").update({name}).eq("band_id",bandId).eq("id",params.setId).select("id").maybeSingle();
  return error||!data ? jsonError(error?.message??"You cannot rename this set.",403) : NextResponse.json({ok:true});
}
export async function DELETE(request:Request,{params}:Context){
  const {error:accessError,bandId}=await requireBand(request);if(accessError)return accessError;
  const {data,error}=await getSupabase().from("sets").delete().eq("band_id",bandId).eq("id",params.setId).select("id").maybeSingle();
  return error||!data ? jsonError(error?.message??"You cannot delete this set.",403) : NextResponse.json({ok:true});
}
