import { NextResponse } from "next/server";
import { requireBand } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/http";
import { getSupabase } from "@/lib/supabase";
export async function PUT(request:Request,{params}:{params:{setId:string}}){
  const {error:accessError,bandId}=await requireBand(request);if(accessError)return accessError;
  const body=await parseJson<{orderedIds?:string[]}>(request);
  const {error}=await getSupabase().rpc("reorder_set",{p_band_id:bandId,p_set_id:params.setId,p_entry_ids:body.orderedIds??[]});
  return error ? jsonError(error.message,error.code==="42501"?403:409) : NextResponse.json({ok:true});
}
