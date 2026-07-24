begin;

-- Le pagine pubbliche leggono soltanto un DTO normalizzato lato server.
-- Le tabelle base restano private: RLS filtra righe, non colonne, quindi una
-- policy pubblica su items esporrebbe anche costi e collegamenti ai report.
drop policy if exists shops_public_select on public.shops;
drop policy if exists shops_owner_select on public.shops;
create policy shops_owner_select on public.shops
for select
using (
  (owner_id = auth.uid() and not public.is_suspended())
  or public.is_admin()
);

drop policy if exists items_public_select on public.items;
drop policy if exists items_owner_select on public.items;
create policy items_owner_select on public.items
for select
using (
  (owner_id = auth.uid() and not public.is_suspended())
  or public.is_admin()
);

drop policy if exists media_owner_select on public.media_assets;
create policy media_owner_select on public.media_assets
for select
using (
  (owner_id = auth.uid() and not public.is_suspended())
  or public.is_admin()
);

revoke select on
  public.profiles,
  public.shops,
  public.items,
  public.media_assets,
  public.analysis_runs,
  public.hunting_reports,
  public.comparables,
  public.social_packs,
  public.inquiries,
  public.usage_events,
  public.admin_audit_logs,
  public.listing_reports,
  public.webhook_events
from anon;

-- La segnalazione anonima resta disponibile senza concedere SELECT sulla
-- tabella items o far valutare ad anon funzioni riservate agli account.
create or replace function public.is_public_listing(check_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.items i
    join public.shops s on s.id = i.shop_id
    where i.id = check_listing_id
      and i.status in ('published', 'reserved')
      and i.moderation_status = 'approved'
      and s.is_published
  )
$$;

drop policy if exists listing_reports_anon_insert on public.listing_reports;
create policy listing_reports_anon_insert on public.listing_reports
for insert
with check (public.is_public_listing(listing_id));

revoke all on function public.is_public_listing(uuid) from public;
grant execute on function public.is_public_listing(uuid)
  to anon, authenticated, service_role;

commit;
