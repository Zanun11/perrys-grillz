-- PERRY'S GRILLZ — Supabase setup (run once in your project's SQL editor)
-- Creates shared tables + Row Level Security so the public anon key can ONLY:
--   orders/reservations/reviews: INSERT new rows, SELECT rows, UPDATE order status.
-- Nothing can be deleted through the website key. Phone numbers ARE readable by
-- anyone with the site (needed for the shared kitchen board) — that is the
-- tradeoff of a keyless shared board. For stricter privacy, add Supabase Auth
-- later and tighten the SELECT policies to staff users.

create table if not exists orders (
  id text primary key,
  name text not null,
  phone text not null,
  type text not null default 'Dine-in',
  note text not null default '',
  items jsonb not null default '[]',
  total numeric not null default 0,
  status text not null default 'received',
  created_at timestamptz not null default now()
);

create table if not exists reservations (
  id text primary key,
  name text not null,
  phone text not null,
  date text not null,
  time text not null,
  party text not null default '2 guests',
  note text not null default '',
  status text not null default 'confirmed',
  created_at timestamptz not null default now()
);

create table if not exists reviews (
  id bigint generated always as identity primary key,
  name text not null,
  stars int not null default 5,
  text text not null,
  created_at timestamptz not null default now()
);

alter table orders enable row level security;
alter table reservations enable row level security;
alter table reviews enable row level security;

drop policy if exists "web insert" on orders;
create policy "web insert" on orders for insert to anon with check (true);
drop policy if exists "web read" on orders;
create policy "web read" on orders for select to anon using (true);
drop policy if exists "web status" on orders;
create policy "web status" on orders for update to anon using (true) with check (true);

drop policy if exists "web insert" on reservations;
create policy "web insert" on reservations for insert to anon with check (true);
drop policy if exists "web read" on reservations;
create policy "web read" on reservations for select to anon using (true);

drop policy if exists "web insert" on reviews;
create policy "web insert" on reviews for insert to anon with check (true);
drop policy if exists "web read" on reviews;
create policy "web read" on reviews for select to anon using (true);
