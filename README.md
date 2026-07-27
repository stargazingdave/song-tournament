# Band Song Selector

A private React/Next.js app for a band to collect song ideas, vote yes/no, run 1-5 score polls, and maintain a chosen-song list.

## Local Setup

1. Install dependencies:

```powershell
npm.cmd install
```

2. Copy `.env.example` to `.env.local` and fill it in:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_your-secret-key
SUPABASE_SCHEMA=song_tournament
BAND_SPACE_PASSWORD=the-password-you-send-to-the-band
SESSION_SECRET=a-long-random-string
```

3. Run the app:

```powershell
npm.cmd run dev
```

## Supabase Setup

Use your general-purpose Supabase project with the dedicated `song_tournament` schema.

1. In Supabase, open SQL Editor.
2. Run the SQL from `supabase/song_tournament.sql`.
3. In Project Settings -> API -> Exposed schemas, add `song_tournament`.
4. In Project Settings -> API Keys, copy a Secret key that starts with `sb_secret_...` into `SUPABASE_SECRET_KEY`.
5. Keep `SUPABASE_SECRET_KEY` server-side only. This app never exposes it to the browser.

The SQL enables row level security on all app tables. Because the app uses a Supabase secret key only from Next.js server code, browser users cannot read or write the tables directly.

## App Flow

- Everyone enters the same shared band password.
- After login, each person selects or creates a member identity.
- The song bank stores title, artist, YouTube link, embed id, and who added it.
- Each member can vote yes/no on each song.
- Polls contain a subset of bank songs. Each member can score every poll song from 1 to 5.
- The chosen list only promotes songs that already exist in the bank.

## Verification

```powershell
npm.cmd run typecheck
npm.cmd run build
```
