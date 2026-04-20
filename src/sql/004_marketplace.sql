-- Azerbaijan Instagram Marketplace - core tables

-- Update users role constraint to support shop_owner
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check
  check (role in ('customer','shop_owner','admin'));

-- Update existing role values
update users set role = 'customer' where role = 'student';
update users set role = 'shop_owner' where role = 'teacher';

-- Shops table
create table if not exists shops (
  id            text primary key,
  owner_id      text not null references users(id) on delete cascade,
  name          text not null,
  slug          text unique,
  description   text,
  category      text not null default 'general',
  instagram_url text,
  whatsapp      text,
  logo_url      text,
  cover_url     text,
  location      text,
  delivery_info text,
  is_featured   boolean not null default false,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_shops_category on shops (category) where is_active = true;
create index if not exists idx_shops_featured on shops (is_featured, created_at desc) where is_active = true;
create index if not exists idx_shops_owner on shops (owner_id);

-- Products table
create table if not exists products (
  id           text primary key,
  shop_id      text not null references shops(id) on delete cascade,
  name         text not null,
  description  text,
  price        numeric(10,2),
  category     text,
  image_url    text,
  is_available boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_products_shop on products (shop_id) where is_available = true;
create index if not exists idx_products_category on products (category) where is_available = true;

-- Orders (inquiries) table
create table if not exists orders (
  id                 text primary key,
  shop_id            text not null references shops(id) on delete cascade,
  product_id         text references products(id) on delete set null,
  customer_name      text not null,
  customer_phone     text,
  customer_instagram text,
  note               text,
  status             text not null default 'new'
    check (status in ('new','processing','shipped','delivered','cancelled')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_orders_shop on orders (shop_id, created_at desc);
create index if not exists idx_orders_status on orders (shop_id, status);
