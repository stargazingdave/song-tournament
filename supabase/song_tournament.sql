create schema if not exists song_tournament;

create extension if not exists pgcrypto;

create or replace function song_tournament.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists song_tournament.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists members_name_unique_ci
  on song_tournament.members (lower(name));

create table if not exists song_tournament.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text,
  youtube_url text,
  youtube_video_id text,
  added_by_member_id uuid references song_tournament.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint songs_youtube_video_id_format check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$')
);

-- YouTube videos are optional. These ALTER statements also update existing installs.
alter table song_tournament.songs alter column youtube_url drop not null;
alter table song_tournament.songs alter column youtube_video_id drop not null;

create table if not exists song_tournament.song_votes (
  song_id uuid not null references song_tournament.songs(id) on delete cascade,
  member_id uuid not null references song_tournament.members(id) on delete cascade,
  vote text not null check (vote in ('yes', 'no')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (song_id, member_id)
);

create table if not exists song_tournament.polls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists song_tournament.poll_songs (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references song_tournament.polls(id) on delete cascade,
  song_id uuid not null references song_tournament.songs(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (poll_id, song_id)
);

create table if not exists song_tournament.poll_scores (
  poll_id uuid not null,
  song_id uuid not null,
  member_id uuid not null references song_tournament.members(id) on delete cascade,
  score integer not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (poll_id, song_id, member_id),
  foreign key (poll_id, song_id)
    references song_tournament.poll_songs(poll_id, song_id)
    on delete cascade
);

create table if not exists song_tournament.chosen_songs (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references song_tournament.songs(id) on delete cascade,
  note text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (song_id)
);

drop trigger if exists set_songs_updated_at on song_tournament.songs;
create trigger set_songs_updated_at
before update on song_tournament.songs
for each row execute function song_tournament.set_updated_at();

drop trigger if exists set_song_votes_updated_at on song_tournament.song_votes;
create trigger set_song_votes_updated_at
before update on song_tournament.song_votes
for each row execute function song_tournament.set_updated_at();

drop trigger if exists set_polls_updated_at on song_tournament.polls;
create trigger set_polls_updated_at
before update on song_tournament.polls
for each row execute function song_tournament.set_updated_at();

drop trigger if exists set_poll_scores_updated_at on song_tournament.poll_scores;
create trigger set_poll_scores_updated_at
before update on song_tournament.poll_scores
for each row execute function song_tournament.set_updated_at();

drop trigger if exists set_chosen_songs_updated_at on song_tournament.chosen_songs;
create trigger set_chosen_songs_updated_at
before update on song_tournament.chosen_songs
for each row execute function song_tournament.set_updated_at();

alter table song_tournament.members enable row level security;
alter table song_tournament.songs enable row level security;
alter table song_tournament.song_votes enable row level security;
alter table song_tournament.polls enable row level security;
alter table song_tournament.poll_songs enable row level security;
alter table song_tournament.poll_scores enable row level security;
alter table song_tournament.chosen_songs enable row level security;

grant usage on schema song_tournament to anon, authenticated, service_role;
grant all on all tables in schema song_tournament to anon, authenticated, service_role;
grant all on all routines in schema song_tournament to anon, authenticated, service_role;
grant all on all sequences in schema song_tournament to anon, authenticated, service_role;

alter default privileges for role postgres in schema song_tournament
  grant all on tables to anon, authenticated, service_role;

alter default privileges for role postgres in schema song_tournament
  grant all on routines to anon, authenticated, service_role;

alter default privileges for role postgres in schema song_tournament
  grant all on sequences to anon, authenticated, service_role;
