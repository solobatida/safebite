# Crear la base de datos en Supabase (SafeBite)

Guía paso a paso. La app sigue usando el catálogo en código (`ingredients.seed.ts`); en Supabase guardas **cuentas**, **perfiles** y **listas a evitar** (cuando conectes auth en la app).

---

## 1. Crear proyecto en Supabase

1. Entra en [https://supabase.com](https://supabase.com) e inicia sesión (GitHub o email).
2. **New project**
3. Nombre: `safebite` (o el que quieras)
4. **Database password**: guárdala en un gestor de contraseñas (solo la usarás para acceso directo a Postgres; la app usa la API).
5. **Region**: elige la más cercana (p. ej. `West EU` si estás en España).
6. Plan **Free** → **Create new project** (tarda 1–2 minutos).

---

## 2. Ejecutar el esquema (tablas)

1. En el panel del proyecto: **SQL** → **New query**
2. Abre el archivo [`schema.sql`](./schema.sql) de este repo, copia **todo** el contenido y pégalo en el editor.
3. Pulsa **Run** (o Ctrl/Cmd + Enter).
4. Debe salir *Success* sin errores.

Crea estas tablas:

- `profiles` — cuenta (email, nickname, idioma UI)
- `family_profiles` — perfiles familiares (futuro)
- `ingredients` — copia del catálogo (para claves foráneas)
- `user_avoid_ingredients` — lista a evitar por perfil
- `ingredient_submissions` — propuestas de usuarios (futuro)

---

## 3. Rellenar ingredientes (seed)

La lista a evitar en la nube referencia `ingredients.id`; hay que cargar el catálogo una vez.

**Opción A — desde tu Mac (recomendado si cambias el seed):**

```bash
cd /Users/718575/Projects/app/safebite
npm install
npm run db:seed-sql
```

Luego en Supabase **SQL** → **New query** → pega el contenido de [`seed-ingredients.sql`](./seed-ingredients.sql) → **Run**.

**Opción B:** solo copiar `seed-ingredients.sql` al SQL Editor si ya está generado en el repo.

Comprueba en **Table Editor** → `ingredients` que hay filas (100+).

---

## 3.1 Vista admin: usuarios + ingredientes a evitar

Para ver en el dashboard **qué usuario tiene qué lista**:

1. **SQL** → **New query**
2. Pega el contenido de [`admin-views.sql`](./admin-views.sql) → **Run**
3. En **Table Editor** aparecen las vistas:
   - `admin_user_avoid_summary` — **1 fila por cuenta**: email, nickname, nº de ingredientes, lista en una columna
   - `admin_user_avoid_list` — **1 fila por ingrediente**: detalle (email + cada ingrediente)

O en SQL Editor:

```sql
select * from public.admin_user_avoid_summary;
select * from public.admin_user_avoid_list;
```

Estas vistas son solo para el panel de Supabase (no las usa la app móvil).

---

## 4. Auth (email / contraseña)

1. **Authentication** → **Providers**
2. **Email** debe estar **Enabled** (por defecto sí).
3. **Confirm email** (por defecto activado en Supabase):
   - Tras registrarse, el usuario debe abrir el enlace del email antes de poder hacer login.
   - Si el login falla con `email_not_confirmed`, la app muestra el aviso y permite **Reenviar email**.
   - Para **desarrollo/pruebas** puedes desactivarlo: **Authentication** → **Sign In / Providers** → **Email** → desmarcar *Confirm email* (no recomendado en producción).

Al registrarse un usuario, el trigger `handle_new_user` crea filas en `profiles` y `family_profiles`.

---

## 5. Claves para la app

1. **Project Settings** (engranaje) → **API**
2. Copia:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public** key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`  
   (no uses la `service_role` en la app móvil)

En la raíz del proyecto:

```bash
cp .env.example .env
```

Edita `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Reinicia Metro:

```bash
npx expo start --clear
```

> **Nota:** Con `.env` configurado, el cliente en `src/lib/supabase.ts` queda activo. El login de la app **sigue en local (AsyncStorage)** hasta que conectemos Supabase Auth en `login.tsx` (próximo paso).

---

## 6. Comprobar que todo está bien

En **SQL Editor**:

```sql
select count(*) from public.ingredients;
select * from public.profiles limit 5;
```

Tras crear un usuario de prueba en **Authentication** → **Users** → **Add user**, deberías ver una fila en `profiles` y otra en `family_profiles`.

---

## Orden de ejecución (resumen)

| Paso | Archivo / acción |
|------|------------------|
| 1 | `schema.sql` en SQL Editor |
| 2 | `npm run db:seed-sql` → `seed-ingredients.sql` en SQL Editor |
| 3 | (Opcional) `admin-views.sql` → vistas de usuarios + listas |
| 4 | `.env` con URL y anon key |

---

## Problemas frecuentes

| Error | Solución |
|-------|----------|
| `relation already exists` | Ya ejecutaste `schema.sql`; no hace falta repetir salvo que borres tablas |
| FK al insertar avoid list | Ejecuta antes `seed-ingredients.sql` |
| La app no lee `.env` | Reinicia con `npx expo start --clear` |
| No aparece perfil tras signup | Revisa que el trigger `on_auth_user_created` exista (final de `schema.sql`) |
| Login 400 `email_not_confirmed` | Abre el enlace del email de confirmación, o desactiva *Confirm email* en Auth (solo dev) |

¿Siguiente paso? Conectar **login** y **lista a evitar** a Supabase cuando quieras; dímelo y lo implementamos en el código.
