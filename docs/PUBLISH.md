# Publicar SafeBite (checklist)

Pasos para poner la app en **Google Play** y **App Store** a **0,99 €**.

---

## 0. Cuentas

- [ ] [Google Play Console](https://play.google.com/console/) (25 USD, una vez)
- [ ] [Apple Developer Program](https://developer.apple.com/programs/) (99 USD/año)
- [ ] Impuestos + cuenta bancaria en ambas plataformas (para cobrar)

---

## 1. Política de privacidad (URL pública)

Archivo listo: [`privacy-policy.html`](./privacy-policy.html)

1. Abre el HTML y sustituye **`[TU_EMAIL_DE_CONTACTO]`** (y el equivalente en inglés) por tu email real.
2. Publícalo en una URL **https** permanente. Opciones fáciles:
   - **GitHub Pages** (este repo → Settings → Pages → carpeta `/docs`)
   - Netlify / Cloudflare Pages (arrastra el HTML)
3. Anota la URL, p. ej. `https://TU_USUARIO.github.io/safebite/privacy-policy.html`
4. Úsala en App Store Connect, Play Console y en [`STORE_LISTING.md`](./STORE_LISTING.md)

Sin esta URL **no aprueban** la ficha (cámara + cuenta + Supabase).

---

## 2. Variables de entorno en EAS (obligatorio)

El `.env` local **no** va dentro del build de producción. Hay que registrarlas en Expo:

```bash
cd /Users/718575/Projects/app/safebite

# Login si hace falta
npx eas-cli login

# Crea/actualiza secretos del proyecto (usa tus valores reales de Supabase)
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://TU_PROYECTO.supabase.co" --environment production --visibility plaintext
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "TU_ANON_KEY" --environment production --visibility sensitive
```

También añade las mismas para `preview` si vas a probar builds internos:

```bash
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://TU_PROYECTO.supabase.co" --environment preview --visibility plaintext
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "TU_ANON_KEY" --environment preview --visibility sensitive
```

Comprueba en [expo.dev](https://expo.dev) → tu proyecto → **Environment variables**.

Redirect URLs en Supabase (Auth) deben incluir el scheme de la app, p. ej. `safebite://auth/callback` (y el de Expo si lo usas).

---

## 3. Ficha de la store + precio 0,99 €

Textos y guía de capturas: [`STORE_LISTING.md`](./STORE_LISTING.md)

- [ ] Nombre, subtítulo, descripción ES/EN
- [ ] URL de privacidad
- [ ] 4–6 capturas (apto / no apto / lista / bienvenida)
- [ ] Precio **0,99 €** (app de pago)
- [ ] Clasificación por edad / cuestionario de privacidad (cámara solo local; sin tracking de anuncios si no lo usas)

---

## 4. Build production

```bash
# Android (.aab para Play Store)
npx eas-cli build --platform android --profile production

# iOS (.ipa para App Store) — requiere Apple Developer activo
npx eas-cli build --platform ios --profile production
```

Espera a que EAS termine (enlace en la terminal o en expo.dev).

---

## 5. Submit → revisión

```bash
npx eas-cli submit --platform android --profile production
npx eas-cli submit --platform ios --profile production
```

O sube el artefacto a mano en Play Console / Transporter / App Store Connect.

- [ ] Completar cuestionarios (export compliance, contenido, etc.)
- [ ] Enviar a revisión
- [ ] Esperar aprobación (días; a veces piden aclaraciones)

---

## 6. Después del primer release

- [ ] Probar compra/descarga real en un dispositivo
- [ ] Confirmar login Google y escaneo en el build de tienda (no Expo Go)
- [ ] Tener soporte/email de la política de privacidad activo

---

## Orden recomendado

1. Email en la política → publicar HTML → URL  
2. Env vars en EAS  
3. Capturas + textos + precio  
4. Build Android (más simple primero) → submit  
5. Build iOS → submit  
