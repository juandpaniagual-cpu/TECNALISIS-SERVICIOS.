-- Tecnalisis Servicios - Cloudflare D1
-- Ejecutar en Cloudflare D1 > Console o con Wrangler:
-- wrangler d1 execute tecnalisis-servicios-db --file=cloudflare-d1-schema.sql

PRAGMA foreign_keys = ON;

create table if not exists users (
  id text primary key,
  full_name text not null,
  email text not null unique,
  password_salt text not null,
  password_hash text not null,
  role text not null check (role in ('admin', 'technician', 'engineer')),
  job_title text,
  phone text,
  active integer not null default 1,
  created_at text not null,
  updated_at text not null
);

create table if not exists sessions (
  token text primary key,
  user_id text not null references users(id) on delete cascade,
  expires_at text not null,
  created_at text not null
);

create table if not exists service_orders (
  id text primary key,
  code text not null unique,
  client text not null,
  service_type text not null,
  equipment text not null,
  site text,
  scheduled_date text not null,
  technician_id text references users(id),
  engineer_id text references users(id),
  created_by text references users(id),
  priority text not null default 'Media' check (priority in ('Alta', 'Media', 'Baja')),
  status text not null default 'Pendiente' check (status in ('Pendiente', 'En progreso', 'En revisión', 'Completado')),
  description text,
  created_at text not null,
  updated_at text not null
);

create table if not exists service_updates (
  id text primary key,
  service_order_id text not null references service_orders(id) on delete cascade,
  author_id text not null references users(id),
  note text not null,
  status text,
  created_at text not null
);

create index if not exists idx_users_email on users(email);
create index if not exists idx_users_role on users(role);
create index if not exists idx_sessions_user on sessions(user_id);
create index if not exists idx_sessions_expires on sessions(expires_at);
create index if not exists idx_orders_code on service_orders(code);
create index if not exists idx_orders_status on service_orders(status);
create index if not exists idx_orders_technician on service_orders(technician_id);
create index if not exists idx_orders_engineer on service_orders(engineer_id);
create index if not exists idx_orders_date on service_orders(scheduled_date);
create index if not exists idx_updates_order on service_updates(service_order_id);
