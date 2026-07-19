begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
values
  ('10000000-0000-4000-8000-000000000001', 'owner@fleai.test', '{"provider":"email","providers":["email"]}', '{"full_name":"Owner"}'),
  ('20000000-0000-4000-8000-000000000002', 'other@fleai.test', '{"provider":"email","providers":["email"]}', '{"full_name":"Other"}'),
  ('30000000-0000-4000-8000-000000000003', 'admin@fleai.test', '{"role":"admin","provider":"email","providers":["email"]}', '{"full_name":"Admin"}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select lives_ok($$
  insert into public.items (id, owner_id, slug, title, category, idempotency_key)
  values ('40000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'sedia-test', 'Sedia test', 'home_design', '41000000-0000-4000-8000-000000000004')
$$, 'owner can insert own item');
select is((select count(*)::integer from public.items where id = '40000000-0000-4000-8000-000000000004'), 1, 'owner reads own draft');

select lives_ok($$
  insert into storage.objects (bucket_id, name, owner_id)
  values ('item-media-private', '10000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000004/test.jpg', '10000000-0000-4000-8000-000000000001')
$$, 'owner can insert under own private prefix');
select throws_ok($$
  insert into storage.objects (bucket_id, name, owner_id)
  values ('item-media-private', '20000000-0000-4000-8000-000000000002/stolen/test.jpg', '10000000-0000-4000-8000-000000000001')
$$, '42501', null, 'owner cannot insert under another prefix');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*)::integer from public.items where id = '40000000-0000-4000-8000-000000000004'), 0, 'other user cannot read owner draft');
select is((select count(*)::integer from storage.objects where name like '10000000-0000-4000-8000-000000000001/%'), 0, 'other user cannot read private media');
select lives_ok($$update public.items set title = 'Rubata' where id = '40000000-0000-4000-8000-000000000004'$$, 'other user update affects no hidden rows');
select lives_ok($$
  insert into public.items (id, owner_id, slug, title, category, idempotency_key)
  values ('60000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000002', 'oggetto-other', 'Oggetto other', 'collectibles', '61000000-0000-4000-8000-000000000006')
$$, 'active user can create own private item');
select throws_ok($$select * from public.admin_list_users()$$, '42501', null, 'non-admin cannot call admin users RPC');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.profiles set suspended_at = now(), suspension_reason = 'Test sospensione' where id = '20000000-0000-4000-8000-000000000002';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*)::integer from public.profiles where id = '20000000-0000-4000-8000-000000000002'), 0, 'suspended user cannot read private profile');
select is((select count(*)::integer from public.items where id = '60000000-0000-4000-8000-000000000006'), 0, 'suspended user cannot read private item');
select throws_ok($$
  insert into public.items (owner_id, slug, title, category, idempotency_key)
  values ('20000000-0000-4000-8000-000000000002', 'vietato-sospeso', 'Vietato', 'collectibles', '62000000-0000-4000-8000-000000000006')
$$, '42501', null, 'suspended user cannot create items');
select throws_ok($$
  insert into storage.objects (bucket_id, name, owner_id)
  values ('item-media-private', '20000000-0000-4000-8000-000000000002/suspended/test.jpg', '20000000-0000-4000-8000-000000000002')
$$, '42501', null, 'suspended user cannot upload private media');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"30000000-0000-4000-8000-000000000003","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select is((select count(*)::integer from public.items where id = '40000000-0000-4000-8000-000000000004'), 1, 'admin claim can audit item');
select is((select title from public.items where id = '40000000-0000-4000-8000-000000000004'), 'Sedia test', 'IDOR update did not change item');
select lives_ok($$
  update public.items set moderation_status = 'approved', status = 'published', shop_id = (select id from public.shops where owner_id = '10000000-0000-4000-8000-000000000001'), published_at = now()
  where id = '40000000-0000-4000-8000-000000000004'
$$, 'admin can publish approved item');
select lives_ok($$update public.shops set is_published = true where owner_id = '10000000-0000-4000-8000-000000000001'$$, 'admin can publish shop');
select ok((select count(*) from public.admin_list_users(p_status => 'suspended')) = 1, 'admin users RPC returns suspended account');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select lives_ok($$
  insert into storage.objects (bucket_id, name)
  values ('listing-media-public', '10000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000004/public.jpg')
$$, 'service role can copy approved public media');
select lives_ok($$
  insert into public.inquiries (listing_id, seller_id, buyer_name, buyer_email, message, idempotency_key)
  values ('40000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Buyer', 'buyer@fleai.test', 'Vorrei prenotare la sedia.', '50000000-0000-4000-8000-000000000005')
$$, 'server can persist inquiry after anti-spam checks');
select lives_ok($$
  insert into public.admin_audit_logs (actor_id, action, target_type, target_id, reason, idempotency_key)
  values ('30000000-0000-4000-8000-000000000003', 'user.suspended', 'user', '20000000-0000-4000-8000-000000000002', 'Test sospensione', '70000000-0000-4000-8000-000000000007')
$$, 'service role can write immutable admin audit');
select throws_ok($$update public.admin_audit_logs set reason = 'Alterato'$$, '42501', null, 'service role cannot rewrite admin audit');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"30000000-0000-4000-8000-000000000003","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select is((select count(*)::integer from public.admin_audit_logs), 1, 'admin can read audit trail');

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is((select count(*)::integer from public.items where id = '40000000-0000-4000-8000-000000000004'), 1, 'anonymous reads published approved item');
select is((select count(*)::integer from public.profiles), 0, 'anonymous cannot read profiles');
select is((select count(*)::integer from public.hunting_reports), 0, 'anonymous cannot read reports');
select is((select count(*)::integer from public.admin_audit_logs), 0, 'anonymous cannot read admin audit');
select is((select count(*)::integer from storage.objects where bucket_id = 'listing-media-public'), 1, 'anonymous reads public listing media');
select is((select count(*)::integer from storage.objects where bucket_id = 'item-media-private'), 0, 'anonymous cannot read private media');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select results_eq($$select buyer_email from public.inquiries$$, $$values ('buyer@fleai.test'::text)$$, 'seller can read buyer email');
select throws_ok($$update public.profiles set hunting_limit_override = 999 where id = '10000000-0000-4000-8000-000000000001'$$, '42501', null, 'owner cannot change quota override');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*)::integer from public.inquiries), 0, 'other user cannot read buyer email or inquiry');

select * from finish();
rollback;
