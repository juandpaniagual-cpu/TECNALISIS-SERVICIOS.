-- Migración para agregar fotos/evidencias a una base D1 ya creada.
-- Ejecutar en Cloudflare D1 > Console.

create table if not exists service_photos (
  id text primary key,
  service_order_id text not null references service_orders(id) on delete cascade,
  uploaded_by text not null references users(id),
  file_key text not null unique,
  file_name text not null,
  content_type text not null,
  file_size integer not null default 0,
  caption text,
  created_at text not null
);

create index if not exists idx_photos_order on service_photos(service_order_id);
create index if not exists idx_photos_uploaded_by on service_photos(uploaded_by);
