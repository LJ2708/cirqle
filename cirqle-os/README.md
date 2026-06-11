# cirqle OS

Loyalty & Community System für den **cirqle** Laufclub.
Next.js 14 (App Router) · Supabase (Frankfurt / eu-central-1) · Vercel.

> **Status:** Phase 1 MVP. Shop nutzt Mock-Checkout (kein Stripe), Wallet-Karte
> als QR-PNG-Download (Apple/Google Wallet folgt in Phase 4).

---

## Seiten

| Route          | Zweck                                                                     | Schutz             |
| -------------- | ------------------------------------------------------------------------- | ------------------ |
| `/join`        | Signup/Login via Magic Link (Name + Email)                                | öffentlich         |
| `/dashboard`   | Punkte, Streak, Tier, Wallet-Karte (QR-PNG Download), Vouchers, Verlauf   | eingeloggt         |
| `/shop`        | Merch Shop, tier-basiertes Locking, Mock-Checkout                         | öffentlich¹        |
| `/admin/scan`  | QR-Scanner, aktiver Run, Statistik heute                                  | `is_admin`         |
| `/admin/runs`  | Runs anlegen / aktivieren / löschen                                       | `is_admin`         |

¹ Kauf erfordert Login (sonst Redirect zu `/join`).

Auth-Guard liegt in [`middleware.ts`](middleware.ts).

---

## Setup

### 1. Dependencies

```bash
npm install
```

### 2. Supabase-Projekt

Lege ein Projekt in **eu-central-1 (Frankfurt)** an und führe im SQL-Editor
nacheinander aus:

1. [`supabase/01-cirqle-schema.sql`](supabase/01-cirqle-schema.sql) — Tabellen,
   RLS, `checkin_user()`, `claim_voucher()`, Seed-Daten.
2. [`supabase/02-app-additions.sql`](supabase/02-app-additions.sql) —
   `profiles.is_admin` + Write-Policies für Runs & Orders.

Danach den ersten Admin freischalten:

```sql
update public.profiles set is_admin = true
where email = 'digitalmarketing@myvi.de';
```

> Hinweis: `is_admin` wird erst gesetzt, **nachdem** sich der User einmal über
> `/join` eingeloggt hat (dann existiert die `profiles`-Zeile).

### 3. Env

```bash
cp .env.local.example .env.local
```

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` und
`NEXT_PUBLIC_APP_URL` aus dem Supabase-Dashboard (Settings → API) eintragen.

### 4. Supabase Auth-Konfiguration

- **Email → Magic Link** aktivieren.
- **Redirect URLs** ergänzen: `http://localhost:3000/auth/callback` und die
  Production-URL (`https://.../auth/callback`).

### 5. Dev

```bash
npm run dev      # http://localhost:3000
npm run build    # Production-Build
npm run typecheck
```

---

## Punkte- & Tier-System (in der DB)

- Pro Run **+100** Punkte, ab 3er-Streak **+50** Bonus (`checkin_user()`).
- Tier **white → pink** bei 3er-Streak **oder** 5 Total-Runs.
- Vouchers via `claim_voucher()` (zieht Punkte ab, stellt Code aus).

Die gesamte Logik liegt als `security definer` Funktionen in der DB — der
Client ruft nur RPCs auf.

---

## Roadmap

- **Phase 2:** Stripe statt Mock-Checkout, Order-Bestätigung per Email.
- **Phase 3:** Partner-Login zum Voucher-Einlösen (`/partner/redeem`).
- **Phase 4:** Apple/Google Wallet (`passkit-generator` + Google Wallet API).
  Die Vorlagen-Routen liegen in `../files.zip → wallet-api-routes.ts`.
