# Song Tournament

Song collection, voting, score polls, and named sets for multiple private bands.

## Accounts and profiles

Tasks and Song Tournament share Supabase Auth. An email/password account created in either app works in both. Signup collects a display name; each app still requires its own profile enrollment. Song Tournament stores its profile and settings in `song_tournament.users`, independently of `tasks.users`.

App profiles use user IDs directly. The old shared-password login and free-text legacy identity linking have been retired. `BAND_SPACE_PASSWORD` and `SESSION_SECRET` are no longer used. Normal requests use the signed-in user's JWT and row-level security, including all band boundaries.

## Bands and membership

A user can create and join multiple bands. Creating a band makes that user its owner and creates its first **Main set**. Use the band selector to switch workspaces; **Bands** opens creation, join requests, member permissions, codes, and owner controls.

The owner copies a random band code to share it. Entering a current code creates a **pending request**. It grants no access to songs, polls, sets, or legacy migration options. The owner must approve the request. Owners can regenerate/rotate codes; previous codes immediately stop accepting new requests. Already submitted requests and existing memberships remain intact.

Only the owner can approve/reject requests, rotate codes, rename/delete the band, remove other users, and configure additional permissions. Non-owners may leave. Owners cannot leave or be removed; they can permanently delete their band with the exact-name confirmation.

| Operation | Basic member | Additional permission | Owner |
| --- | --- | --- | --- |
| Read band data, vote, and score as themselves | Yes | — | Yes |
| Add songs and create polls | Yes | — | Yes |
| Edit/delete their own songs and polls | Yes | — | Yes |
| Edit/delete others' songs | No | Manage others' songs | Yes |
| Edit/delete others' polls | No | Manage others' polls | Yes |
| Create/rename/delete sets; add/remove/reorder songs | No | Manage sets | Yes |
| Manage membership, permissions, codes, or delete band | No | — | Yes |

Additional permissions are configured **per member, per band**. Revoking membership or a permission takes effect at the database boundary. A user belonging to two bands cannot move songs, polls, or set entries across those bands.

## Sets

Each band can have several named sets. Each set has independent song order and notes. A song may appear once in each of several sets. Adding a song to a set does not remove it from the song bank. Removing a set or a set entry does not delete the underlying songs.

The former chosen/winners list was converted into the original band's **Main set**, retaining entries, notes, and order. Poll updates and set reordering use atomic database functions so invalid or stale requests do not partially change data.

## One-time legacy migration

`members` is now a migration source only. Normal identities, permissions, songs, and polls use application users and band memberships. The old band's data was assigned to **פקטור שלילי**, with the sole previously linked account as its sole owner/member. That account's existing attribution, votes, and scores were migrated automatically, and its old `members` row was deleted.

For other people entering that band:

1. Create/sign into a shared account and set up the Song Tournament profile.
2. Submit the band's current code and wait for owner approval.
3. On first entry, select one of the remaining legacy members from the required select.
4. Acknowledge the **permanent and final** warning and confirm.
5. The database atomically transfers votes, scores, and song attribution to the user, records the completed import, deletes the source member row, and enables band access.

There is no skip or free-text alternative while legacy members remain. A claimed member disappears from the options. A user cannot claim twice, including after leaving and rejoining. Unclaimed historical votes and scores remain included in totals until transferred. After the last legacy member is migrated, the mandatory migration prompt retires automatically; future approved members join normally.

## Database model

All application tables are in `song_tournament`:

- `users`: app profile, display name, settings.
- `bands`, `band_codes`: owned workspace and owner-visible rotating code.
- `band_members`: user/band relationship, migration status, additional permissions.
- `band_join_requests`: pending/approved/rejected requests.
- `songs`, `polls`, `poll_songs`, `song_votes`, `poll_scores`: band-scoped content and direct user attribution.
- `sets`, `set_songs`: named sets and their independent entries/order/notes.
- `members`, `legacy_imports`: remaining migration sources and final import records.

The nullable legacy attribution columns exist only for unclaimed migration data. Applications cannot write them. Clients cannot directly change band ownership, membership, permissions, or migration records.

## Setup and migrations

Use Node.js 22+, install dependencies, and copy `.env.example` to `.env.local`.

Required runtime configuration:

```env
SUPABASE_URL=https://your-shared-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SCHEMA=song_tournament
```

Use the same URL and publishable key as Tasks. A secret key is needed only for administrative verification scripts, never by the normal app runtime. Keep database credentials and secret keys server-side.

Expose `tasks` and `song_tournament` in the shared project's Data API settings. Allow each app's `/auth/confirm` URL, including signup/recovery query strings, under Authentication → URL Configuration. Default Supabase templates using `{{ .ConfirmationURL }}` work; custom templates must preserve the originating app's `{{ .RedirectTo }}`. Recovery should preserve `next=/auth/update-password` or use `type=recovery`.

Apply migrations with connection settings in this app's env:

```powershell
npm.cmd run db:migrate
```

Or reuse Tasks' connection settings:

```powershell
node --env-file=C:/Code/David/tasks/.env.local scripts/migrate.mjs
```

The runner uses a transaction, advisory lock, and checksummed migration history. On a fresh database it initializes the legacy bootstrap, then applies all migrations. Do not rerun the bootstrap SQL separately on an upgraded installation.

```powershell
npm.cmd run dev -- --port 3001
```

If another Next.js 14 server/build is using this checkout, isolate generated files:

```powershell
$env:NEXT_DIST_DIR='.next-auth-check'
npm.cmd run dev -- --port 3101
```

## Verification

```powershell
npm.cmd run test:auth
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Tests execute the real migrations in isolated PGlite PostgreSQL databases. They cover migration preservation, approval gates, anonymous access, own-content permissions, configurable rights and revocation, cross-band constraints, named sets, atomic poll editing, and band deletion.

Run Song Tournament on port 3101 and Tasks on port 3102, then:

```powershell
node --env-file=.env.local scripts/verify-auth-http.mjs
```

The HTTP verifier uses disposable confirmed accounts and bands, exercises a disposable legacy migration and all main permission/set flows, and cleans up its fixtures without sending emails. Override `SONG_APP_URL`/`TASKS_APP_URL` for other local ports. The Tasks repo also provides a rollback-only cross-app database verifier.
