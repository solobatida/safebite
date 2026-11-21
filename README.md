# Safe Bite

Mobile app to scan supermarket barcodes and check whether a product is safe for **your** intolerances and allergies. Ingredient names are matched across **English, French, German, Spanish, Italian, Portuguese, Russian, Arabic, and Catalan**.

Full product specification: [SPECIFICATION.md](./SPECIFICATION.md)

**Production (web):** https://solobatida-safebite.expo.app

---

## What we use (and why)

| Layer | Choice | Why |
|-------|--------|-----|
| App | **Expo ~54** + **React Native** + **TypeScript** | One codebase → iOS + Android + web; EAS Hosting for the web app |
| Local test | `npm start` → web or phone | No Xcode/Android Studio required for first tests |
| Database | **Supabase** (Postgres + Auth + RLS) | Accounts, family profiles, avoid-lists, owned custom ingredients |
| Barcode products | **Open Food Facts** | Free community API; coverage varies by country/brand |
| Label fallback | **Camera/photo OCR** (Tesseract.js) | When the barcode is missing or has no ingredients text |
| Guest mode | Memory + `sessionStorage` (web) | Try the app without an account; cleared when the tab/app closes |

**Languages you’ll touch:** TypeScript (app), SQL (Supabase in `supabase/`), JSON-like ingredient seed data.

---

## Step-by-step: run on your computer

### 1. Prerequisites

- **Node.js 20+** — [https://nodejs.org](https://nodejs.org)
- **npm** (comes with Node)
- For phone testing: **Expo Go** from App Store / Play Store

### 2. Install and start

```bash
cd /Users/718575/Projects/app/safebite
npm install
npm start
```

A browser tab opens (Expo Dev Tools). Choose:

- **`w`** — open in **web browser** (good for UI; use demo barcode or type a code on Scan)
- Scan QR with **Expo Go** on your **phone** (real barcode camera)

### 3. Try the app flow

1. **Welcome** → Enter as guest, or Login / Sign up.
2. **Language** (guest) or go straight to preferences after auth.
3. **Preferences** → search e.g. `sorbitol`, `leche`, `gluten` → add to avoid list. Missing term? Use the link under search to add a **custom** ingredient.
4. **Scan** → point at barcode (phone) or type a code (web).
5. If the product is **not in Open Food Facts** (or has no ingredients): use **Foto de los ingredientes**, review the OCR text, then **Comprobar**.

Green / SAFE = no avoided ingredient found. Red / NOT SAFE = match found. Amber **?** = inconclusive (empty avoid list, no ingredients text, network error, etc.).

---

## Scan behaviour (important)

Safe Bite does **not** own a product database. It looks up barcodes in **Open Food Facts**:

| Situation | What you see |
|-----------|----------------|
| Product found + ingredients text | SAFE / NOT SAFE (+ optional “may contain” traces) |
| Product found but **no** ingredients text | Inconclusive → paste or **photo OCR** of the label |
| Barcode **not** in OFF (common for some Italian / local SKUs) | Not found → same manual / photo path |
| Network / timeout | Error + Retry |

**Allergen tags alone never declare SAFE.** Tags and traces can produce positive “not safe / may contain” hits; declaring SAFE requires ingredient text (or a successful manual/OCR check).

---

## Connect Supabase

**Guía detallada en español:** [`supabase/SETUP.md`](./supabase/SETUP.md)

Orden mínimo:

1. [`supabase/schema.sql`](./supabase/schema.sql)
2. `npm run db:seed-sql` → ejecutar [`supabase/seed-ingredients.sql`](./supabase/seed-ingredients.sql)
3. [`supabase/security-hardening.sql`](./supabase/security-hardening.sql) (**obligatorio** — owner de customs + RLS)
4. Copiar URL + anon key a `.env` (`cp .env.example .env`)
5. `npx expo start --clear`

Cada vez que cambies `src/data/ingredients.seed.ts`, regenera y vuelve a aplicar el seed en Supabase. Si el seed de la app y el de la nube divergen, fallan FKs al guardar la lista a evitar.

Optional: Cursor MCP for Supabase is documented in SETUP (query DB from the IDE).

---

## Publish to Apple & Google

Checklist completo (privacidad, EAS env vars, ficha, build, submit):

→ **[`docs/PUBLISH.md`](./docs/PUBLISH.md)**

También: [`docs/privacy-policy.html`](./docs/privacy-policy.html) · [`docs/STORE_LISTING.md`](./docs/STORE_LISTING.md)

Web deploy:

```bash
npm run web:deploy          # export + preview deploy
eas deploy --prod           # promote current export to production
```

---

## Project layout

```
app/                      Screens (Expo Router)
  index.tsx               Welcome
  login.tsx               Email / Google / password reset
  language.tsx            Guest language
  preferences.tsx         Avoid list + custom ingredient
  scan.tsx                Barcode + OCR fallback + result
src/
  data/ingredients.seed.ts   Catalog (code source of truth)
  lib/
    storage.ts            Session, avoid writes (queued), guest mirror
    ingredients.ts        Catalog load, match, custom UUID create
    productCheck.ts       Expand avoid ids, SAFE / inconclusive rules
    openFoodFacts.ts      Barcode fetch + traces + timeout
    ocrIngredients.ts     Tesseract OCR from label photo
  i18n/                   UI translations
supabase/
  schema.sql
  seed-ingredients.sql
  security-hardening.sql  Owner RLS for custom-* ingredients
SPECIFICATION.md          Full product spec
```

---

## Grow the ingredient list

1. Edit `src/data/ingredients.seed.ts`.
2. `npm run db:seed-sql` and run the generated SQL in Supabase.
3. Users can also add **custom** ingredients (`custom-<uuid>`, owned by `created_by`) from Preferences.

---

## Security notes (avoid false SAFE)

- Custom ingredients are **per-user** (`created_by` + UUID id); no shared slug upsert.
- Avoid-list cloud writes are **per item** + serialized queue (no wipe-then-reinsert).
- Orphan avoid rows (old profile id drift) are recovered **once at login**, not inside every read.
- Sign-out clears local session and ingredient cache; falls back to local Supabase sign-out if network fails.
- See [`supabase/security-hardening.sql`](./supabase/security-hardening.sql) and SPECIFICATION §4 / §3.2.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Camera not working on web | Use phone Expo Go, or type barcode + photo OCR |
| Product not found | Missing in Open Food Facts — use photo / paste ingredients |
| OCR empty / garbage | More light, crop to the ingredients block, edit text before check |
| FK / “ingredient not in database” | Re-run `seed-ingredients.sql` after catalog changes |
| Custom ingredient save fails | Run `security-hardening.sql` |
| Module `@/` not found | `npx expo start --clear` |

---

## Next steps you might want

- Scan history per profile
- Stronger OCR / Vision API for hard labels
- Contribute missing products back to Open Food Facts
- RTL layout polish for Arabic
