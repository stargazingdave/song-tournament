let activeSetId: string | null = null;
export function selectApiSet(id: string | null) { activeSetId = id; }
let activeBandId: string | null = null;
export function selectApiBand(id: string | null) { activeBandId = id; }
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(activeSetId ? { "X-Set-Id": activeSetId } : {}),
      ...(activeBandId ? { "X-Band-Id": activeBandId } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Something went wrong.");
  return payload as T;
}
