-- ============================================================
-- cirqle OS — Supabase Schema
-- Stack: Supabase (Frankfurt) + Next.js 14 + Vercel
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── Profiles (extends auth.users) ────────────────────────────
create table public.profiles (
  id             uuid references auth.users on delete cascade primary key,
  name           text not null,
  email          text not null,
  total_points   integer not null default 0,
  current_streak integer not null default 0,
  max_streak     integer not null default 0,
  total_runs     integer not null default 0,
  tier           text not null default 'white' check (tier in ('white', 'pink')),
  -- unique wallet token — wird als QR-Code Payload genutzt
  wallet_token   text unique not null default encode(gen_random_bytes(16), 'hex'),
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- Auto-Profile nach Signup anlegen
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Runs (jeder Sunday Run = ein Record) ──────────────────────
create table public.runs (
  id          uuid default gen_random_uuid() primary key,
  date        date not null,
  title       text not null default 'Sunday Run',
  location    text not null default 'Codos, Hannover',
  notes       text,
  -- Admins aktivieren den Run → QR Scanner geht online
  is_active   boolean not null default false,
  -- Wie viele Punkte gibt dieser Run
  points      integer not null default 100,
  created_at  timestamptz default now()
);

-- ── Attendances (Check-in pro Run) ────────────────────────────
create table public.attendances (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references public.profiles(id) on delete cascade not null,
  run_id         uuid references public.runs(id) on delete cascade not null,
  points_earned  integer not null default 100,
  streak_at_time integer not null default 0,
  checked_in_at  timestamptz default now(),
  -- Ein User kann pro Run nur einmal einchecken
  unique(user_id, run_id)
);

-- ── Tier Upgrade Log ──────────────────────────────────────────
create table public.tier_upgrades (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade,
  from_tier   text not null,
  to_tier     text not null,
  reason      text, -- 'streak_3', 'runs_5', 'admin_grant'
  upgraded_at timestamptz default now()
);

-- ── Products (Shop) ───────────────────────────────────────────
create table public.products (
  id             uuid default gen_random_uuid() primary key,
  name           text not null,
  description    text,
  price_cents    integer not null, -- Preis in Cent (z.B. 2990 = €29.90)
  color          text, -- 'white', 'pink', 'black'
  category       text not null, -- 'shirt', 'cap', 'hoodie', 'accessory'
  -- null = alle können kaufen | 'pink' = nur Inner Circle
  tier_required  text default null,
  -- Punkte die man für dieses Produkt braucht um es FREIZUSCHALTEN (nicht kaufen)
  points_to_unlock integer default null,
  image_url      text,
  stripe_price_id text, -- Stripe Price ID für Checkout
  sizes          text[] default array['S','M','L','XL'],
  in_stock       boolean not null default true,
  sort_order     integer default 0,
  created_at     timestamptz default now()
);

-- ── Orders ────────────────────────────────────────────────────
create table public.orders (
  id                uuid default gen_random_uuid() primary key,
  user_id           uuid references public.profiles(id) not null,
  stripe_session_id text unique,
  total_cents       integer not null,
  status            text not null default 'pending'
                    check (status in ('pending', 'paid', 'shipped', 'cancelled')),
  shipping_name     text,
  shipping_address  text,
  shipping_city     text,
  shipping_zip      text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create table public.order_items (
  id         uuid default gen_random_uuid() primary key,
  order_id   uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  quantity   integer not null default 1,
  size       text,
  price_cents integer not null
);

-- ── Partners & Vouchers ───────────────────────────────────────
create table public.partners (
  id          uuid default gen_random_uuid() primary key,
  name        text not null, -- 'Codos', 'Bestia', ...
  logo_url    text,
  description text,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

create table public.voucher_types (
  id          uuid default gen_random_uuid() primary key,
  partner_id  uuid references public.partners(id),
  title       text not null, -- 'Gratis Kaffee', '2-für-1 Pizza'
  description text,
  points_cost integer not null, -- Punkte die der User einlöst
  -- Tier-Requirement für bestimmte Voucher (null = alle)
  tier_required text default null,
  valid_days  integer default 7, -- Voucher gilt X Tage nach Ausstellung
  is_active   boolean default true,
  total_available integer default null, -- null = unlimited
  created_at  timestamptz default now()
);

create table public.user_vouchers (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references public.profiles(id) on delete cascade,
  voucher_type_id uuid references public.voucher_types(id),
  -- Kurzer Code den der Partner scannt
  code            text unique not null default upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 8)),
  redeemed        boolean not null default false,
  redeemed_at     timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz default now()
);

-- ── Wallet Passes (Apple & Google) ────────────────────────────
create table public.wallet_passes (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references public.profiles(id) on delete cascade unique,
  platform      text not null check (platform in ('apple', 'google', 'both')),
  serial_number text unique not null default encode(gen_random_bytes(16), 'hex'),
  -- Für Apple Wallet Push Updates
  push_token    text,
  last_updated  timestamptz default now()
);

-- ── RLS Policies ──────────────────────────────────────────────
alter table public.profiles         enable row level security;
alter table public.attendances      enable row level security;
alter table public.orders           enable row level security;
alter table public.user_vouchers    enable row level security;
alter table public.wallet_passes    enable row level security;
alter table public.runs             enable row level security;
alter table public.products         enable row level security;
alter table public.voucher_types    enable row level security;
alter table public.partners         enable row level security;
alter table public.tier_upgrades    enable row level security;

-- Profiles: User sieht nur sich selbst
create policy "profiles: own read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: own update" on public.profiles for update using (auth.uid() = id);

-- Attendances: User sieht nur seine eigenen
create policy "attendances: own"     on public.attendances for select using (auth.uid() = user_id);

-- Orders: User sieht nur seine eigenen
create policy "orders: own"          on public.orders for select using (auth.uid() = user_id);

-- Vouchers: User sieht nur seine eigenen
create policy "uv: own"              on public.user_vouchers for select using (auth.uid() = user_id);

-- Runs, Products, Partners, Voucher Types: Public read
create policy "runs: public"         on public.runs for select using (true);
create policy "products: public"     on public.products for select using (true);
create policy "partners: public"     on public.partners for select using (true);
create policy "vt: public"           on public.voucher_types for select using (true);

-- ── Check-in Function (aufgerufen von Admin-App) ──────────────
-- Nimmt wallet_token entgegen, trägt Attendance ein, berechnet Punkte + Streak
create or replace function public.checkin_user(
  p_wallet_token text,
  p_run_id       uuid
)
returns jsonb
language plpgsql security definer
as $$
declare
  v_profile       public.profiles;
  v_run           public.runs;
  v_points        integer;
  v_streak        integer;
  v_new_tier      text;
  v_bonus_points  integer := 0;
begin
  -- 1. User per Wallet Token finden
  select * into v_profile from public.profiles where wallet_token = p_wallet_token;
  if not found then
    return jsonb_build_object('success', false, 'error', 'User nicht gefunden');
  end if;

  -- 2. Run validieren
  select * into v_run from public.runs where id = p_run_id and is_active = true;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Run nicht aktiv');
  end if;

  -- 3. Bereits eingecheckt?
  if exists (select 1 from public.attendances where user_id = v_profile.id and run_id = p_run_id) then
    return jsonb_build_object('success', false, 'error', 'Bereits eingecheckt');
  end if;

  -- 4. Streak berechnen
  -- Letzter Run des Users → War er beim vorherigen dabei?
  v_streak := v_profile.current_streak + 1;

  -- 5. Punkte berechnen
  v_points := v_run.points;
  -- Streak Bonus ab 3er Streak
  if v_streak >= 3 then
    v_bonus_points := 50;
  end if;

  -- 6. Attendance eintragen
  insert into public.attendances (user_id, run_id, points_earned, streak_at_time)
  values (v_profile.id, p_run_id, v_points + v_bonus_points, v_streak);

  -- 7. Profil updaten
  update public.profiles set
    total_points   = total_points + v_points + v_bonus_points,
    current_streak = v_streak,
    max_streak     = greatest(max_streak, v_streak),
    total_runs     = total_runs + 1,
    updated_at     = now()
  where id = v_profile.id;

  -- 8. Tier Upgrade prüfen (3er Streak ODER 5 Total Runs)
  v_new_tier := v_profile.tier;
  if v_profile.tier = 'white' and (v_streak >= 3 or (v_profile.total_runs + 1) >= 5) then
    v_new_tier := 'pink';
    update public.profiles set tier = 'pink' where id = v_profile.id;
    insert into public.tier_upgrades (user_id, from_tier, to_tier, reason)
    values (v_profile.id, 'white', 'pink',
      case when v_streak >= 3 then 'streak_3' else 'runs_5' end);
  end if;

  -- 9. Wallet Pass Update triggern (via Realtime/Webhook)
  -- → Next.js API Route lauscht auf diese Notification
  perform pg_notify('wallet_update', json_build_object(
    'user_id',    v_profile.id,
    'new_tier',   v_new_tier,
    'points',     v_profile.total_points + v_points + v_bonus_points,
    'streak',     v_streak
  )::text);

  return jsonb_build_object(
    'success',        true,
    'name',           v_profile.name,
    'points_earned',  v_points + v_bonus_points,
    'bonus_points',   v_bonus_points,
    'new_total',      v_profile.total_points + v_points + v_bonus_points,
    'streak',         v_streak,
    'tier',           v_new_tier,
    'tier_upgraded',  v_new_tier != v_profile.tier
  );
end;
$$;

-- ── Voucher einlösen ──────────────────────────────────────────
create or replace function public.claim_voucher(
  p_user_id       uuid,
  p_voucher_type  uuid
)
returns jsonb
language plpgsql security definer
as $$
declare
  v_vtype  public.voucher_types;
  v_profile public.profiles;
  v_code   text;
  v_exp    timestamptz;
begin
  select * into v_vtype from public.voucher_types where id = p_voucher_type and is_active = true;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Voucher nicht verfügbar');
  end if;

  select * into v_profile from public.profiles where id = p_user_id;

  -- Punkte ausreichend?
  if v_profile.total_points < v_vtype.points_cost then
    return jsonb_build_object('success', false, 'error', 'Nicht genug Punkte');
  end if;

  -- Tier OK?
  if v_vtype.tier_required is not null and v_profile.tier != v_vtype.tier_required then
    return jsonb_build_object('success', false, 'error', 'Tier nicht ausreichend');
  end if;

  -- Punkte abziehen
  update public.profiles set
    total_points = total_points - v_vtype.points_cost,
    updated_at   = now()
  where id = p_user_id;

  v_exp := now() + (v_vtype.valid_days || ' days')::interval;

  -- Voucher ausstellen
  insert into public.user_vouchers (user_id, voucher_type_id, expires_at)
  values (p_user_id, p_voucher_type, v_exp)
  returning code into v_code;

  return jsonb_build_object(
    'success',     true,
    'code',        v_code,
    'expires_at',  v_exp
  );
end;
$$;

-- ── Seed Data ─────────────────────────────────────────────────

-- Partner
insert into public.partners (name, description) values
  ('Codos', 'Speciality Coffee in Hannover'),
  ('Bestia', 'Pizza & Drinks in Hannover');

-- Voucher Types
insert into public.voucher_types (partner_id, title, description, points_cost, valid_days)
select p.id, 'Gratis Kaffee', 'Ein Kaffee deiner Wahl bei Codos — kostenlos', 150, 7
from public.partners p where p.name = 'Codos';

insert into public.voucher_types (partner_id, title, description, points_cost, valid_days)
select p.id, '2-für-1 Kaffee', 'Zwei zum Preis von einem bei Codos', 250, 14
from public.partners p where p.name = 'Codos';

insert into public.voucher_types (partner_id, title, description, points_cost, valid_days, tier_required)
select p.id, 'Gratis Pizza', 'Eine Pizza bei Bestia — nur für Inner Circle', 500, 30, 'pink'
from public.partners p where p.name = 'Bestia';

-- Products
insert into public.products (name, description, price_cents, color, category, tier_required, image_url, sort_order) values
  ('cirqle Tee — White', 'Unser klassisches Run-Shirt. Lightweight, atmungsaktiv.', 2990, 'white', 'shirt', null, '/shop/tee-white.jpg', 1),
  ('cirqle Cap — White', 'Clean Cap mit gesticktem cirqle Logo.', 2490, 'white', 'cap', null, '/shop/cap-white.jpg', 2),
  ('cirqle Hoodie — White', 'Post-Run Comfort. Organic Cotton.', 5990, 'white', 'hoodie', null, '/shop/hoodie-white.jpg', 3),
  ('cirqle Tee — Pink', 'Das Inner Circle Shirt. Nur für die Day Ones.', 2990, 'pink', 'shirt', 'pink', '/shop/tee-pink.jpg', 4),
  ('cirqle Cap — Pink', 'Inner Circle Cap. Du weißt, wer du bist.', 2490, 'pink', 'cap', 'pink', '/shop/cap-pink.jpg', 5);

-- Erster Run (Beispiel — Next Sunday)
insert into public.runs (date, title, location, is_active) values
  (current_date + (7 - extract(dow from current_date)::integer % 7), 'Sunday Run #1', 'Codos, Hannover', false);
