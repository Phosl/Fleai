begin;

alter table public.profiles
  add column suspended_at timestamptz,
  add column suspension_reason text;

alter table public.profiles
  add constraint profiles_suspension_reason_check check (
    (suspended_at is null and suspension_reason is null) or
    (suspended_at is not null and char_length(suspension_reason) between 3 and 500)
  );

create table public.admin_audit_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(action) between 3 and 80),
  target_type text not null check (target_type in ('user', 'item')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 3 and 500),
  before_data jsonb not null default '{}',
  after_data jsonb not null default '{}',
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  unique (actor_id, idempotency_key)
);

create index profiles_suspended_idx on public.profiles (suspended_at) where suspended_at is not null;
create index admin_audit_logs_created_idx on public.admin_audit_logs (created_at desc);
create index admin_audit_logs_target_idx on public.admin_audit_logs (target_type, target_id, created_at desc);
create index items_admin_filters_idx on public.items (status, moderation_status, category, created_at desc);

create function public.is_suspended(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = check_user_id and p.suspended_at is not null
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
    new.suspension_reason is distinct from old.suspension_reason
  ) and not public.is_admin() and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'admin_only_field' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.accept_inquiry(inquiry_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.inquiries;
begin
  if public.is_suspended() and not public.is_admin() then
    raise exception 'account_suspended' using errcode = '42501';
  end if;
  select * into target from public.inquiries where id = inquiry_id for update;
  if target.id is null or (target.seller_id <> auth.uid() and not public.is_admin()) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if target.status not in ('new', 'contacted') then
    raise exception 'inquiry_not_open' using errcode = 'P0001';
  end if;
  update public.inquiries set status = 'accepted', closed_at = now() where id = inquiry_id;
  update public.inquiries set status = 'closed', closed_at = now()
    where listing_id = target.listing_id and id <> inquiry_id and status in ('new', 'contacted');
  update public.items set status = 'reserved' where id = target.listing_id and status = 'published';
end;
$$;

create or replace function public.enqueue_ai_run(run_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  message_id bigint;
begin
  if public.is_suspended() and not public.is_admin() then
    raise exception 'account_suspended' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.analysis_runs r
    where r.id = run_id and (r.owner_id = auth.uid() or public.is_admin())
  ) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  select pgmq.send('fleai_jobs', jsonb_build_object('run_id', run_id)) into message_id;
  perform public.kick_ai_worker();
  return message_id;
end;
$$;

create function public.admin_list_users(
  p_query text default '',
  p_status text default 'all',
  p_sort text default 'newest',
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  user_id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  providers text[],
  suspended_at timestamptz,
  suspension_reason text,
  hunting_limit_override integer,
  shop_limit_override integer,
  item_count bigint,
  hunting_used bigint,
  shop_used bigint,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if p_status not in ('all', 'active', 'suspended') or p_sort not in ('newest', 'oldest', 'last_sign_in') then
    raise exception 'invalid_admin_filter' using errcode = '22023';
  end if;

  return query
  with filtered as (
    select
      u.id as user_id,
      coalesce(u.email, '')::text as email,
      p.display_name,
      u.created_at,
      u.last_sign_in_at,
      coalesce(
        array(select jsonb_array_elements_text(coalesce(u.raw_app_meta_data -> 'providers', '[]'::jsonb))),
        array[]::text[]
      ) as providers,
      p.suspended_at,
      p.suspension_reason,
      p.hunting_limit_override,
      p.shop_limit_override,
      (select count(*) from public.items i where i.owner_id = u.id) as item_count,
      (select coalesce(sum(e.units), 0) from public.usage_events e where e.owner_id = u.id and e.operation = 'hunting_report' and e.occurred_at >= date_trunc('month', now() at time zone 'UTC')) as hunting_used,
      (select coalesce(sum(e.units), 0) from public.usage_events e where e.owner_id = u.id and e.operation = 'shop_pack' and e.occurred_at >= date_trunc('month', now() at time zone 'UTC')) as shop_used
    from auth.users u
    join public.profiles p on p.id = u.id
    where (
      nullif(trim(p_query), '') is null or
      u.id::text = trim(p_query) or
      coalesce(u.email, '') ilike '%' || trim(p_query) || '%' or
      p.display_name ilike '%' || trim(p_query) || '%'
    ) and (
      p_status = 'all' or
      (p_status = 'active' and p.suspended_at is null) or
      (p_status = 'suspended' and p.suspended_at is not null)
    )
  )
  select
    f.user_id,
    f.email,
    f.display_name,
    f.created_at,
    f.last_sign_in_at,
    f.providers,
    f.suspended_at,
    f.suspension_reason,
    f.hunting_limit_override,
    f.shop_limit_override,
    f.item_count,
    f.hunting_used,
    f.shop_used,
    count(*) over() as total_count
  from filtered f
  order by
    case when p_sort = 'oldest' then f.created_at end asc,
    case when p_sort = 'last_sign_in' then f.last_sign_in_at end desc nulls last,
    f.created_at desc
  limit greatest(1, least(p_limit, 100))
  offset greatest(p_offset, 0);
end;
$$;

create function public.admin_list_items(
  p_query text default '',
  p_owner_id uuid default null,
  p_status text default 'all',
  p_moderation text default 'all',
  p_category text default 'all',
  p_sort text default 'newest',
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  item_id uuid,
  owner_id uuid,
  owner_email text,
  owner_name text,
  title text,
  brand text,
  category public.item_category,
  status public.item_status,
  moderation_status public.moderation_status,
  price_cents integer,
  currency char(3),
  created_at timestamptz,
  published_at timestamptz,
  media_count bigint,
  run_count bigint,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if p_status not in ('all', 'draft', 'published', 'reserved', 'sold', 'archived') or
     p_moderation not in ('all', 'pending', 'approved', 'blocked') or
     p_category not in ('all', 'fashion', 'home_design', 'collectibles') or
     p_sort not in ('newest', 'oldest', 'price_high', 'price_low') then
    raise exception 'invalid_admin_filter' using errcode = '22023';
  end if;

  return query
  with filtered as (
    select
      i.id as item_id,
      i.owner_id,
      coalesce(u.email, '')::text as owner_email,
      p.display_name as owner_name,
      i.title,
      i.brand,
      i.category,
      i.status,
      i.moderation_status,
      i.price_cents,
      i.currency,
      i.created_at,
      i.published_at,
      (select count(*) from public.media_assets m where m.item_id = i.id) as media_count,
      (select count(*) from public.analysis_runs r where r.item_id = i.id) as run_count
    from public.items i
    join public.profiles p on p.id = i.owner_id
    join auth.users u on u.id = i.owner_id
    where (p_owner_id is null or i.owner_id = p_owner_id)
      and (p_status = 'all' or i.status::text = p_status)
      and (p_moderation = 'all' or i.moderation_status::text = p_moderation)
      and (p_category = 'all' or i.category::text = p_category)
      and (
        nullif(trim(p_query), '') is null or
        i.id::text = trim(p_query) or
        i.title ilike '%' || trim(p_query) || '%' or
        coalesce(i.brand, '') ilike '%' || trim(p_query) || '%' or
        coalesce(u.email, '') ilike '%' || trim(p_query) || '%' or
        p.display_name ilike '%' || trim(p_query) || '%'
      )
  )
  select
    f.item_id,
    f.owner_id,
    f.owner_email,
    f.owner_name,
    f.title,
    f.brand,
    f.category,
    f.status,
    f.moderation_status,
    f.price_cents,
    f.currency,
    f.created_at,
    f.published_at,
    f.media_count,
    f.run_count,
    count(*) over() as total_count
  from filtered f
  order by
    case when p_sort = 'oldest' then f.created_at end asc,
    case when p_sort = 'price_high' then f.price_cents end desc nulls last,
    case when p_sort = 'price_low' then f.price_cents end asc nulls last,
    f.created_at desc
  limit greatest(1, least(p_limit, 100))
  offset greatest(p_offset, 0);
end;
$$;

alter table public.admin_audit_logs enable row level security;

create policy admin_audit_select on public.admin_audit_logs
for select using (public.is_admin());

drop policy profiles_owner_select on public.profiles;
drop policy profiles_owner_update on public.profiles;
create policy profiles_owner_select on public.profiles for select
using ((id = auth.uid() and not public.is_suspended()) or public.is_admin());
create policy profiles_owner_update on public.profiles for update
using ((id = auth.uid() and not public.is_suspended()) or public.is_admin())
with check ((id = auth.uid() and not public.is_suspended()) or public.is_admin());

drop policy shops_public_select on public.shops;
drop policy shops_owner_insert on public.shops;
drop policy shops_owner_update on public.shops;
drop policy shops_owner_delete on public.shops;
create policy shops_public_select on public.shops for select using (
  is_published or (owner_id = auth.uid() and not public.is_suspended()) or public.is_admin()
);
create policy shops_owner_insert on public.shops for insert with check (
  (owner_id = auth.uid() and not public.is_suspended()) or public.is_admin()
);
create policy shops_owner_update on public.shops for update
using ((owner_id = auth.uid() and not public.is_suspended()) or public.is_admin())
with check ((owner_id = auth.uid() and not public.is_suspended()) or public.is_admin());
create policy shops_owner_delete on public.shops for delete using (
  (owner_id = auth.uid() and not public.is_suspended()) or public.is_admin()
);

drop policy items_public_select on public.items;
drop policy items_owner_insert on public.items;
drop policy items_owner_update on public.items;
drop policy items_owner_delete on public.items;
create policy items_public_select on public.items for select using (
  (owner_id = auth.uid() and not public.is_suspended()) or public.is_admin() or
  (moderation_status = 'approved' and status in ('published', 'reserved') and shop_id in (select s.id from public.shops s where s.is_published))
);
create policy items_owner_insert on public.items for insert with check (
  (owner_id = auth.uid() and not public.is_suspended()) or public.is_admin()
);
create policy items_owner_update on public.items for update
using ((owner_id = auth.uid() and not public.is_suspended()) or public.is_admin())
with check ((owner_id = auth.uid() and not public.is_suspended()) or public.is_admin());
create policy items_owner_delete on public.items for delete using (
  (owner_id = auth.uid() and not public.is_suspended()) or public.is_admin()
);

drop policy media_owner_select on public.media_assets;
drop policy media_owner_insert on public.media_assets;
drop policy media_owner_update on public.media_assets;
drop policy media_owner_delete on public.media_assets;
create policy media_owner_select on public.media_assets for select using (
  (owner_id = auth.uid() and not public.is_suspended()) or public.is_admin() or
  (bucket_id = 'listing-media-public' and is_approved and item_id in (
    select i.id from public.items i where i.moderation_status = 'approved' and i.status in ('published', 'reserved')
  ))
);
create policy media_owner_insert on public.media_assets for insert with check (
  (owner_id = auth.uid() and not public.is_suspended()) or public.is_admin()
);
create policy media_owner_update on public.media_assets for update
using ((owner_id = auth.uid() and not public.is_suspended()) or public.is_admin())
with check ((owner_id = auth.uid() and not public.is_suspended()) or public.is_admin());
create policy media_owner_delete on public.media_assets for delete using (
  (owner_id = auth.uid() and not public.is_suspended()) or public.is_admin()
);

drop policy runs_owner_select on public.analysis_runs;
drop policy runs_owner_insert on public.analysis_runs;
create policy runs_owner_select on public.analysis_runs for select using (
  (owner_id = auth.uid() and not public.is_suspended()) or public.is_admin()
);
create policy runs_owner_insert on public.analysis_runs for insert with check (
  (owner_id = auth.uid() and not public.is_suspended()) or public.is_admin()
);

drop policy reports_owner_select on public.hunting_reports;
create policy reports_owner_select on public.hunting_reports for select using (
  (owner_id = auth.uid() and not public.is_suspended()) or public.is_admin()
);

drop policy comparables_owner_select on public.comparables;
create policy comparables_owner_select on public.comparables for select using (
  report_id in (select h.id from public.hunting_reports h where h.owner_id = auth.uid() and not public.is_suspended()) or public.is_admin()
);

drop policy social_owner_select on public.social_packs;
create policy social_owner_select on public.social_packs for select using (
  (owner_id = auth.uid() and not public.is_suspended()) or public.is_admin()
);

drop policy inquiries_seller_select on public.inquiries;
create policy inquiries_seller_select on public.inquiries for select using (
  (seller_id = auth.uid() and not public.is_suspended()) or public.is_admin()
);

drop policy usage_owner_select on public.usage_events;
create policy usage_owner_select on public.usage_events for select using (
  (owner_id = auth.uid() and not public.is_suspended()) or public.is_admin()
);

drop policy private_storage_owner_select on storage.objects;
drop policy private_storage_owner_insert on storage.objects;
drop policy private_storage_owner_update on storage.objects;
drop policy private_storage_owner_delete on storage.objects;
create policy private_storage_owner_select on storage.objects for select using (
  bucket_id = 'item-media-private' and (storage.foldername(name))[1] = auth.uid()::text and not public.is_suspended()
);
create policy private_storage_owner_insert on storage.objects for insert with check (
  bucket_id = 'item-media-private' and (storage.foldername(name))[1] = auth.uid()::text and not public.is_suspended()
);
create policy private_storage_owner_update on storage.objects for update
using (bucket_id = 'item-media-private' and (storage.foldername(name))[1] = auth.uid()::text and not public.is_suspended())
with check (bucket_id = 'item-media-private' and (storage.foldername(name))[1] = auth.uid()::text and not public.is_suspended());
create policy private_storage_owner_delete on storage.objects for delete using (
  bucket_id = 'item-media-private' and (storage.foldername(name))[1] = auth.uid()::text and not public.is_suspended()
);

revoke all on function public.is_suspended(uuid) from public, anon;
grant execute on function public.is_suspended(uuid) to authenticated, service_role;
revoke all on function public.admin_list_users(text, text, text, integer, integer) from public, anon;
grant execute on function public.admin_list_users(text, text, text, integer, integer) to authenticated, service_role;
revoke all on function public.admin_list_items(text, uuid, text, text, text, text, integer, integer) from public, anon;
grant execute on function public.admin_list_items(text, uuid, text, text, text, text, integer, integer) to authenticated, service_role;
revoke all on public.admin_audit_logs from anon, authenticated;
revoke update, delete, truncate on public.admin_audit_logs from service_role;
grant select on public.admin_audit_logs to authenticated, service_role;
grant insert on public.admin_audit_logs to service_role;

commit;
