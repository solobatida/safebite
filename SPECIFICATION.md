# SafeBite — Product Specification

## 1. Vision

**SafeBite** helps people with food intolerances, allergies, or dietary preferences scan supermarket products by barcode and instantly see whether the product is safe for them. Ingredient lists are often in French, German, or other languages; SafeBite matches ingredients against a multilingual database and the user’s personal avoid-list.

**Slogan (examples):** *“Scan. Know. Eat safe.”* / *“Your pocket ingredient translator.”*

---

## 2. Target platforms & store requirements

| Platform | Technology | Store |
|----------|------------|--------|
| iOS | React Native (Expo) | Apple App Store — strict privacy, camera usage strings, no misleading health claims |
| Android | Same codebase | Google Play |

**Apple App Store notes (must follow for approval):**

- Clear **Privacy Policy** URL describing email, preferences, scan history.
- **Camera** permission with a specific reason (barcode only).
- Do **not** claim to be a medical device; use wording like *“informational assistant — always verify the physical label.”*
- Support **Sign in with Apple** if you offer other third-party login (required when using social login).
- Use **HTTPS** for all API/database traffic.
- Localize app UI strings; ingredient DB is separate (multilingual data).

**Recommended stack (this project):**

- **App:** TypeScript + **Expo** (React Native) — one codebase, `npm start` for local test, Expo Go on phone.
- **Database & auth:** **Supabase** (free tier) — PostgreSQL, email/password auth, dashboard, Row Level Security.
- **Product lookup:** **Open Food Facts** API (free, community barcode database).
- **Future:** Crowdsourced ingredient submissions moderated in Supabase.

---

## 3. User flows

### 3.1 Onboarding

1. **Welcome** — Supermarket-style background, cartoon boom/explosion frame with **SafeBite** logo, slogan, **Enter** / **Login**.
2. **Login / Register** — Email + password (min 8 chars) + **name or nickname** for the account holder (e.g. parent). Optional: forgot password (Supabase, future).
3. **Language** — UI language: English, Italian, French, German, Spanish, Portuguese, Russian, Arabic (RTL later). Saved to the account.
4. **Preferences** — Search ingredients with autocomplete; add to avoid list (per active profile in data model). **UI for multiple family profiles is disabled in MVP** (`FEATURES.familyProfiles = false`); enable later without schema changes.

### 3.1.1 Accounts vs family profiles (multi-profile)

One **account** (email + password) represents the household login — typically the parent who registers.

Under that account, the user creates one or more **family profiles**, each with:

| Field | Example |
|-------|---------|
| Display name | `Lucía`, `Marcos`, `Ana`, `Mom` |
| Own avoid-list | Ingredient IDs to block for scans |

**Use cases:**

- A father registers as **Carlos**, then adds profiles **Lucía** (daughter, lactose) and **Marcos** (son, gluten).
- A couple shares one login; profiles **Ana** and **Pierre** keep separate intolerance lists.
- Switching profile in **Preferences** changes which avoid-list is edited and which list is used on **Scan**.

**MVP (local):** profiles and avoid-lists are stored on device per account. Ingredient **catalog** stays in app code (`ingredients.seed.ts`).

**Future (Supabase):** sync `family_profiles` and `user_avoid_ingredients` per profile under `auth.users`.

### 3.2 Scan

1. Open **Scan** tab/screen — camera viewfinder for barcode (EAN-13, UPC).
2. Fetch product from Open Food Facts → parse `ingredients_text` (+ allergens if present).
3. Compare against the **active family profile’s** avoid-list (all language synonyms).
4. Show **product name**, **OK** (green check) or **Not OK** (red X), list of **matched** avoid ingredients.
5. If unknown token in label → prompt: *“Term not found. Add to global dictionary?”* → optional user submission (moderation queue).

### 3.3 Growth / community

- Users can propose new ingredient entries or aliases.
- Admin reviews in Supabase (or simple `status: pending | approved`).
- Optional: fuzzy spell-check (“blue laguna” → suggest “blue lagoon” / reject).

---

## 4. Data model

### 4.1 In the app (MVP)

| Data | Storage |
|------|---------|
| Ingredient catalog (multilingual) | Code: `src/data/ingredients.seed.ts` |
| Account email + password hash | Device (AsyncStorage), later Supabase Auth |
| Account nickname | Device / `profiles.account_nickname` |
| Family profiles (id, display name) | Device / `family_profiles` table |
| Avoid-list per profile | Device / `user_avoid_ingredients` keyed by profile |

### 4.2 Supabase (target)

```sql
-- users handled by auth.users

profiles (
  id uuid PK references auth.users,
  email text,
  account_nickname text not null,   -- e.g. "Carlos", household owner display name
  ui_language text default 'en',
  created_at timestamptz
)

family_profiles (
  id uuid PK default gen_random_uuid(),
  account_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null,       -- e.g. "Lucía", "Mom", child or partner name
  created_at timestamptz not null default now()
)

user_avoid_ingredients (
  id uuid PK,
  family_profile_id uuid not null references public.family_profiles(id) on delete cascade,
  ingredient_id text not null references public.ingredients(id) on delete cascade,
  created_at timestamptz,
  unique(family_profile_id, ingredient_id)
)

ingredients (
  id text PK,           -- slug e.g. corn-starch
  category text,        -- sugars, starches, flours, allergens, fruits, ...
  labels jsonb,         -- { "en": "...", "fr": "...", "ar": "..." }
  aliases text[],
  status text default 'approved'  -- approved | pending
)

ingredient_submissions (
  id uuid PK,
  user_id uuid,
  proposed_labels jsonb,
  category text,
  status text default 'pending',
  created_at timestamptz
)

scan_history (optional v2) (
  id uuid PK,
  user_id uuid,
  barcode text,
  product_name text,
  result text,          -- ok | not_ok | unknown
  matched text[],
  scanned_at timestamptz
)
```

**Row Level Security:** users read global `ingredients` where `status = approved`; read/write only their own `profiles`, `family_profiles`, and `user_avoid_ingredients` (via profiles they own).

---

## 5. Ingredient database

- **Seed:** 150+ canonical ingredients across categories: sugars, sugar alcohols, starches, flours, gluten grains, nuts, dairy, eggs, soy, fish, meat, fruits, vegetables, herbs, additives (E-numbers mapped where useful).
- **Languages in seed:** English, French, German, Spanish, Italian, Portuguese, Russian, Arabic (expand over time).
- **Matching:** normalize (lowercase, strip punctuation), substring + word-boundary check on concatenated label text from product.

---

## 6. Screens (MVP)

| Screen | Route | Purpose |
|--------|-------|---------|
| Welcome | `/` | Branding, Enter, Login |
| Login | `/login` | Email, password, name/nickname; register toggle |
| Language | `/language` | Pick UI language |
| Preferences | `/preferences` | Family profile switcher, autocomplete + avoid list per profile |
| Scan | `/scan` | Barcode + result |
| Tabs layout | `/(app)/` | Post-login shell (future) |

---

## 7. Non-functional requirements

- Offline: cached avoid-list + local ingredient index; scan needs network for barcode API.
- Performance: ingredient search < 100ms on device (in-memory index).
- Security: Supabase Auth; never store plaintext passwords in custom tables.
- Accessibility: sufficient contrast for red/green; don’t rely on color alone (icons + text).

---

## 8. Roadmap

| Phase | Scope |
|-------|--------|
| **MVP (current repo)** | Local auth fallback, seed DB, scan + OFF API, web/iOS/Android via Expo |
| **v1.1** | Supabase auth + sync family profiles and avoid-lists |
| **v1.2** | Submission queue + admin approval |
| **v2** | OCR ingredient photo, scan history, offline product cache |
| **Store** | EAS Build, privacy policy, App Store / Play Console listings |

---

## 9. Legal & UX disclaimer

Display on scan result:

> *SafeBite provides informational suggestions based on barcode databases and your settings. Always read the physical package and consult a healthcare professional for allergies.*

---

## 10. Branding (Welcome screen)

- Background: supermarket shelf gradient (warm lights, product silhouettes).
- Foreground: comic “boom” burst with **SafeBite** wordmark.
- Primary CTA: green **Enter** button; secondary: **Login**.
