import { jsonError } from "@/lib/http";

export async function POST() {
  return jsonError("Band identities are linked to accounts. Sign out to use a different account.", 403);
}
