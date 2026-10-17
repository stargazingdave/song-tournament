import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/http";
import { getSupabase } from "@/lib/supabase";

export async function PUT(request: Request) {
  const { error: memberError } = await requireMember();
  if (memberError) return memberError;

  const body = await parseJson<{ orderedIds?: string[] }>(request);
  const orderedIds = Array.isArray(body.orderedIds) ? body.orderedIds.filter(Boolean) : [];

  if (!orderedIds.length) return jsonError("Chosen song order is required.");

  const supabase = getSupabase();
  const updates = await Promise.all(
    orderedIds.map((id, position) =>
      supabase
        .from("chosen_songs")
        .update({ position, updated_at: new Date().toISOString() })
        .eq("id", id)
    )
  );

  const failure = updates.find((result) => result.error);
  if (failure?.error) return jsonError(failure.error.message, 400);

  return NextResponse.json({ ok: true });
}
