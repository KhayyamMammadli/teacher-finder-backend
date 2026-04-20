-- AzStore cleanup migration
-- Run this after 004_marketplace.sql in Supabase SQL Editor.

begin;

-- Drop legacy role-related check constraints first to prevent update failures.
do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'users'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table users drop constraint if exists %I', c.conname);
  end loop;
end $$;

-- Normalize legacy roles from the old platform.
update users set role = 'shop_owner' where role = 'teacher';
update users set role = 'customer' where role = 'student';

alter table users add constraint users_role_check
  check (role in ('customer', 'shop_owner', 'admin'));

-- Teacher-specific column is no longer used by AzStore.
alter table users drop column if exists teacher_id;

-- Remove legacy platform tables if they still exist.
drop table if exists bookings cascade;
drop table if exists reviews cascade;
drop table if exists teacher_applications cascade;
drop table if exists teacher_registration_requests cascade;
drop table if exists teachers cascade;

-- Keep AzStore tables fast for dashboard and search queries.
create index if not exists idx_products_name_search on products (name);
create index if not exists idx_orders_created_at on orders (created_at desc);

commit;
