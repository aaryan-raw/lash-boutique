export const SCHEMA = `
create table if not exists products (
  id text primary key, slug text not null unique, name text not null, description text not null default '',
  category text not null, collections jsonb not null default '[]', price integer not null check (price >= 0), sale_price integer check (sale_price >= 0),
  images jsonb not null default '[]', attributes jsonb not null default '{}', featured boolean not null default false,
  new_arrival boolean not null default false, bestseller boolean not null default false,
  status text not null default 'active' check (status in ('active','inactive')), created_at timestamptz not null default now());
create table if not exists variants (
  sku text primary key, product_id text not null references products(id) on delete cascade,
  size text not null, colour text not null, stock integer not null default 0 check (stock >= 0));
create table if not exists orders (
  id text primary key, ref text not null unique, status text not null, payment_method text not null, payment_status text not null,
  customer jsonb not null, address jsonb not null, subtotal integer not null, shipping integer not null, discount integer not null default 0, total integer not null,
  idem_key text not null unique, gateway_order_id text unique, gateway_payment_id text, consent_at timestamptz not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists order_items (
  order_id text not null references orders(id) on delete cascade, sku text not null, name text not null, size text not null, colour text not null,
  unit_price integer not null, qty integer not null check (qty > 0));
create table if not exists order_events (
  id bigserial primary key, order_id text not null references orders(id) on delete cascade, status text not null, note text not null default '',
  actor text not null, at timestamptz not null default now());
create table if not exists settings (key text primary key, value jsonb not null);
create index if not exists orders_created_idx on orders (created_at desc);
`;
