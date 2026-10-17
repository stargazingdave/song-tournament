// Separate cookies keep sessions independent when both apps run on localhost.
export const authCookieOptions = { name: "song-tournament-auth", sameSite: "lax" as const };
