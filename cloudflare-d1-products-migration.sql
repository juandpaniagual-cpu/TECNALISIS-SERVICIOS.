-- Migración para agregar venta de productos/insumos a Tecnalisis Servicios.
-- Ejecutar en Cloudflare D1 > Console.

create table if not exists service_products (
  id text primary key,
  service_order_id text not null references service_orders(id) on delete cascade,
  product_name text not null,
  quantity real not null default 1,
  unit text not null default 'unidad',
  unit_price real not null default 0,
  total_price real not null default 0,
  notes text,
  created_at text not null
);

create index if not exists idx_products_order on service_products(service_order_id);
