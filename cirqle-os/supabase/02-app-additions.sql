-- ============================================================
-- cirqle OS — App Additions
-- Ergänzt 01-cirqle-schema.sql um:
--   1. profiles.is_admin (für Admin-Auth-Guard in der Middleware)
--   2. Write-RLS-Policies für Runs (Admins) & Orders (Owner)
-- Idempotent: kann mehrfach ausgeführt werden.
-- ============================================================

-- ── 1. Admin-Flag ─────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- ── 2. Admin-Check Helper (security definer → keine RLS-Rekursion) ──
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- ── 3. Runs: Admins dürfen anlegen / aktivieren / löschen ─────
drop policy if exists "runs: admin insert" on public.runs;
create policy "runs: admin insert" on public.runs
  for insert with check (public.is_admin());

drop policy if exists "runs: admin update" on public.runs;
create policy "runs: admin update" on public.runs
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "runs: admin delete" on public.runs;
create policy "runs: admin delete" on public.runs
  for delete using (public.is_admin());

-- ── 4. Attendances: Admins sehen alle (für Statistik heute) ───
drop policy if exists "attendances: admin read" on public.attendances;
create policy "attendances: admin read" on public.attendances
  for select using (public.is_admin());

-- ── 5. Profiles: Admins dürfen alle lesen (Scanner zeigt Namen) ──
drop policy if exists "profiles: admin read" on public.profiles;
create policy "profiles: admin read" on public.profiles
  for select using (public.is_admin());

-- ── 6. Orders & Order Items: Owner darf anlegen/lesen (Mock-Checkout) ──
drop policy if exists "orders: own insert" on public.orders;
create policy "orders: own insert" on public.orders
  for insert with check (auth.uid() = user_id);

alter table public.order_items enable row level security;

drop policy if exists "order_items: own read" on public.order_items;
create policy "order_items: own read" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists "order_items: own insert" on public.order_items;
create policy "order_items: own insert" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

-- ── 7. Beispiel: ersten Admin setzen (Email anpassen!) ────────
-- update public.profiles set is_admin = true
-- where email = 'digitalmarketing@myvi.de';
