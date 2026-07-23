begin;

alter type public.item_category add value 'electronics';
alter type public.item_category add value 'art_antiques';
alter type public.item_category add value 'books_comics';
alter type public.item_category add value 'music_instruments';
alter type public.item_category add value 'toys_games';
alter type public.item_category add value 'sports_outdoor';
alter type public.item_category add value 'tools_diy';
alter type public.item_category add value 'other';

create or replace function public.admin_list_items(
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
     (
       coalesce(p_category, '') <> 'all' and
       not exists (
         select 1
         from pg_catalog.pg_enum e
         join pg_catalog.pg_type t on t.oid = e.enumtypid
         join pg_catalog.pg_namespace n on n.oid = t.typnamespace
         where n.nspname = 'public'
           and t.typname = 'item_category'
           and e.enumlabel = p_category
       )
     ) or
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

commit;
