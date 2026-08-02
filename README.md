# SafeBite

Mobile app to scan supermarket barcodes and check whether a product is safe for **your** intolerances and allergies. Ingredient names are matched across **English, French, German, Spanish, Italian, Portuguese, Russian, and Arabic**.

Full product specification: [SPECIFICATION.md](./SPECIFICATION.md)

---

## What we use (and why)

| Layer | Choice | Why |
|-------|--------|-----|
| App | **Expo** + **React Native** + **TypeScript** | One codebase → iOS + Android; test on your phone with Expo Go; publish with EAS Build |
| Local test | `npm start` → web or phone | No Xcode/Android Studio required for first tests |
| Database (production) | **Supabase** (free tier) | PostgreSQL, email/password auth, easy dashboard, good for Apple privacy docs |
| Barcode products | **Open Food Facts** | Free API, millions of EU products |
| MVP auth | **AsyncStorage** on device | Works offline for demo; swap to Supabase when you create a project |

**Languages you’ll touch:** TypeScript (app), SQL (Supabase schema in `supabase/schema.sql`), JSON (ingredient data).

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

- **`w`** — open in **web browser** (good for UI; use demo barcode buttons on Scan screen)
- Scan QR with **Expo Go** on your **phone** (real barcode camera)

### 3. Try the app flow

1. **Welcome** → Enter (guest) or Login (email + password, min 8 chars).
2. **Language** → pick UI language.
3. **Preferences** → search e.g. `sorbitol`, `corn starch`, `gluten` → add to avoid list.
4. **Scan** → on phone, point at barcode; on web, tap **Nutella** demo or type `3017620422003`.

Green = no avoided ingredient found in the label text. Red = match found (shows which terms matched).

---

## Step-by-step: test on your phone (recommended for barcode)

1. Phone and Mac on the **same Wi‑Fi**.
2. Run `npm start`.
3. Open **Expo Go**, scan the QR code.
4. Allow **camera** when asked on the Scan screen.

---

## Connect Supabase (optional, for real accounts + cloud DB)

**Guía detallada en español:** [`supabase/SETUP.md`](./supabase/SETUP.md)

Resumen:

1. Crear proyecto gratis en [https://supabase.com](https://supabase.com).
2. SQL Editor → ejecutar [`supabase/schema.sql`](./supabase/schema.sql).
3. `npm run db:seed-sql` → ejecutar [`supabase/seed-ingredients.sql`](./supabase/seed-ingredients.sql) en SQL Editor.
4. Settings → API → copiar URL y **anon** key a `.env` (`cp .env.example .env`).
5. `npx expo start --clear`

(Supabase auth en la app: preparado en `src/lib/supabase.ts`; login sigue local hasta el siguiente paso de integración.)

**Why Supabase:** free tier, web UI, Row Level Security, fits App Store “account + data” expectations.

---

## Publish to Apple & Google

Checklist completo (privacidad, EAS env vars, ficha 0,99 €, build, submit):

→ **[`docs/PUBLISH.md`](./docs/PUBLISH.md)**

También: [`docs/privacy-policy.html`](./docs/privacy-policy.html) · [`docs/STORE_LISTING.md`](./docs/STORE_LISTING.md)

Resumen: Apple Developer + Google Play, URL de privacidad pública, secretos `EXPO_PUBLIC_SUPABASE_*` en EAS, capturas, precio 0,99 €, `eas build` / `eas submit`.

---

## Project layout

```
app/                 Screens (Expo Router)
  index.tsx          Welcome + boom logo
  login.tsx          Email / password
  language.tsx       UI language
  preferences.tsx    Avoid list + search
  scan.tsx           Barcode + result
src/
  data/              Ingredient seed (100+ items, 8 languages)
  lib/               Matching, Open Food Facts, storage
  i18n/              UI translations
SPECIFICATION.md     Full product spec
supabase/schema.sql  Production database
```

---

## Grow the ingredient list

- Edit `src/data/ingredients.seed.ts` (canonical list).
- Users tap **Add custom ingredient** (saved locally; clears cache on next load).
- Later: sync `ingredients` table in Supabase and approve community submissions.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Camera not working on web | Expected — use phone or demo barcode |
| Product not found | Barcode missing in Open Food Facts; try another product |
| Module `@/` not found | Restart Metro: `npm start -- --clear` |
| Expo permission error on Mac | Run install/start outside restricted folders |

---

## Next steps you might want

- Wire Supabase Auth into `login.tsx`
- Import seed ingredients into Supabase with a script
- OCR photo of ingredient list (v2)
- RTL layout for Arabic

Questions about a step? Say which step (install, phone, Supabase, or store) and we can go deeper.
