-- ============================================================
--  CANTONIMP — Supabase Schema
--  Ejecutá esto en: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- FERIAS
create table if not exists ferias (
  id          text primary key,
  name        text not null,
  location    text,
  date        text,
  notes       text,
  created_at  timestamptz default now()
);

-- PROVEEDORES
create table if not exists suppliers (
  id          text primary key,
  feria_id    text references ferias(id) on delete cascade,
  name        text not null,
  stand       text,
  description text,
  day         text,
  created_at  timestamptz default now()
);

-- ARTÍCULOS
create table if not exists articles (
  id               text primary key,
  feria_id         text references ferias(id) on delete cascade,
  supplier_id      text references suppliers(id) on delete cascade,
  name             text not null,
  rubro            text,
  familia          text,
  description      text,
  price            text,
  currency         text default 'USD',
  cbm_bulto        text,
  kg_bulto         text,
  unidades_x_bulto text,
  min_bultos       text,
  photo            text,
  created_at       timestamptz default now()
);

-- CARGAS
create table if not exists cargas (
  id             text primary key,
  name           text not null,
  container_type text default '40',
  created_at     timestamptz default now()
);

-- ITEMS DE CARGA (article_id → bultos)
create table if not exists carga_items (
  carga_id   text references cargas(id) on delete cascade,
  article_id text references articles(id) on delete cascade,
  bultos     integer default 1,
  primary key (carga_id, article_id)
);

-- FAMILIAS (lista acumulada)
create table if not exists familias (
  name text primary key
);

-- ── Habilitar Realtime en todas las tablas ──────────────────
alter publication supabase_realtime add table ferias;
alter publication supabase_realtime add table suppliers;
alter publication supabase_realtime add table articles;
alter publication supabase_realtime add table cargas;
alter publication supabase_realtime add table carga_items;
alter publication supabase_realtime add table familias;

-- ── Row Level Security (RLS) ────────────────────────────────
-- Por ahora acceso libre (app personal). Podés agregar auth después.
alter table ferias      enable row level security;
alter table suppliers   enable row level security;
alter table articles    enable row level security;
alter table cargas      enable row level security;
alter table carga_items enable row level security;
alter table familias    enable row level security;

create policy "public_all" on ferias      for all using (true) with check (true);
create policy "public_all" on suppliers   for all using (true) with check (true);
create policy "public_all" on articles    for all using (true) with check (true);
create policy "public_all" on cargas      for all using (true) with check (true);
create policy "public_all" on carga_items for all using (true) with check (true);
create policy "public_all" on familias    for all using (true) with check (true);
