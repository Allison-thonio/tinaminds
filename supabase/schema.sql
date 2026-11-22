-- Run once in the Supabase SQL editor.

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

create unique index if not exists registrations_phone_uidx on public.registrations (phone_e164);
create unique index if not exists registrations_email_uidx on public.registrations (lower(email));
create index if not exists registrations_status_idx on public.registrations (status);
create index if not exists registrations_state_idx on public.registrations (state);
create index if not exists registrations_created_idx on public.registrations (created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists registrations_set_updated_at on public.registrations;
create trigger registrations_set_updated_at before update on public.registrations for each row execute function public.set_updated_at();

alter table public.registrations enable row level security;
revoke all on public.registrations from anon, authenticated;
grant select, insert, update, delete on public.registrations to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('registrations-private', 'registrations-private', false, 2097152, array['image/jpeg'])
on conflict (id) do nothing;

create or replace function public.admin_search_registrations(p_q text default null, p_status text default null, p_state text default null, p_limit int default 25, p_offset int default 0)
returns table (id uuid, code text, full_name text, phone_e164 text, email text, address text, state text, lga text, status text, admin_notes text, verified_at timestamptz, admin_notified_at timestamptz, created_at timestamptz, total_count bigint)
language sql stable set search_path = public as $$
  with params as (
    select nullif(btrim(left(coalesce(p_q, ''), 60)), '') as q,
      replace(replace(replace(btrim(left(coalesce(p_q, ''), 60)), '\\', '\\\\'), '%', '\\%'), '_', '\\_') as q_like,
      case when btrim(coalesce(p_q, '')) ~ '^[0-9 +()-]{3,}$' then regexp_replace(regexp_replace(p_q, '[^0-9]', '', 'g'), '^(234|0)', '') else null end as phone_digits
  )
  select r.id, r.code, r.full_name, r.phone_e164, r.email, r.address, r.state, r.lga, r.status, r.admin_notes, r.verified_at, r.admin_notified_at, r.created_at, count(*) over() as total_count
  from public.registrations r, params p
  where (p_status is null or r.status = p_status) and (p_state is null or r.state = p_state)
    and (p.q is null or r.full_name ilike '%' || p.q_like || '%' or r.email ilike '%' || p.q_like || '%' or r.code ilike '%' || p.q_like || '%' or (p.phone_digits is not null and r.phone_e164 like '%' || p.phone_digits || '%'))
  order by r.created_at desc limit greatest(1, least(coalesce(p_limit, 25), 100)) offset greatest(0, coalesce(p_offset, 0));
$$;

create or replace function public.admin_registration_counts()
returns table (status text, total bigint)
language sql stable set search_path = public as $$ select r.status, count(*) from public.registrations r group by r.status; $$;

revoke all on function public.admin_search_registrations(text, text, text, int, int) from public, anon, authenticated;
revoke all on function public.admin_registration_counts() from public, anon, authenticated;
grant execute on function public.admin_search_registrations(text, text, text, int, int) to service_role;
grant execute on function public.admin_registration_counts() to service_role;
