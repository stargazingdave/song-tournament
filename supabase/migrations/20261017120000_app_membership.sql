-- Do not create auth users or enroll users into other applications here.
create table song_tournament.users (
    user_id uuid primary key references auth.users(id) on delete cascade,
    member_id uuid not null unique references song_tournament.members(id),
    settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
    created_at timestamptz not null default now()
);
alter table song_tournament.users enable row level security;

create function song_tournament.current_member_id() returns uuid
language sql stable security definer set search_path = '' as $$
    select member_id from song_tournament.users where user_id = (select auth.uid());
$$;

-- Only the server may enroll, after verifying the band invitation code.
-- Claiming a legacy identity is explicit, atomic, and can only happen once.
create function song_tournament.enroll(p_user_id uuid, p_name text, p_claim_existing boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare selected_id uuid;
begin
    if not exists (select 1 from auth.users where id = p_user_id and email_confirmed_at is not null) then
        raise exception 'Verify your email before joining Song Tournament.' using errcode = '42501';
    end if;
    if p_name is null or length(btrim(p_name)) not between 1 and 100 then
        raise exception 'Enter a member name between 1 and 100 characters.' using errcode = '22023';
    end if;
    perform pg_advisory_xact_lock(hashtext('song_tournament:enroll'), hashtext(p_user_id::text));
    select member_id into selected_id from song_tournament.users where user_id = p_user_id;
    if selected_id is not null then return selected_id; end if;
    if p_claim_existing then
        select id into selected_id from song_tournament.members where lower(name) = lower(btrim(p_name)) for update;
        if selected_id is null then raise exception 'No existing band member has that name.'; end if;
        if exists (select 1 from song_tournament.users where member_id = selected_id) then
            raise exception 'That band member is already linked to an account.' using errcode = '42501';
        end if;
    else
        insert into song_tournament.members(name) values (btrim(p_name)) returning id into selected_id;
    end if;
    insert into song_tournament.users(user_id, member_id) values (p_user_id, selected_id);
    return selected_id;
end;
$$;

-- Remove the original broad grants, including TRUNCATE and future object grants.
revoke all on all tables in schema song_tournament from public, anon, authenticated;
revoke all on all routines in schema song_tournament from public, anon, authenticated;
revoke all on all sequences in schema song_tournament from public, anon, authenticated;
alter default privileges for role postgres in schema song_tournament revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema song_tournament revoke all on routines from public, anon, authenticated;
alter default privileges for role postgres in schema song_tournament revoke all on sequences from anon, authenticated;
grant usage on schema song_tournament to authenticated, service_role;
grant select on song_tournament.users to authenticated;
grant update (settings) on song_tournament.users to authenticated;
grant select on song_tournament.members to authenticated;
grant select, insert, update, delete on song_tournament.songs, song_tournament.song_votes,
    song_tournament.polls, song_tournament.poll_songs, song_tournament.poll_scores,
    song_tournament.chosen_songs to authenticated;
grant execute on function song_tournament.current_member_id() to authenticated;
grant execute on function song_tournament.enroll(uuid, text, boolean) to service_role;
grant all on song_tournament.users to service_role;

create policy own_profile on song_tournament.users for all to authenticated
    using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy member_directory on song_tournament.members for select to authenticated
    using (song_tournament.current_member_id() is not null);

do $$
declare table_name text;
begin
    foreach table_name in array array['songs', 'polls', 'poll_songs', 'chosen_songs'] loop
        execute format('create policy band_members on song_tournament.%I for all to authenticated using (song_tournament.current_member_id() is not null) with check (song_tournament.current_member_id() is not null)', table_name);
    end loop;
    foreach table_name in array array['song_votes', 'poll_scores'] loop
        execute format('create policy band_read on song_tournament.%I for select to authenticated using (song_tournament.current_member_id() is not null)', table_name);
        execute format('create policy own_vote on song_tournament.%I for all to authenticated using (member_id = song_tournament.current_member_id()) with check (member_id = song_tournament.current_member_id())', table_name);
    end loop;
end;
$$;

-- Preserve authorship when editing songs; new songs must use the caller's identity.
create function song_tournament.guard_song_author() returns trigger
language plpgsql set search_path = '' as $$
begin
    if tg_op = 'UPDATE' and new.added_by_member_id is distinct from old.added_by_member_id then
        raise exception 'Song authorship cannot be changed.' using errcode = '42501';
    end if;
    if tg_op = 'INSERT' and new.added_by_member_id is distinct from song_tournament.current_member_id() then
        raise exception 'Use your own band identity when adding a song.' using errcode = '42501';
    end if;
    return new;
end;
$$;
revoke all on function song_tournament.guard_song_author() from public, anon, authenticated;
create trigger guard_song_author before insert or update on song_tournament.songs
    for each row execute function song_tournament.guard_song_author();
notify pgrst, 'reload schema';
