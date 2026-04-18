create table if not exists teacher_registration_requests (
  id text primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  phone text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_role text not null default 'teacher',
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by text,
  rejected_at timestamptz,
  rejected_by text,
  rejection_reason text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_teacher_registration_status
  on teacher_registration_requests (status, requested_at desc);