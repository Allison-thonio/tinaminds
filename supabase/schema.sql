-- Tina Like Minds Member Registry — Production Schema
-- Run once in the Supabase SQL editor.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE throughout.

-- =============================================================================
-- 1. REGISTRATIONS TABLE
-- =============================================================================

create table if not exists public.registrations (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique,
  full_name          text not null check (char_length(full_name) between 2 and 80),
  phone_e164         text not null check (phone_e164 ~ '^\+234[789][01][0-9]{8}$'),
  email              text not null check (char_length(email) <= 254),
  address            text not null check (char_length(address) between 10 and 200),
  state              text not null,
  lga                text not null,
  voter_card_path    text not null,
  photo_path         text not null,
  status             text not null default 'pending'
                     check (status in ('pending', 'verified', 'rejected')),
  admin_notes        text check (admin_notes is null or char_length(admin_notes) <= 500),
  verified_at        timestamptz,
  admin_notified_at  timestamptz,
  member_notified_at timestamptz,
  consent_at         timestamptz not null default now(),
  consent_version    text not null,
  ip_hash            text,
  user_agent         text check (user_agent is null or char_length(user_agent) <= 300),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- =============================================================================
-- 2. INDEXES (optimized for search + admin dashboard at scale)
-- =============================================================================

-- Unique constraints for dedup
create unique index if not exists registrations_phone_uidx
  on public.registrations (phone_e164);

create unique index if not exists registrations_email_uidx
  on public.registrations (lower(email));

-- Dashboard filters and sorting
create index if not exists registrations_status_idx
  on public.registrations (status);

create index if not exists registrations_state_idx
  on public.registrations (state);

create index if not exists registrations_created_idx
  on public.registrations (created_at desc);

-- Composite index: status + created_at for the most common admin query
-- ("show me pending registrations, newest first")
create index if not exists registrations_status_created_idx
  on public.registrations (status, created_at desc);

-- Trigram index for fast ILIKE search on name
-- (requires pg_trgm extension, which Supabase has pre-installed)
create extension if not exists pg_trgm;

create index if not exists registrations_name_trgm_idx
  on public.registrations using gin (full_name gin_trgm_ops);

create index if not exists registrations_phone_trgm_idx
  on public.registrations using gin (phone_e164 gin_trgm_ops);

-- Code lookup (admin search by code)
create index if not exists registrations_code_idx
  on public.registrations (code);

-- =============================================================================
-- 3. AUTO-UPDATE TRIGGER
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

drop trigger if exists registrations_set_updated_at on public.registrations;
create trigger registrations_set_updated_at
  before update on public.registrations
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 4. ROW LEVEL SECURITY
-- =============================================================================
-- Only service_role (server-side) can access this table.
-- anon and authenticated roles are fully locked out.

alter table public.registrations enable row level security;

-- Revoke everything from public-facing roles
revoke all on public.registrations from anon, authenticated;

-- Grant full CRUD to service_role only
grant select, insert, update, delete on public.registrations to service_role;

-- Explicit RLS policies (belt-and-suspenders with the REVOKE above)
drop policy if exists "service_role_full_access" on public.registrations;
create policy "service_role_full_access" on public.registrations
  for all
  to service_role
  using (true)
  with check (true);

-- =============================================================================
-- 5. STORAGE BUCKET
-- =============================================================================
-- Private bucket for voter card and photo uploads (max 2 MB per file, JPEG only)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('registrations-private', 'registrations-private', false, 2097152, array['image/jpeg'])
on conflict (id) do update set
  public = false,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg'];

-- Storage RLS: deny all access via anon/authenticated, allow service_role only
-- (service_role bypasses RLS by default, but we lock anon/authenticated explicitly)

drop policy if exists "deny_anon_insert" on storage.objects;
create policy "deny_anon_insert" on storage.objects
  for insert to anon with check (false);

drop policy if exists "deny_anon_select" on storage.objects;
create policy "deny_anon_select" on storage.objects
  for select to anon using (false);

drop policy if exists "deny_anon_update" on storage.objects;
create policy "deny_anon_update" on storage.objects
  for update to anon using (false);

drop policy if exists "deny_anon_delete" on storage.objects;
create policy "deny_anon_delete" on storage.objects
  for delete to anon using (false);

drop policy if exists "deny_authenticated_insert" on storage.objects;
create policy "deny_authenticated_insert" on storage.objects
  for insert to authenticated with check (false);

drop policy if exists "deny_authenticated_select" on storage.objects;
create policy "deny_authenticated_select" on storage.objects
  for select to authenticated using (false);

drop policy if exists "deny_authenticated_update" on storage.objects;
create policy "deny_authenticated_update" on storage.objects
  for update to authenticated using (false);

drop policy if exists "deny_authenticated_delete" on storage.objects;
create policy "deny_authenticated_delete" on storage.objects
  for delete to authenticated using (false);

-- =============================================================================
-- 6. ADMIN SEARCH FUNCTION (optimized for scale)
-- =============================================================================
-- Uses trigram matching for name search, standard ILIKE for email/code,
-- and phone digit extraction for phone search.

create or replace function public.admin_search_registrations(
  p_q text default null,
  p_status text default null,
  p_state text default null,
  p_limit int default 25,
  p_offset int default 0
)
returns table (
  id uuid, code text, full_name text, phone_e164 text, email text,
  address text, state text, lga text, status text, admin_notes text,
  verified_at timestamptz, admin_notified_at timestamptz,
  created_at timestamptz, total_count bigint
)
language sql stable set search_path = public as $$
  with params as (
    select
      nullif(btrim(left(coalesce(p_q, ''), 60)), '') as q,
      replace(replace(replace(
        btrim(left(coalesce(p_q, ''), 60)),
        '\\', '\\\\'
      ), '%', '\\%'), '_', '\\_') as q_like,
      case
        when btrim(coalesce(p_q, '')) ~ '^[0-9 +().-]{3,}$'
        then nullif(regexp_replace(regexp_replace(p_q, '[^0-9]', '', 'g'), '^(00?234|234|0)', ''), '')
        else null
      end as phone_digits
  )
  select
    r.id, r.code, r.full_name, r.phone_e164, r.email,
    r.address, r.state, r.lga, r.status, r.admin_notes,
    r.verified_at, r.admin_notified_at, r.created_at,
    count(*) over() as total_count
  from public.registrations r, params p
  where
    (p_status is null or r.status = p_status)
    and (p_state is null or r.state = p_state)
    and (
      p.q is null
      or r.full_name ilike '%' || p.q_like || '%'
      or r.email ilike '%' || p.q_like || '%'
      or r.code ilike '%' || p.q_like || '%'
      or (p.phone_digits is not null and r.phone_e164 like '%' || p.phone_digits || '%')
    )
  order by r.created_at desc
  limit greatest(1, least(coalesce(p_limit, 25), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

-- =============================================================================
-- 7. ADMIN COUNTS FUNCTION
-- =============================================================================

create or replace function public.admin_registration_counts()
returns table (status text, total bigint)
language sql stable set search_path = public as $$
  select r.status, count(*)
  from public.registrations r
  group by r.status;
$$;

-- =============================================================================
-- 8. FUNCTION PERMISSIONS
-- =============================================================================
-- Lock RPC functions to service_role only

revoke all on function public.admin_search_registrations(text, text, text, int, int) from public, anon, authenticated;
revoke all on function public.admin_registration_counts() from public, anon, authenticated;
grant execute on function public.admin_search_registrations(text, text, text, int, int) to service_role;
grant execute on function public.admin_registration_counts() to service_role;

-- =============================================================================
-- DONE. Your database is production-ready for thousands of registrations.
-- =============================================================================
