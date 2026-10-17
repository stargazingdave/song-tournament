-- All application ownership and access stays inside song_tournament.
-- The members table is retained exclusively as a finite migration source.
do $$
begin
  if (select count(*) from song_tournament.users) > 1 then
    raise exception 'Expected at most one linked account before migrating the original band.';
  end if;
  if exists (select 1 from song_tournament.members) and not exists (select 1 from song_tournament.users) then
    raise exception 'Link the original band owner before migrating legacy data.';
  end if;
end;
$$;

do $$
declare p record;
begin
  for p in select tablename, policyname from pg_policies where schemaname = 'song_tournament' loop
    execute format('drop policy %I on song_tournament.%I', p.policyname, p.tablename);
  end loop;
end;
$$;
drop trigger guard_song_author on song_tournament.songs;
drop function song_tournament.guard_song_author();
drop function song_tournament.current_member_id();
drop function song_tournament.enroll(uuid, text, boolean);

alter table song_tournament.users add column display_name text;
update song_tournament.users u set display_name = m.name from song_tournament.members m where m.id = u.member_id;
alter table song_tournament.users alter column display_name set not null;
alter table song_tournament.users add constraint users_display_name_check check (length(btrim(display_name)) between 1 and 100);

create table song_tournament.bands (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 100),
  owner_user_id uuid not null references song_tournament.users(user_id),
  requires_legacy_import boolean not null default false,
  created_at timestamptz not null default now()
);
create table song_tournament.band_codes (
  band_id uuid primary key references song_tournament.bands(id) on delete cascade,
  code text not null unique default upper(replace(gen_random_uuid()::text, '-', '')),
  rotated_at timestamptz not null default now()
);
create table song_tournament.band_members (
  band_id uuid not null references song_tournament.bands(id) on delete cascade,
  user_id uuid not null references song_tournament.users(user_id) on delete cascade,
  state text not null check (state in ('active', 'migration_required')),
  can_manage_others_songs boolean not null default false,
  can_manage_others_polls boolean not null default false,
  can_manage_sets boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (band_id, user_id)
);
create index band_members_user_idx on song_tournament.band_members(user_id, band_id);
create table song_tournament.band_join_requests (
  band_id uuid not null references song_tournament.bands(id) on delete cascade,
  user_id uuid not null references song_tournament.users(user_id) on delete cascade,
  status text not null check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  primary key (band_id, user_id)
);
create index band_requests_user_idx on song_tournament.band_join_requests(user_id, band_id);
create table song_tournament.sets (
  id uuid primary key default gen_random_uuid(),
  band_id uuid not null references song_tournament.bands(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  created_by_user_id uuid references song_tournament.users(user_id) on delete set null,
  created_at timestamptz not null default now(),
  unique(id, band_id)
);
create index sets_band_idx on song_tournament.sets(band_id);
create table song_tournament.legacy_imports (
  band_id uuid not null references song_tournament.bands(id) on delete cascade,
  user_id uuid not null references song_tournament.users(user_id) on delete cascade,
  legacy_member_id uuid not null unique,
  legacy_name text not null,
  imported_at timestamptz not null default now(),
  primary key (band_id, user_id)
);

-- Existing linked account becomes the sole owner of the original workspace.
insert into song_tournament.bands(name, owner_user_id, requires_legacy_import)
select 'פקטור שלילי', user_id, true from song_tournament.users;
insert into song_tournament.band_codes(band_id) select id from song_tournament.bands;
insert into song_tournament.band_members(band_id, user_id, state)
select id, owner_user_id, 'migration_required' from song_tournament.bands;

insert into song_tournament.sets(band_id, name, created_by_user_id)
select id, 'Main set', owner_user_id from song_tournament.bands;
alter table song_tournament.chosen_songs rename to set_songs;
alter table song_tournament.set_songs drop constraint chosen_songs_song_id_key;

do $$
declare t text;
begin
  foreach t in array array['members','songs','song_votes','polls','poll_songs','poll_scores','set_songs'] loop
    execute format('alter table song_tournament.%I add column band_id uuid references song_tournament.bands(id) on delete cascade', t);
    execute format('update song_tournament.%I set band_id = (select id from song_tournament.bands limit 1)', t);
    execute format('alter table song_tournament.%I alter column band_id set not null', t);
    execute format('create index %I on song_tournament.%I(band_id)', t || '_band_idx', t);
  end loop;
end;
$$;

alter table song_tournament.set_songs add column set_id uuid;
update song_tournament.set_songs s set set_id = (select id from song_tournament.sets where band_id = s.band_id limit 1);
alter table song_tournament.set_songs alter column set_id set not null;
alter table song_tournament.set_songs add constraint set_songs_set_song_key unique(set_id, song_id);
alter table song_tournament.set_songs add constraint set_songs_same_band_set
  foreign key(set_id, band_id) references song_tournament.sets(id, band_id) on delete cascade;

alter table song_tournament.songs rename column added_by_member_id to legacy_added_by_member_id;
alter table song_tournament.songs add column added_by_user_id uuid references song_tournament.users(user_id) on delete set null;
alter table song_tournament.songs add column added_by_name_snapshot text;
update song_tournament.songs s set added_by_name_snapshot = m.name
  from song_tournament.members m where m.id = s.legacy_added_by_member_id;
alter table song_tournament.songs add constraint songs_id_band_key unique(id, band_id);
alter table song_tournament.polls add constraint polls_id_band_key unique(id, band_id);
alter table song_tournament.polls add column created_by_user_id uuid references song_tournament.users(user_id) on delete set null;
update song_tournament.polls set created_by_user_id = (select owner_user_id from song_tournament.bands limit 1);
alter table song_tournament.poll_songs add constraint poll_songs_band_key unique(poll_id, song_id, band_id);
alter table song_tournament.poll_songs add constraint poll_songs_same_band_poll
  foreign key (poll_id, band_id) references song_tournament.polls(id, band_id) on delete cascade;
alter table song_tournament.poll_songs add constraint poll_songs_same_band_song
  foreign key (song_id, band_id) references song_tournament.songs(id, band_id) on delete cascade;
alter table song_tournament.set_songs add constraint set_songs_same_band
  foreign key (song_id, band_id) references song_tournament.songs(id, band_id) on delete cascade;

alter table song_tournament.song_votes drop constraint song_votes_pkey;
alter table song_tournament.song_votes rename column member_id to legacy_member_id;
alter table song_tournament.song_votes alter column legacy_member_id drop not null;
alter table song_tournament.song_votes add column id uuid primary key default gen_random_uuid();
alter table song_tournament.song_votes add column user_id uuid references song_tournament.users(user_id) on delete cascade;
alter table song_tournament.song_votes add constraint song_votes_user_key unique(song_id, user_id);
alter table song_tournament.song_votes add constraint song_votes_legacy_key unique(song_id, legacy_member_id);
alter table song_tournament.song_votes add constraint song_votes_identity_check check ((user_id is null) <> (legacy_member_id is null));
alter table song_tournament.song_votes add constraint song_votes_same_band
  foreign key (song_id, band_id) references song_tournament.songs(id, band_id) on delete cascade;
alter table song_tournament.poll_scores drop constraint poll_scores_pkey;
alter table song_tournament.poll_scores rename column member_id to legacy_member_id;
alter table song_tournament.poll_scores alter column legacy_member_id drop not null;
alter table song_tournament.poll_scores add column id uuid primary key default gen_random_uuid();
alter table song_tournament.poll_scores add column user_id uuid references song_tournament.users(user_id) on delete cascade;
alter table song_tournament.poll_scores add constraint poll_scores_user_key unique(poll_id, song_id, user_id);
alter table song_tournament.poll_scores add constraint poll_scores_legacy_key unique(poll_id, song_id, legacy_member_id);
alter table song_tournament.poll_scores add constraint poll_scores_identity_check check ((user_id is null) <> (legacy_member_id is null));
alter table song_tournament.poll_scores add constraint poll_scores_same_band
  foreign key (poll_id, song_id, band_id) references song_tournament.poll_songs(poll_id, song_id, band_id) on delete cascade;

create function song_tournament.is_band_owner(p_band_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from song_tournament.bands where id = p_band_id and owner_user_id = (select auth.uid()));
$$;
create function song_tournament.has_band_entry(p_band_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from song_tournament.band_members where band_id = p_band_id and user_id = (select auth.uid()));
$$;
create function song_tournament.can_access_band(p_band_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from song_tournament.band_members
    where band_id = p_band_id and user_id = (select auth.uid()) and state = 'active');
$$;
create function song_tournament.has_band_request(p_band_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from song_tournament.band_join_requests where band_id = p_band_id and user_id = (select auth.uid()));
$$;

create function song_tournament.enroll(p_display_name text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null) then
    raise exception 'Sign in and verify your email first.' using errcode = '42501';
  end if;
  if p_display_name is null or length(btrim(p_display_name)) not between 1 and 100 then
    raise exception 'Enter a display name between 1 and 100 characters.' using errcode = '22023';
  end if;
  insert into song_tournament.users(user_id, display_name) values (auth.uid(), btrim(p_display_name))
    on conflict (user_id) do nothing;
end;
$$;

create function song_tournament.create_band(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare created_id uuid;
begin
  if not exists (select 1 from song_tournament.users where user_id = auth.uid()) then
    raise exception 'Set up your Song Tournament profile first.' using errcode = '42501';
  end if;
  if p_name is null or length(btrim(p_name)) not between 1 and 100 then
    raise exception 'Enter a band name between 1 and 100 characters.' using errcode = '22023';
  end if;
  insert into song_tournament.bands(name, owner_user_id) values (btrim(p_name), auth.uid()) returning id into created_id;
  insert into song_tournament.band_codes(band_id) values (created_id);
  insert into song_tournament.band_members(band_id, user_id, state) values (created_id, auth.uid(), 'active');
  insert into song_tournament.sets(band_id, name, created_by_user_id) values (created_id, 'Main set', auth.uid());
  return created_id;
end;
$$;

create function song_tournament.request_band_join(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare selected_id uuid;
begin
  if not exists (select 1 from song_tournament.users where user_id = auth.uid()) then
    raise exception 'Set up your Song Tournament profile first.' using errcode = '42501';
  end if;
  select band_id into selected_id from song_tournament.band_codes where code = upper(btrim(p_code));
  if selected_id is null then raise exception 'Band code not found. Ask the owner for the current code.'; end if;
  if song_tournament.has_band_entry(selected_id) then return selected_id; end if;
  insert into song_tournament.band_join_requests(band_id, user_id, status)
    values (selected_id, auth.uid(), 'pending')
    on conflict (band_id, user_id) do update set status = 'pending', requested_at = now(), reviewed_at = null
    where song_tournament.band_join_requests.status <> 'pending';
  return selected_id;
end;
$$;

create function song_tournament.review_join_request(p_band_id uuid, p_user_id uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare needs_import boolean;
begin
  perform 1 from song_tournament.bands where id = p_band_id for update;
  if not song_tournament.is_band_owner(p_band_id) then
    raise exception 'Only the band owner can review requests.' using errcode = '42501';
  end if;
  perform 1 from song_tournament.band_join_requests where band_id = p_band_id and user_id = p_user_id and status = 'pending' for update;
  if not found then raise exception 'This request is no longer pending.'; end if;
  if p_approve is null then raise exception 'Choose approve or reject.'; end if;
  if p_approve then
    select b.requires_legacy_import and not exists (
      select 1 from song_tournament.legacy_imports i where i.band_id = p_band_id and i.user_id = p_user_id
    ) into needs_import from song_tournament.bands b where b.id = p_band_id;
    insert into song_tournament.band_members(band_id, user_id, state)
      values (p_band_id, p_user_id, case when needs_import then 'migration_required' else 'active' end)
      on conflict (band_id, user_id) do nothing;
  end if;
  update song_tournament.band_join_requests set status = case when p_approve then 'approved' else 'rejected' end,
    reviewed_at = now() where band_id = p_band_id and user_id = p_user_id;
end;
$$;

create function song_tournament.rotate_band_code(p_band_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare new_code text;
begin
  if not song_tournament.is_band_owner(p_band_id) then
    raise exception 'Only the band owner can rotate the code.' using errcode = '42501';
  end if;
  update song_tournament.band_codes set code = upper(replace(gen_random_uuid()::text, '-', '')), rotated_at = now()
    where band_id = p_band_id returning code into new_code;
  return new_code;
end;
$$;
create function song_tournament.rename_band(p_band_id uuid, p_name text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not song_tournament.is_band_owner(p_band_id) then
    raise exception 'Only the band owner can rename the band.' using errcode = '42501';
  end if;
  if p_name is null or length(btrim(p_name)) not between 1 and 100 then raise exception 'Enter a band name between 1 and 100 characters.'; end if;
  update song_tournament.bands set name = btrim(p_name) where id = p_band_id;
end;
$$;
create function song_tournament.remove_band_member(p_band_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from song_tournament.bands where id = p_band_id for update;
  if auth.uid() is null or (p_user_id is distinct from auth.uid() and not song_tournament.is_band_owner(p_band_id)) then
    raise exception 'Only the band owner can remove other members.' using errcode = '42501';
  end if;
  if exists (select 1 from song_tournament.bands where id = p_band_id and owner_user_id = p_user_id) then
    raise exception 'The owner cannot leave or be removed.' using errcode = '42501';
  end if;
  delete from song_tournament.band_members where band_id = p_band_id and user_id = p_user_id;
end;
$$;

create function song_tournament.get_legacy_import_options(p_band_id uuid) returns table(id uuid, name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from song_tournament.band_members
    where band_id = p_band_id and user_id = auth.uid() and state = 'migration_required') then
    raise exception 'An approved migration request is required.' using errcode = '42501';
  end if;
  return query select m.id, m.name from song_tournament.members m where m.band_id = p_band_id order by m.name;
end;
$$;

create function song_tournament.complete_legacy_import(p_band_id uuid, p_member_id uuid, p_confirm boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare old_name text;
begin
  perform 1 from song_tournament.bands where id = p_band_id for update;
  if not exists (select 1 from song_tournament.band_members
    where band_id = p_band_id and user_id = auth.uid() and state = 'migration_required') then
    raise exception 'Your legacy migration is already final, or you do not have an approved request.' using errcode = '42501';
  end if;
  if p_confirm is distinct from true or p_member_id is null then
    raise exception 'Select a legacy member and confirm that this decision is permanent.' using errcode = '22023';
  end if;
  select name into old_name from song_tournament.members where id = p_member_id and band_id = p_band_id for update;
  if not found then raise exception 'That member is no longer available. Choose another member.'; end if;
  insert into song_tournament.legacy_imports(band_id, user_id, legacy_member_id, legacy_name)
    values (p_band_id, auth.uid(), p_member_id, old_name);
  update song_tournament.song_votes set user_id = auth.uid(), legacy_member_id = null where band_id = p_band_id and legacy_member_id = p_member_id;
  update song_tournament.poll_scores set user_id = auth.uid(), legacy_member_id = null where band_id = p_band_id and legacy_member_id = p_member_id;
  update song_tournament.songs set added_by_user_id = auth.uid(), legacy_added_by_member_id = null
    where band_id = p_band_id and legacy_added_by_member_id = p_member_id;
  delete from song_tournament.members where id = p_member_id and band_id = p_band_id;
  update song_tournament.band_members set state = 'active' where band_id = p_band_id and user_id = auth.uid();
  if not exists (select 1 from song_tournament.members where band_id = p_band_id) then
    update song_tournament.bands set requires_legacy_import = false where id = p_band_id;
    update song_tournament.band_members set state = 'active' where band_id = p_band_id and state = 'migration_required';
  end if;
end;
$$;

-- Complete the already-linked owner's import without requiring a second choice.
alter table song_tournament.users drop constraint users_member_id_fkey;
do $$
declare linked record; previous_sub text := current_setting('request.jwt.claim.sub', true);
begin
  for linked in select b.id band_id, u.user_id, u.member_id from song_tournament.users u
    join song_tournament.bands b on b.owner_user_id = u.user_id loop
    perform set_config('request.jwt.claim.sub', linked.user_id::text, true);
    perform song_tournament.complete_legacy_import(linked.band_id, linked.member_id, true);
  end loop;
  perform set_config('request.jwt.claim.sub', coalesce(previous_sub, ''), true);
end;
$$;
alter table song_tournament.users drop column member_id;

create function song_tournament.get_band_people(p_band_id uuid) returns table(user_id uuid, display_name text, state text,
  can_manage_others_songs boolean, can_manage_others_polls boolean, can_manage_sets boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not song_tournament.has_band_entry(p_band_id) then raise exception 'Join this band first.' using errcode = '42501'; end if;
  return query select u.user_id, u.display_name, m.state, m.can_manage_others_songs, m.can_manage_others_polls, m.can_manage_sets from song_tournament.band_members m
    join song_tournament.users u on u.user_id = m.user_id where m.band_id = p_band_id order by u.display_name;
end;
$$;
create function song_tournament.get_band_requests(p_band_id uuid)
returns table(user_id uuid, display_name text, requested_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not song_tournament.is_band_owner(p_band_id) then raise exception 'Only the band owner can see requests.' using errcode = '42501'; end if;
  return query select u.user_id, u.display_name, r.requested_at from song_tournament.band_join_requests r
    join song_tournament.users u on u.user_id = r.user_id where r.band_id = p_band_id and r.status = 'pending' order by r.requested_at;
end;
$$;

-- Client identities and band scopes are immutable, including for users in both bands.
create function song_tournament.can_manage_song(p_band_id uuid, p_author_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from song_tournament.band_members m join song_tournament.bands b on b.id = m.band_id
    where m.band_id = p_band_id and m.user_id = (select auth.uid()) and m.state = 'active'
      and (b.owner_user_id = m.user_id or p_author_id = m.user_id or m.can_manage_others_songs));
$$;
create function song_tournament.can_manage_poll(p_band_id uuid, p_poll_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from song_tournament.band_members m join song_tournament.bands b on b.id = m.band_id
    join song_tournament.polls p on p.band_id = b.id and p.id = p_poll_id
    where m.band_id = p_band_id and m.user_id = (select auth.uid()) and m.state = 'active'
      and (b.owner_user_id = m.user_id or p.created_by_user_id = m.user_id or m.can_manage_others_polls));
$$;
create function song_tournament.can_manage_sets(p_band_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from song_tournament.band_members m join song_tournament.bands b on b.id = m.band_id
    where m.band_id = p_band_id and m.user_id = (select auth.uid()) and m.state = 'active'
      and (b.owner_user_id = m.user_id or m.can_manage_sets));
$$;
create function song_tournament.set_member_permissions(p_band_id uuid, p_user_id uuid,
  p_songs boolean, p_polls boolean, p_sets boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from song_tournament.bands where id = p_band_id for update;
  if not song_tournament.is_band_owner(p_band_id) then raise exception 'Only the band owner can change permissions.' using errcode = '42501'; end if;
  if p_songs is null or p_polls is null or p_sets is null then raise exception 'Specify each permission.'; end if;
  if exists (select 1 from song_tournament.bands where id = p_band_id and owner_user_id = p_user_id) then
    raise exception 'The owner always has full permissions.';
  end if;
  update song_tournament.band_members set can_manage_others_songs = p_songs,
    can_manage_others_polls = p_polls, can_manage_sets = p_sets
    where band_id = p_band_id and user_id = p_user_id;
  if not found then raise exception 'Band member not found.'; end if;
end;
$$;
create function song_tournament.delete_band(p_band_id uuid, p_confirmation_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare band_name text;
begin
  perform 1 from song_tournament.bands where id = p_band_id for update;
  if not song_tournament.is_band_owner(p_band_id) then raise exception 'Only the band owner can delete the band.' using errcode = '42501'; end if;
  select name into band_name from song_tournament.bands where id = p_band_id;
  if p_confirmation_name is distinct from band_name then raise exception 'Enter the exact band name to confirm permanent deletion.'; end if;
  delete from song_tournament.bands where id = p_band_id;
end;
$$;

create function song_tournament.guard_band_data() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'UPDATE' and (new.id is distinct from old.id or new.band_id is distinct from old.band_id) then
    raise exception 'The record identity and band cannot be changed.' using errcode = '42501';
  end if;
  if tg_table_name = 'songs' then
    if tg_op = 'INSERT' and (new.added_by_user_id is distinct from auth.uid() or new.legacy_added_by_member_id is not null) then
      raise exception 'Use your own account when adding a song.' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and (new.added_by_user_id is distinct from old.added_by_user_id
      or new.legacy_added_by_member_id is distinct from old.legacy_added_by_member_id
      or new.added_by_name_snapshot is distinct from old.added_by_name_snapshot) then
      raise exception 'Song authorship cannot be changed.' using errcode = '42501';
    end if;
  elsif tg_table_name in ('song_votes', 'poll_scores') then
    if new.user_id is distinct from auth.uid() or new.legacy_member_id is not null then
      raise exception 'Use your own account when voting.' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and (new.user_id is distinct from old.user_id or new.song_id is distinct from old.song_id) then
      raise exception 'Vote identity cannot be changed.' using errcode = '42501';
    end if;
    if tg_table_name = 'poll_scores' then
      if tg_op = 'UPDATE' and new.poll_id is distinct from old.poll_id then
        raise exception 'Poll identity cannot be changed.' using errcode = '42501';
      end if;
    end if;
  elsif tg_table_name in ('polls', 'sets') then
    if tg_op = 'INSERT' and new.created_by_user_id is distinct from auth.uid() then
      raise exception 'Use your own account when creating a poll.' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and new.created_by_user_id is distinct from old.created_by_user_id then
      raise exception 'Poll authorship cannot be changed.' using errcode = '42501';
    end if;
  elsif tg_table_name = 'poll_songs' and tg_op = 'UPDATE' then
    if new.poll_id is distinct from old.poll_id or new.song_id is distinct from old.song_id then
      raise exception 'Poll song identity cannot be changed.' using errcode = '42501';
    end if;
  elsif tg_table_name = 'set_songs' and tg_op = 'UPDATE' then
    if new.song_id is distinct from old.song_id or new.set_id is distinct from old.set_id then
      raise exception 'Set song identity cannot be changed.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['bands','band_codes','band_members','band_join_requests','legacy_imports','sets'] loop
    execute format('alter table song_tournament.%I enable row level security', t);
  end loop;
  foreach t in array array['songs','song_votes','polls','poll_songs','poll_scores','set_songs','sets'] loop
    execute format('create trigger guard_band_data before insert or update on song_tournament.%I for each row execute function song_tournament.guard_band_data()', t);
  end loop;
end;
$$;
revoke all on all tables in schema song_tournament from public, anon, authenticated;
revoke all on all routines in schema song_tournament from public, anon, authenticated;
grant select on song_tournament.users, song_tournament.bands, song_tournament.band_codes,
  song_tournament.band_members, song_tournament.band_join_requests, song_tournament.legacy_imports to authenticated;
grant update(display_name, settings) on song_tournament.users to authenticated;
grant select, insert, update, delete on song_tournament.songs, song_tournament.song_votes,
  song_tournament.polls, song_tournament.poll_songs, song_tournament.poll_scores, song_tournament.set_songs, song_tournament.sets to authenticated;
grant all on song_tournament.bands, song_tournament.band_codes, song_tournament.band_members,
  song_tournament.band_join_requests, song_tournament.legacy_imports, song_tournament.sets to service_role;

create policy own_profile on song_tournament.users for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy visible_bands on song_tournament.bands for select to authenticated
  using (song_tournament.has_band_entry(id) or song_tournament.has_band_request(id));
create policy owner_codes on song_tournament.band_codes for select to authenticated using (song_tournament.is_band_owner(band_id));
create policy band_people on song_tournament.band_members for select to authenticated
  using (user_id = (select auth.uid()) or song_tournament.can_access_band(band_id));
create policy own_or_owner_requests on song_tournament.band_join_requests for select to authenticated
  using (user_id = (select auth.uid()) or song_tournament.is_band_owner(band_id));
create policy own_import_history on song_tournament.legacy_imports for select to authenticated
  using (user_id = (select auth.uid()) or song_tournament.is_band_owner(band_id));
do $$
declare t text;
begin
  foreach t in array array['songs','polls','poll_songs','set_songs','sets'] loop
    execute format('create policy active_band_read on song_tournament.%I for select to authenticated using (song_tournament.can_access_band(band_id))', t);
  end loop;
  foreach t in array array['song_votes','poll_scores'] loop
    execute format('create policy band_read on song_tournament.%I for select to authenticated using (song_tournament.can_access_band(band_id))', t);
    execute format('create policy own_vote on song_tournament.%I for all to authenticated using (song_tournament.can_access_band(band_id) and user_id = (select auth.uid()) and legacy_member_id is null) with check (song_tournament.can_access_band(band_id) and user_id = (select auth.uid()) and legacy_member_id is null)', t);
  end loop;
end;
$$;
create policy songs_add on song_tournament.songs for insert to authenticated with check (song_tournament.can_access_band(band_id) and added_by_user_id = (select auth.uid()));
create policy songs_edit on song_tournament.songs for update to authenticated
  using (song_tournament.can_manage_song(band_id, added_by_user_id)) with check (song_tournament.can_manage_song(band_id, added_by_user_id));
create policy songs_delete on song_tournament.songs for delete to authenticated using (song_tournament.can_manage_song(band_id, added_by_user_id));
create policy polls_add on song_tournament.polls for insert to authenticated with check (song_tournament.can_access_band(band_id) and created_by_user_id = (select auth.uid()));
create policy polls_edit on song_tournament.polls for update to authenticated
  using (song_tournament.can_manage_poll(band_id, id)) with check (song_tournament.can_manage_poll(band_id, id));
create policy polls_delete on song_tournament.polls for delete to authenticated using (song_tournament.can_manage_poll(band_id, id));
create policy poll_songs_manage on song_tournament.poll_songs for all to authenticated
  using (song_tournament.can_manage_poll(band_id, poll_id)) with check (song_tournament.can_manage_poll(band_id, poll_id));
create policy set_songs_manage on song_tournament.set_songs for all to authenticated
  using (song_tournament.can_manage_sets(band_id)) with check (song_tournament.can_manage_sets(band_id));

create policy sets_manage on song_tournament.sets for all to authenticated
  using (song_tournament.can_manage_sets(band_id)) with check (song_tournament.can_manage_sets(band_id));

grant execute on function song_tournament.is_band_owner(uuid), song_tournament.has_band_entry(uuid),
  song_tournament.can_access_band(uuid), song_tournament.has_band_request(uuid), song_tournament.enroll(text),
  song_tournament.create_band(text), song_tournament.request_band_join(text),
  song_tournament.review_join_request(uuid,uuid,boolean), song_tournament.rotate_band_code(uuid),
  song_tournament.rename_band(uuid,text), song_tournament.remove_band_member(uuid,uuid),
  song_tournament.get_legacy_import_options(uuid), song_tournament.complete_legacy_import(uuid,uuid,boolean),
  song_tournament.get_band_people(uuid), song_tournament.get_band_requests(uuid),
  song_tournament.can_manage_song(uuid,uuid), song_tournament.can_manage_poll(uuid,uuid), song_tournament.can_manage_sets(uuid),
  song_tournament.set_member_permissions(uuid,uuid,boolean,boolean,boolean), song_tournament.delete_band(uuid,text) to authenticated;
notify pgrst, 'reload schema';

-- Poll edits and set ordering are atomic, including validation across bands.
create function song_tournament.save_poll(p_band_id uuid, p_poll_id uuid, p_title text, p_song_ids uuid[]) returns uuid
language plpgsql set search_path = '' as $$
declare selected_id uuid; requested integer; available integer;
begin
  if not song_tournament.can_access_band(p_band_id) then raise exception 'Join this band first.' using errcode = '42501'; end if;
  if p_title is null or length(btrim(p_title)) not between 1 and 200 then raise exception 'Enter a poll title between 1 and 200 characters.'; end if;
  if p_song_ids is null or cardinality(p_song_ids) = 0 or array_position(p_song_ids, null) is not null then raise exception 'Select at least one song.'; end if;
  select count(distinct id) into requested from unnest(p_song_ids) ids(id);
  select count(*) into available from song_tournament.songs where band_id = p_band_id and id = any(p_song_ids);
  if available <> requested or requested <> cardinality(p_song_ids) then raise exception 'Choose distinct songs from this band.' using errcode = '42501'; end if;
  if p_poll_id is null then
    insert into song_tournament.polls(band_id, title, created_by_user_id) values (p_band_id, btrim(p_title), auth.uid()) returning id into selected_id;
  else
    if not song_tournament.can_manage_poll(p_band_id, p_poll_id) then raise exception 'You cannot edit this poll.' using errcode = '42501'; end if;
    update song_tournament.polls set title = btrim(p_title) where id = p_poll_id and band_id = p_band_id returning id into selected_id;
    if not found then raise exception 'Poll not found.'; end if;
  end if;
  delete from song_tournament.poll_songs where poll_id = selected_id and band_id = p_band_id and not (song_id = any(p_song_ids));
  insert into song_tournament.poll_songs(band_id, poll_id, song_id, position)
    select p_band_id, selected_id, id, ordinality - 1 from unnest(p_song_ids) with ordinality ids(id, ordinality)
    on conflict (poll_id, song_id) do update set position = excluded.position;
  return selected_id;
end;
$$;
create function song_tournament.reorder_set(p_band_id uuid, p_set_id uuid, p_entry_ids uuid[]) returns void
language plpgsql set search_path = '' as $$
declare requested integer; total integer;
begin
  if not song_tournament.can_manage_sets(p_band_id) then raise exception 'You cannot manage sets in this band.' using errcode = '42501'; end if;
  perform 1 from song_tournament.set_songs where band_id = p_band_id and set_id = p_set_id for update;
  select count(*) into total from song_tournament.set_songs where band_id = p_band_id and set_id = p_set_id;
  select count(distinct id) into requested from unnest(p_entry_ids) ids(id);
  if p_entry_ids is null or total <> cardinality(p_entry_ids) or requested <> total or array_position(p_entry_ids, null) is not null
    or exists (select 1 from unnest(p_entry_ids) ids(id) where not exists (
      select 1 from song_tournament.set_songs s where s.id = ids.id and s.band_id = p_band_id and s.set_id = p_set_id
    )) then raise exception 'The set changed. Refresh before reordering.'; end if;
  update song_tournament.set_songs s set position = ids.ordinality - 1
    from unnest(p_entry_ids) with ordinality ids(id, ordinality)
    where s.id = ids.id and s.band_id = p_band_id and s.set_id = p_set_id;
end;
$$;
revoke all on function song_tournament.save_poll(uuid,uuid,text,uuid[]), song_tournament.reorder_set(uuid,uuid,uuid[]) from public, anon;
grant execute on function song_tournament.save_poll(uuid,uuid,text,uuid[]), song_tournament.reorder_set(uuid,uuid,uuid[]) to authenticated;
