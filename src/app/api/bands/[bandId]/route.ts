import { NextResponse } from "next/server";
import { getIdentity } from "@/lib/auth";
import { cleanText, jsonError, parseJson } from "@/lib/http";
export async function PATCH(request: Request, { params }: { params: Promise<{ bandId: string }> }) {
  const { supabase, profile } = await getIdentity();
  if (!profile) return jsonError("Sign in first.", 401);
  const body = await parseJson<{ name?: string }>(request);
  const { error } = await supabase.rpc("rename_band", { p_band_id: (await params).bandId, p_name: cleanText(body.name) });
  return error ? jsonError(error.message, 403) : NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ bandId: string }> }) {
  const { supabase, profile }=await getIdentity();if(!profile)return jsonError("Sign in first.",401);
  const body=await parseJson<{confirmationName?:string;confirmed?:boolean}>(request);
  if(body.confirmed!==true || typeof body.confirmationName!=="string")return jsonError("Confirm permanent band deletion with its exact name.");
  const {error}=await supabase.rpc("delete_band",{p_band_id:(await params).bandId,p_confirmation_name:body.confirmationName});
  return error ? jsonError(error.message,403) : NextResponse.json({ok:true});
}
