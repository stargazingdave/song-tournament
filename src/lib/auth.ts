import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { requiredEnv } from "@/lib/env";
import { jsonError } from "@/lib/http";

const SESSION_COOKIE = "band_session";
const MEMBER_COOKIE = "band_member_id";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function sign(value: string) {
  return createHmac("sha256", requiredEnv("SESSION_SECRET")).update(value).digest("base64url");
}

function constantEquals(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyPassword(password: string) {
  return constantEquals(password, requiredEnv("BAND_SPACE_PASSWORD"));
}

export function createSessionToken() {
  const payload = Buffer.from(
    JSON.stringify({
      id: randomUUID(),
      createdAt: Date.now()
    })
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export function isAuthenticated() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  return constantEquals(signature, sign(payload));
}

export function selectedMemberId() {
  return cookies().get(MEMBER_COOKIE)?.value ?? null;
}

export function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/"
  });
}

export function clearSessionCookies() {
  cookies().delete(SESSION_COOKIE);
  cookies().delete(MEMBER_COOKIE);
}

export function clearMemberCookie() {
  cookies().delete(MEMBER_COOKIE);
}

export function setMemberCookie(memberId: string) {
  cookies().set(MEMBER_COOKIE, memberId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/"
  });
}

export function requireAuth() {
  if (!isAuthenticated()) {
    return jsonError("Enter the band password first.", 401);
  }

  return null;
}

export function requireMember() {
  const authError = requireAuth();
  if (authError) return { error: authError, memberId: null };

  const memberId = selectedMemberId();
  if (!memberId) {
    return { error: jsonError("Choose or create your member identity first.", 403), memberId: null };
  }

  return { error: null, memberId };
}
