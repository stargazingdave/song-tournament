import { jsonError } from "@/lib/http";
export async function POST() {
  return jsonError("Legacy linking has been retired. Set up your profile and request access to a band.", 410);
}
