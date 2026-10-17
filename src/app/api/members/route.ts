import { NextResponse } from "next/server";
import { getIdentity, verifyInvitation } from "@/lib/auth";
import { cleanText, jsonError, parseJson } from "@/lib/http";
import { getEnrollmentAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  const { user } = await getIdentity();
  if (!user) return jsonError("Sign in first.", 401);
  const body = await parseJson<{ name?: string; invitation?: string; claimExisting?: boolean }>(request);
  const name = cleanText(body.name);
  if (!name || name.length > 100) return jsonError("Enter a member name between 1 and 100 characters.");
  if (typeof body.invitation !== "string" || !verifyInvitation(body.invitation)) {
    return jsonError("The band invitation code did not match.", 403);
  }
  const { data, error } = await getEnrollmentAdmin().rpc("enroll", {
    p_user_id: user.id, p_name: name, p_claim_existing: body.claimExisting === true,
  });
  if (error) return jsonError(error.code === "23505"
    ? "That name is already in use. If it is your old identity, choose to link it." : error.message);
  return NextResponse.json({ memberId: data });
}
