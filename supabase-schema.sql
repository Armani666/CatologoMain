create table if not exists public.products (
  id bigint primary key,
  name text not null,
  brand text not null,
  category text not null,
  type text not null,
  description text not null default '',
  stock integer not null default 0,
  tone text not null default '',
  price numeric null,
  image_url text not null default '',
  reference_url text not null default '',
  is_active boolean not null default true,
  image_key text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
add column if not exists is_active boolean not null default true;

create or replace function public.set_products_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;

create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_products_updated_at();

alter table public.products enable row level security;

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read"
on public.products
for select
to anon, authenticated
using (true);

drop policy if exists "products_public_write" on public.products;
create policy "products_authenticated_write"
on public.products
for all
to authenticated
using (true)
with check (true);
