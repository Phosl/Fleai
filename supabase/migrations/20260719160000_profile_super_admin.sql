begin;

alter table public.profiles
  add column is_super_admin boolean not null default false;

comment on column public.profiles.is_super_admin is
  'Ruolo Super Admin gestito da Supabase; non modificabile dagli utenti normali.';

update public.profiles p
set is_super_admin = true
from auth.users u
where u.id = p.id
  and coalesce(u.raw_app_meta_data ->> 'role', '') = 'admin';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_super_admin
  )
$$;

create or replace function public.protect_profile_limits()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    new.hunting_limit_override is distinct from old.hunting_limit_override or
    new.shop_limit_override is distinct from old.shop_limit_override or
    new.suspended_at is distinct from old.suspended_at or
    new.suspension_reason is distinct from old.suspension_reason or
    new.is_super_admin is distinct from old.is_super_admin
  ) and not public.is_admin() and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'admin_only_field' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop policy profiles_owner_select on public.profiles;
drop policy profiles_owner_update on public.profiles;

create policy profiles_owner_select on public.profiles for select
using ((id = auth.uid() and not public.is_suspended()) or public.is_admin());

create policy profiles_owner_update on public.profiles for update
using ((id = auth.uid() and not public.is_suspended()) or public.is_admin())
with check ((id = auth.uid() and not public.is_suspended()) or public.is_admin());

commit;
