begin;

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
  ) and coalesce(auth.role(), '') in ('anon', 'authenticated') and not public.is_admin() then
    raise exception 'admin_only_field' using errcode = '42501';
  end if;
  return new;
end;
$$;

commit;
