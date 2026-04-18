create table if not exists email_otps (
  id text primary key,
  email text not null,
  purpose text not null,
  otp_code text not null,
  expires_at timestamptz not null,
  consumed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_email_otps_lookup
  on email_otps (email, purpose, consumed, created_at desc);
