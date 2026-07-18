begin;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pgmq;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault;

create type public.item_category as enum ('fashion', 'home_design', 'collectibles');
create type public.item_status as enum ('draft', 'published', 'reserved', 'sold', 'archived');
create type public.moderation_status as enum ('pending', 'approved', 'blocked');
create type public.ai_run_kind as enum ('hunting_report', 'listing_draft', 'marketing_images', 'social_pack');
create type public.ai_run_status as enum ('queued', 'moderating', 'inspecting', 'researching', 'synthesizing', 'generating', 'rendering', 'needs_input', 'completed', 'failed');
create type public.media_asset_kind as enum ('real', 'clean_ai', 'context_ai', 'try_on_ai', 'social_still', 'social_video');
create type public.comparable_price_type as enum ('asking', 'sold', 'unknown');
create type public.inquiry_status as enum ('new', 'contacted', 'accepted', 'declined', 'closed');

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_path text,
  bio text,
  hunting_limit_override integer check (hunting_limit_override is null or hunting_limit_override >= 0),
  shop_limit_override integer check (shop_limit_override is null or shop_limit_override >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shops (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 100),
  description text,
  logo_path text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  shop_id uuid references public.shops(id) on delete set null,
  source_item_id uuid references public.items(id) on delete set null,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null default '',
  description text not null default '',
  category public.item_category not null,
  status public.item_status not null default 'draft',
  moderation_status public.moderation_status not null default 'pending',
  brand text,
  condition text,
  defects text[] not null default '{}',
  attributes jsonb not null default '{}',
  price_cents integer check (price_cents is null or price_cents >= 0),
  currency char(3) not null default 'EUR',
  asking_price_cents integer check (asking_price_cents is null or asking_price_cents >= 0),
  extra_costs_cents integer not null default 0 check (extra_costs_cents >= 0),
  selected_report_id uuid,
  idempotency_key uuid,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, slug),
  unique (owner_id, idempotency_key)
);

create table public.media_assets (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  kind public.media_asset_kind not null,
  bucket_id text not null check (bucket_id in ('item-media-private', 'listing-media-public')),
  storage_path text not null,
  mime_type text not null,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  byte_size bigint check (byte_size is null or byte_size > 0),
  alt_text text not null default '',
  sort_order smallint not null default 0,
  is_approved boolean not null default false,
  ai_generated boolean not null default false,
  source_asset_id uuid references public.media_assets(id) on delete set null,
  idempotency_key uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket_id, storage_path),
  unique (owner_id, idempotency_key),
  check ((kind = 'real' and ai_generated = false) or (kind <> 'real' and ai_generated = true))
);

create table public.analysis_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  kind public.ai_run_kind not null,
  status public.ai_run_status not null default 'queued',
  progress smallint not null default 0 check (progress between 0 and 100),
  idempotency_key uuid not null,
  provider_request_id text,
  input jsonb not null default '{}',
  result jsonb,
  error_code text,
  attempt_count smallint not null default 0 check (attempt_count between 0 and 3),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, idempotency_key)
);

create table public.hunting_reports (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  run_id uuid not null unique references public.analysis_runs(id) on delete cascade,
  report jsonb not null,
  confidence_score smallint not null check (confidence_score between 0 and 100),
  recommendation text not null check (recommendation in ('buy_to_resell', 'good_potential', 'pass', 'needs_more_info')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.items
  add constraint items_selected_report_fk foreign key (selected_report_id) references public.hunting_reports(id) on delete set null;

create table public.comparables (
  id uuid primary key default extensions.gen_random_uuid(),
  report_id uuid not null references public.hunting_reports(id) on delete cascade,
  title text not null,
  url text not null,
  source_name text not null,
  price_cents integer check (price_cents is null or price_cents >= 0),
  currency char(3) not null,
  price_type public.comparable_price_type not null,
  condition text,
  similarity smallint not null check (similarity between 0 and 100),
  observed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_id, url)
);

create table public.social_packs (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  run_id uuid unique references public.analysis_runs(id) on delete set null,
  status public.ai_run_status not null default 'queued',
  instagram_caption text not null default '',
  tiktok_caption text not null default '',
  hashtags text[] not null default '{}',
  render_provider_id text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inquiries (
  id uuid primary key default extensions.gen_random_uuid(),
  listing_id uuid not null references public.items(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  buyer_name text not null,
  buyer_email text not null,
  message text not null,
  status public.inquiry_status not null default 'new',
  notification_status text not null default 'pending' check (notification_status in ('pending', 'sent', 'failed')),
  closed_at timestamptz,
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.usage_events (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  run_id uuid references public.analysis_runs(id) on delete set null,
  operation text not null check (operation in ('hunting_report', 'shop_pack')),
  units smallint not null default 1 check (units > 0),
  provider text,
  provider_request_id text,
  occurred_at timestamptz not null default now(),
  unique (run_id, operation)
);

create table public.listing_reports (
  id uuid primary key default extensions.gen_random_uuid(),
  listing_id uuid not null references public.items(id) on delete cascade,
  reason text not null,
  details text,
  reporter_email text,
  status text not null default 'new' check (status in ('new', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.webhook_events (
  id uuid primary key default extensions.gen_random_uuid(),
  provider text not null,
  event_id text not null,
  received_at timestamptz not null default now(),
  unique (provider, event_id)
);

create index items_owner_created_idx on public.items (owner_id, created_at desc);
create index items_public_shop_idx on public.items (shop_id, status, published_at desc) where moderation_status = 'approved';
create index media_assets_item_idx on public.media_assets (item_id, sort_order);
create index analysis_runs_owner_created_idx on public.analysis_runs (owner_id, created_at desc);
create index inquiries_seller_status_idx on public.inquiries (seller_id, status, created_at desc);
create index usage_events_owner_month_idx on public.usage_events (owner_id, operation, occurred_at desc);

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger shops_updated_at before update on public.shops for each row execute function public.set_updated_at();
create trigger items_updated_at before update on public.items for each row execute function public.set_updated_at();
create trigger media_assets_updated_at before update on public.media_assets for each row execute function public.set_updated_at();
create trigger analysis_runs_updated_at before update on public.analysis_runs for each row execute function public.set_updated_at();
create trigger hunting_reports_updated_at before update on public.hunting_reports for each row execute function public.set_updated_at();
create trigger comparables_updated_at before update on public.comparables for each row execute function public.set_updated_at();
create trigger social_packs_updated_at before update on public.social_packs for each row execute function public.set_updated_at();
create trigger inquiries_updated_at before update on public.inquiries for each row execute function public.set_updated_at();
create trigger listing_reports_updated_at before update on public.listing_reports for each row execute function public.set_updated_at();

create function public.protect_profile_limits()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.hunting_limit_override is distinct from old.hunting_limit_override or new.shop_limit_override is distinct from old.shop_limit_override)
     and not public.is_admin() and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'admin_only_field' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_limits before update on public.profiles for each row execute function public.protect_profile_limits();

create function public.protect_shop_publication()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_published is distinct from old.is_published
     and not public.is_admin() and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'server_managed_field' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger shops_protect_publication before update on public.shops for each row execute function public.protect_shop_publication();

create function public.protect_publication_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    new.status is distinct from old.status or
    new.moderation_status is distinct from old.moderation_status or
    new.shop_id is distinct from old.shop_id or
    new.published_at is distinct from old.published_at
  ) and not public.is_admin() and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'server_managed_field' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger items_protect_publication before update on public.items for each row execute function public.protect_publication_fields();

create function public.protect_media_publication()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    new.bucket_id is distinct from old.bucket_id or
    new.storage_path is distinct from old.storage_path or
    new.is_approved is distinct from old.is_approved
  ) and not public.is_admin() and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'server_managed_field' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger media_protect_publication before update on public.media_assets for each row execute function public.protect_media_publication();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
begin
  profile_name := coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, 'fleai'), '@', 1), 'Fleai');
  insert into public.profiles (id, display_name) values (new.id, left(profile_name, 100));
  insert into public.shops (owner_id, slug, name)
  values (new.id, 'officina-' || left(replace(new.id::text, '-', ''), 10), left(profile_name || ' · Fleai', 100));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.accept_inquiry(inquiry_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.inquiries;
begin
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

select pgmq.create('fleai_jobs');

create function public.kick_ai_worker()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  null;
end;
$$;

create function public.enqueue_ai_run(run_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  message_id bigint;
begin
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

create function public.read_ai_jobs(batch_size integer default 5)
returns table (msg_id bigint, read_ct bigint, enqueued_at timestamptz, vt timestamptz, message jsonb)
language sql
security definer
set search_path = ''
as $$
  select
    job.msg_id,
    job.read_ct,
    job.enqueued_at,
    job.vt,
    job.message
  from pgmq.read('fleai_jobs', 300, greatest(1, least(batch_size, 10))) as job
$$;

create function public.delete_ai_job(message_id bigint)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select pgmq.delete('fleai_jobs', message_id)
$$;

create or replace function public.kick_ai_worker()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  worker_url text;
  anon_key text;
begin
  select decrypted_secret into worker_url from vault.decrypted_secrets where name = 'fleai_worker_url' limit 1;
  select decrypted_secret into anon_key from vault.decrypted_secrets where name = 'fleai_anon_key' limit 1;
  if worker_url is not null and anon_key is not null then
    perform net.http_post(
      url := worker_url,
      headers := jsonb_build_object('Authorization', 'Bearer ' || anon_key, 'apikey', anon_key, 'Content-Type', 'application/json'),
      body := '{}'::jsonb,
      timeout_milliseconds := 8000
    );
  end if;
exception when others then
  null;
end;
$$;

select cron.schedule('fleai-ai-worker-every-minute', '* * * * *', $cron$select public.kick_ai_worker()$cron$);

create function public.cleanup_fleai_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from storage.objects o
  where o.bucket_id = 'item-media-private'
    and o.created_at < now() - interval '24 hours'
    and not exists (
      select 1 from public.media_assets m
      where m.bucket_id = o.bucket_id and m.storage_path = o.name
    );

  delete from public.media_assets m
  where m.bucket_id = 'item-media-private'
    and m.created_at < now() - interval '24 hours'
    and not exists (
      select 1 from storage.objects o
      where o.bucket_id = m.bucket_id and o.name = m.storage_path
    );

  update public.inquiries
  set buyer_name = 'Dati eliminati', buyer_email = 'deleted+' || id::text || '@invalid.local', message = 'Dati eliminati secondo la retention Fleai.'
  where closed_at < now() - interval '90 days'
    and buyer_email not like 'deleted+%@invalid.local';
end;
$$;

select cron.schedule('fleai-retention-daily', '17 3 * * *', $cron$select public.cleanup_fleai_data()$cron$);

alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.items enable row level security;
alter table public.media_assets enable row level security;
alter table public.analysis_runs enable row level security;
alter table public.hunting_reports enable row level security;
alter table public.comparables enable row level security;
alter table public.social_packs enable row level security;
alter table public.inquiries enable row level security;
alter table public.usage_events enable row level security;
alter table public.listing_reports enable row level security;
alter table public.webhook_events enable row level security;

create policy profiles_owner_select on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_owner_update on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy shops_public_select on public.shops for select using (is_published or owner_id = auth.uid() or public.is_admin());
create policy shops_owner_insert on public.shops for insert with check (owner_id = auth.uid() or public.is_admin());
create policy shops_owner_update on public.shops for update using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy shops_owner_delete on public.shops for delete using (owner_id = auth.uid() or public.is_admin());

create policy items_public_select on public.items for select using (
  owner_id = auth.uid() or public.is_admin() or
  (moderation_status = 'approved' and status in ('published', 'reserved') and shop_id in (select s.id from public.shops s where s.is_published))
);
create policy items_owner_insert on public.items for insert with check (owner_id = auth.uid() or public.is_admin());
create policy items_owner_update on public.items for update using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy items_owner_delete on public.items for delete using (owner_id = auth.uid() or public.is_admin());

create policy media_owner_select on public.media_assets for select using (
  owner_id = auth.uid() or public.is_admin() or
  (bucket_id = 'listing-media-public' and is_approved and item_id in (
    select i.id from public.items i where i.moderation_status = 'approved' and i.status in ('published', 'reserved')
  ))
);
create policy media_owner_insert on public.media_assets for insert with check (owner_id = auth.uid() or public.is_admin());
create policy media_owner_update on public.media_assets for update using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy media_owner_delete on public.media_assets for delete using (owner_id = auth.uid() or public.is_admin());

create policy runs_owner_select on public.analysis_runs for select using (owner_id = auth.uid() or public.is_admin());
create policy runs_owner_insert on public.analysis_runs for insert with check (owner_id = auth.uid() or public.is_admin());
create policy reports_owner_select on public.hunting_reports for select using (owner_id = auth.uid() or public.is_admin());
create policy comparables_owner_select on public.comparables for select using (report_id in (select h.id from public.hunting_reports h where h.owner_id = auth.uid()) or public.is_admin());
create policy social_owner_select on public.social_packs for select using (owner_id = auth.uid() or public.is_admin());
create policy inquiries_seller_select on public.inquiries for select using (seller_id = auth.uid() or public.is_admin());
create policy usage_owner_select on public.usage_events for select using (owner_id = auth.uid() or public.is_admin());
create policy listing_reports_admin_select on public.listing_reports for select using (public.is_admin());
create policy listing_reports_anon_insert on public.listing_reports for insert with check (
  listing_id in (select i.id from public.items i where i.status in ('published', 'reserved') and i.moderation_status = 'approved')
);
create policy webhook_events_admin_all on public.webhook_events for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('item-media-private', 'item-media-private', false, 26214400, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4']),
  ('listing-media-public', 'listing-media-public', true, 26214400, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy private_storage_owner_select on storage.objects for select using (
  bucket_id = 'item-media-private' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy private_storage_owner_insert on storage.objects for insert with check (
  bucket_id = 'item-media-private' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy private_storage_owner_update on storage.objects for update using (
  bucket_id = 'item-media-private' and (storage.foldername(name))[1] = auth.uid()::text
) with check (
  bucket_id = 'item-media-private' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy private_storage_owner_delete on storage.objects for delete using (
  bucket_id = 'item-media-private' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy public_listing_media_read on storage.objects for select using (bucket_id = 'listing-media-public');

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
revoke all on function public.accept_inquiry(uuid) from public, anon;
grant execute on function public.accept_inquiry(uuid) to authenticated, service_role;
revoke all on function public.enqueue_ai_run(uuid) from public, anon;
grant execute on function public.enqueue_ai_run(uuid) to authenticated, service_role;
revoke all on function public.read_ai_jobs(integer) from public, anon, authenticated;
grant execute on function public.read_ai_jobs(integer) to service_role;
revoke all on function public.delete_ai_job(bigint) from public, anon, authenticated;
grant execute on function public.delete_ai_job(bigint) to service_role;
revoke all on function public.kick_ai_worker() from public, anon, authenticated;
grant execute on function public.kick_ai_worker() to service_role;
revoke all on function public.cleanup_fleai_data() from public, anon, authenticated;
grant execute on function public.cleanup_fleai_data() to service_role;

commit;
