# Safe Bite — Product Specification

## 1. Vision

**Safe Bite** helps people with food intolerances, allergies, or dietary preferences scan supermarket products by barcode and instantly see whether the product is safe for them. Ingredient lists are often in French, German, or other languages; Safe Bite matches ingredients against a multilingual database and the user’s personal avoid-list.

**Slogan (examples):** *“Scan. Know. Eat safe.”* / *“Your pocket ingredient translator.”*

---

## 2. Target platforms & store requirements

| Platform | Technology | Store |
|----------|------------|--------|
| iOS | React Native (Expo) | Apple App Store — strict privacy, camera usage strings, no misleading health claims |
| Android | Same codebase | Google Play |

**Apple App Store notes (must follow for approval):**

- Clear **Privacy Policy** URL describing email, preferences, scan history.
- **Camera** permission with a specific reason (barcode **and** ingredient-label photos for OCR).
- Do **not** claim to be a medical device; use wording like *“informational assistant — always verify the physical label.”*
- Support **Sign in with Apple** if you offer other third-party login (required when using social login).
- Use **HTTPS** for all API/database traffic.
- Localize app UI strings; ingredient DB is separate (multilingual data).

**Recommended stack (this project):**

- **App:** TypeScript + **Expo ~54** (React Native) — iOS / Android / web; production web on EAS Hosting.
- **Database & auth:** **Supabase** — PostgreSQL, email/password + Google, dashboard, Row Level Security.
- **Product lookup:** **Open Food Facts** API (free, community barcode database; coverage gaps expected).
- **Label fallback:** on-device **OCR** (Tesseract.js) from a photo of the ingredients list.
- **Future:** Crowdsourced ingredient submissions moderated in Supabase.

---

## 3. User flows

### 3.1 Onboarding

#### 3.1.0 Pantalla de inicio (`/`)

| Elemento | Acción |
|----------|--------|
| **Login / Regístrate** | Navega a `/login` |
| **Entra como amigo** | Navega a `/language?mode=guest` (sin cuenta) |

Si ya hay sesión registrada (no invitado), la app redirige automáticamente a **Preferences**.

#### 3.1.1 Login / Registro (`/login`)

Selector superior: **Login** | **Regístrate**.

| Modo | Campos | Destino tras éxito |
|------|--------|-------------------|
| **Login** | Email + contraseña (mín. 8) | `/preferences` |
| **Regístrate** | Nickname + email + contraseña + idioma UI | `/preferences` |

**Login (Supabase):**

1. `signInWithPassword` (Supabase Auth).
2. Comprobar fila en `public.profiles` — si no existe → error *“Usuario no registrado”*.
3. Construir sesión con `ensureCloudAccountSession()`.

**Registro (Supabase):**

1. `signUp` con metadata `account_nickname` y `ui_language`.
2. Trigger `handle_new_user` crea `profiles` + `family_profiles`.
3. Actualizar `ui_language` en perfil si hace falta.
4. Ir directo a ingredientes (no pantalla de idioma intermedia).

**Fallback local** (sin Supabase): cuentas en AsyncStorage; mismo flujo de campos.

#### 3.1.2 Modo amigo (`/language?mode=guest`)

1. Usuario elige idioma UI.
2. Sesión `isGuest: true` en memoria; en **web** la avoid-list y los customs se espejan en `sessionStorage` para sobrevivir un refresh de la pestaña.
3. Navega a `/preferences` → puede buscar ingredientes, escanear, etc.
4. Al **cerrar la pestaña/app** (o salir del modo amigo), los datos de invitado se pierden. No se sincronizan a Supabase.

#### 3.1.3 Preferencias / ingredientes (`/preferences`)

Flujo común tras login, registro o modo amigo:

- Autocomplete del catálogo seed + customs propios.
- Añadir / quitar de la lista a evitar con escrituras **por ítem** (`addAvoidIngredient` / `removeAvoidIngredient`), encoladas para evitar carreras.
- Si no está en el catálogo: enlace bajo el buscador → crear custom (`custom-<uuid>`) + insert en Supabase con `created_by` (usuario autenticado) o solo local/guest.
- Botón **Ir a escanear**.

---

### 3.1.4 Accounts vs family profiles (multi-profile)

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

**Current:** with Supabase configured, `family_profiles` + `user_avoid_ingredients` sync under `auth.users`. Ingredient **catalog** remains seeded from app code (`ingredients.seed.ts`) and must stay in sync with `public.ingredients` (FK). Local AsyncStorage fallback still exists when cloud is disabled.

On cloud login (`ensureCloudAccountSession`): ensure a default family profile exists; run **one-shot** orphan avoid-list recovery (copy rows from stale profile ids onto the active profile). Recovery must **not** run inside `getAvoidList` reads.

### 3.2 Scan

1. Open **Scan** — camera / web barcode scanner (EAN-13, UPC, etc.) or manual barcode entry on web.
2. Fetch product from Open Food Facts (`api/v2`, ~10s timeout) → parse localized `ingredients_text`, `allergens_tags`, `ingredients_tags`, `traces_tags`, categories.
3. Expand the active avoid-list (e.g. milk → whey/casein…; gluten/wheat → barley/rye/malt…; tree-nuts → almond…).
4. Match text + tags against the catalog (short terms use word-boundary only). Broad OFF tags also match when the user avoids a more specific child (e.g. avoid `almond` ↔ tag `en:nuts`).
5. Result rules (safety-first):
   - **Matched avoid ingredient** → NOT SAFE (list matches).
   - **Traces only** (“may contain”) → NOT SAFE / warning with may-contain list.
   - **No ingredients text** and no positive tag/trace hit → inconclusive (`no_ingredients`) — offer manual entry + **photo OCR**.
   - **Barcode missing / network** → `product_not_found` / `network_error` with retry; still offer manual / OCR when appropriate.
   - **Allergen tags alone never yield SAFE** without ingredient text.
6. **Photo OCR fallback** (`expo-image-picker` + Tesseract.js): user photographs the ingredients block; OCR fills the text field (editable); then the same `checkIngredientsText` path runs. Languages follow UI lang (e.g. `ita+eng` for Italian).
7. Optional unknown-token prompt for dictionary growth (moderation queue future).

**Coverage note:** many local Italian / regional SKUs are absent from Open Food Facts. That is expected; OCR/manual is the supported path until the barcode exists in OFF.

### 3.3 Growth / community

- Users can propose new ingredient entries or aliases.
- Admin reviews in Supabase (or simple `status: pending | approved`).
- Optional: fuzzy spell-check (“blue laguna” → suggest “blue lagoon” / reject).
- Optional: deep-link users to contribute missing barcodes to Open Food Facts.

---

## 4. Data model

### 4.1 In the app

| Data | Storage |
|------|---------|
| Ingredient catalog (multilingual) | Code: `src/data/ingredients.seed.ts` (+ owned `custom-%` from cloud/local) |
| Registered account session | AsyncStorage + Supabase Auth |
| Guest session + avoid-list + customs | Memory; web also `sessionStorage` for refresh |
| Account email + password hash (local fallback) | Device (AsyncStorage) when Supabase off |
| Account nickname | `profiles.account_nickname` |
| Family profiles | `family_profiles` (ensured on login) |
| Avoid-list per profile | `user_avoid_ingredients`; local key per email+profile as fallback |

### 4.2 Supabase (current)

```sql
-- users handled by auth.users

profiles (
  id uuid PK references auth.users,
  email text,
  account_nickname text not null,
  ui_language text default 'en',
  created_at timestamptz
)

family_profiles (
  id uuid PK default gen_random_uuid(),
  account_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null,
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
  id text PK,              -- seed slug OR custom-<uuid>
  category text,
  labels jsonb,
  aliases text[],
  status text default 'approved',
  created_by uuid null references auth.users(id) on delete set null  -- customs only
)

ingredient_submissions (
  id uuid PK,
  user_id uuid,
  proposed_labels jsonb,
  category text,
  status text default 'pending',
  created_at timestamptz
)

-- optional future
scan_history (...)
```

**Row Level Security (after `security-hardening.sql`):**

- Seed ingredients (`id` not like `custom-%`, `status = approved`): readable by everyone.
- Custom ingredients: **select/insert only when `created_by = auth.uid()`**. No update policy (ids are unique UUIDs — never overwrite another user’s row).
- `profiles` / `family_profiles` updates: `using` + `with check` so `id` / `account_id` cannot be reassigned.
- Avoid-list: read/write only for family profiles owned by the user.

**Client write rules:** prefer upsert-ignore / delete-by-id for avoid rows; skip unknown ingredient ids instead of failing the whole batch; never delete-all-then-reinsert.

---

## 5. Ingredient database

- **Seed:** 270+ canonical ingredients (sugars, sugar alcohols, starches, flours, gluten grains, nuts, dairy, eggs, soy, fish/seafood, meats, fruits, vegetables, herbs, additives / E-numbers).
- **Languages in seed:** English, French, German, Spanish, Italian, Portuguese, Russian, Arabic, Catalan.
- **Matching:** normalize (lowercase, diacritics), word-boundary for short terms (≥2), longer terms with boundary preference; OFF tag map + reverse hierarchy (specific avoid ↔ broad allergen tag).
- **Ops:** keep `seed-ingredients.sql` regenerated from the TS seed whenever the catalog changes.

---

## 6. Screens (MVP)

| Screen | Route | Purpose |
|--------|-------|---------|
| Welcome | `/` | Branding; **Login / Regístrate**; **Entra como amigo** |
| Login | `/login` | Toggle Login / Regístrate; auth Supabase o local |
| Language | `/language?mode=guest` | Idioma solo para modo amigo |
| Preferences | `/preferences` | Avoid list, custom ingredient, sign out |
| Scan | `/scan` | Barcode + result + manual / **photo OCR** fallback |
| Auth callback / reset | `/auth/*` | OAuth return + password reset |

---

## 7. Non-functional requirements

- Offline: local catalog + avoid-list cache; barcode lookup and first OCR language packs need network.
- Performance: ingredient search &lt; 100ms on device (in-memory index); OFF fetch timeout ~10s; OCR may take several seconds on first run (download traineddata).
- Security: Supabase Auth; owned customs; queued avoid writes; no plaintext passwords in custom tables; clear ingredient cache on sign-out.
- Accessibility: sufficient contrast for red/green/amber; don’t rely on color alone (icons + text).

---

## 8. Roadmap

| Phase | Scope |
|-------|--------|
| **Done (current)** | Supabase auth + synced avoid-lists, hardening RLS, SAFE rules, OCR label photo, web production on EAS |
| **Next** | Scan history per profile; stronger OCR / Vision; contribute-to-OFF deep link |
| **Later** | Submission queue + admin approval; offline product cache |
| **Store** | EAS Build, privacy policy, App Store / Play Console listings |

---

## 9. Legal & UX disclaimer

Display on scan result:

> *Safe Bite provides informational suggestions based on barcode databases and your settings. Always read the physical package and consult a healthcare professional for allergies.*

---

## 10. Branding (Welcome screen)

- Background: supermarket shelf gradient (warm lights, product silhouettes).
- Foreground: comic “boom” burst with **Safe Bite** wordmark.
- Primary CTA: green **Enter** button; secondary: **Login**.
