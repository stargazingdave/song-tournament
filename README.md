# Song Tournament

A private band workspace for song ideas, votes, score polls, and a chosen-song list.

## Shared identity, separate app membership

Tasks and Song Tournament use the **same Supabase project and Auth user pool**:

| Layer | Stored in | Purpose |
| --- | --- | --- |
| Shared account | `auth.users` | Email, password, email confirmation, password recovery |
| Tasks enrollment | `tasks.users` | Tasks display name, settings, enrollment date |
| Song Tournament enrollment | `song_tournament.users` | Shared account ID, unique band member ID, settings, enrollment date |
| Band identity/history | `song_tournament.members` | Display name and existing song/vote attribution |

Create a shared account in either app, confirm the email, and use the same credentials in the other. Signing in does **not** enroll the account into an app. Tasks asks for a display name; Song Tournament asks for a member name and the band's invitation code. Profiles/settings are scoped to the app, and database row-level security enforces enrollment independently of the UI.

The two apps maintain separate sessions/cookies, including when they run on different localhost ports. Signing out ends the current app session. Changing a password changes the shared account's password across the ecosystem.

## Existing band identities

All original members, songs, votes, and scores are preserved. Existing members should:

1. Sign in with a shared account (use an existing Tasks account if available).
2. Enter their original member name and the **former shared band password**, now used as the invitation code.
3. Check **Link my existing band identity and keep my votes** and join.

Linking is atomic and one-time. A linked identity cannot be selected or claimed by another account. People without legacy history leave the checkbox unchecked to create a new identity. The invitation code authorizes enrollment and legacy claiming; distribute it only to band members. An administrator can use the schema to resolve incorrect historical associations.

## Local setup

Use Node.js 22+ and install dependencies:

```powershell
npm.cmd install
Copy-Item .env.example .env.local
```

Set:

```env
SUPABASE_URL=https://your-shared-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_SCHEMA=song_tournament
BAND_SPACE_PASSWORD=the-existing-band-password
```

Use the **same URL and publishable key as Tasks**. The secret key stays server-side and is used only for invitation-protected enrollment. All normal data access uses the signed-in user's JWT and database policies. The old `SESSION_SECRET` is no longer used.

```powershell
npm.cmd run dev -- --port 3001
```

## Database migrations

Set `DATABASE_URL` and `DATABASE_PASSWORD` locally, or load the Tasks env file when running the migration script:

```powershell
node --env-file=C:/Code/David/tasks/.env.local scripts/migrate.mjs
```

With connection settings in this app's env file:

```powershell
npm.cmd run db:migrate
```

The runner uses a transaction, advisory lock, and checksummed `song_tournament.schema_migrations` history. On an empty database it first initializes `supabase/song_tournament.sql`, then applies the migrations. For an existing installation, it applies only pending migrations. **Do not rerun the legacy bootstrap SQL on an authenticated installation**, since it contains the original broad grants.

Expose both `tasks` and `song_tournament` in the project's Data API settings. Authenticated band members share the band workspace; each member may write only their own votes and scores. Only the server enrollment RPC may create account-to-member links. Anonymous clients and accounts without band enrollment cannot read band data. Client roles have no TRUNCATE permission.

## Email and deployment configuration

In the shared project's **Authentication → URL Configuration**, allow each deployed app's callback URL and local development callbacks, including query strings used for password recovery:

- `https://<tasks-host>/auth/confirm`
- `https://<tasks-host>/auth/confirm?next=/auth/join`
- `https://<tasks-host>/auth/confirm?next=/auth/update-password`
- `https://<song-host>/auth/confirm`
- `https://<song-host>/auth/confirm?next=/auth/update-password`
- Equivalent URLs for the localhost ports you use.

The default Supabase confirmation/recovery email templates using `{{ .ConfirmationURL }}` work with the PKCE callbacks. Both apps also support templates using `token_hash` and `type` parameters. A custom template must preserve the originating app's `{{ .RedirectTo }}`; do not hardcode one app's domain for the whole ecosystem. Recovery should use `type=recovery` or preserve the callback's `next=/auth/update-password`.

Deploy the new app code with `SUPABASE_PUBLISHABLE_KEY` added to the Song Tournament deployment environment. Keep `SUPABASE_SECRET_KEY` and `BAND_SPACE_PASSWORD` server-side. Apply the migrations before deploying. No additional Supabase project is needed.

Implementation follows Supabase's [SSR authentication](https://supabase.com/docs/guides/auth/server-side/creating-a-client) and [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security) guidance.

## Verification

```powershell
npm.cmd run test:auth
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

The auth tests run real SQL in isolated PostgreSQL (PGlite), including enrollment gates, profile privacy, vote/score impersonation, legacy claims, anonymous access, and revoked broad grants.

For live HTTP verification, run Song Tournament on port 3101 and Tasks on port 3102, then:

```powershell
node --env-file=.env.local scripts/verify-auth-http.mjs
```

Override those origins with `SONG_APP_URL` and `TASKS_APP_URL` if needed. This script creates a disposable confirmed account through the admin API, tests both apps and recovery without sending emails, and removes its account/member/song fixtures in `finally`. Use a non-production instance of the new application code when running it.
