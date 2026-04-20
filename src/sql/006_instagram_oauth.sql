-- AzStore Instagram OAuth foundation
-- Run this after 005_azstore_cleanup.sql.

begin;

alter table users add column if not exists auth_provider text;
alter table users add column if not exists provider_user_id text;
alter table users add column if not exists instagram_username text;
alter table users add column if not exists profile_image_url text;
alter table users add column if not exists instagram_access_token text;
alter table users add column if not exists instagram_token_expires_at timestamptz;

create unique index if not exists idx_users_provider_user_id
  on users (auth_provider, provider_user_id)
  where provider_user_id is not null;

create table if not exists oauth_login_sessions (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  consumed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_oauth_login_sessions_lookup
  on oauth_login_sessions (id, consumed, expires_at desc);

commit;
