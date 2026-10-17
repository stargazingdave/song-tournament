import { NextResponse } from "next/server";
import { requireBand } from "@/lib/auth";
import { jsonError, parseJson, cleanText } from "@/lib/http";
import { getSupabase } from "@/lib/supabase";
export async function POST(request: Request) {
  const { error: accessError, bandId, userId } = await requireBand(request);
  if (accessError) return accessError;
  const body = await parseJson<{ name?: string }>(request);
  const name=cleanText(body.name);
  if(!name || name.length>100) return jsonError("Enter a set name between 1 and 100 characters.");
  const { data,error }=await (await getSupabase()).from("sets").insert({band_id:bandId,name,created_by_user_id:userId}).select("id").single();
  return error ? jsonError(error.message,403) : NextResponse.json({setId:data.id});
}
