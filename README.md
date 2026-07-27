# VISAX AI — Web premium de automatizaciones con IA

Sitio web cinematográfico de **VISAX AI**, agencia que automatiza procesos de negocio con
Inteligencia Artificial (recepcionistas virtuales, agentes de voz, cobros, facturas, contratos,
reservas…). Diseño de lujo inspirado en experiencias tipo _Rolex.com_: scroll suave, WebGL,
animaciones con propósito y una sensación premium en cada píxel.

> **Estado:** ✅ Compila y arranca sin errores (`npm run build` verificado). Todos los textos en
> español. Datos de contacto y webhook ya cableados; métricas y testimonios marcados como
> _placeholder_ para que los sustituyas.

---

## 🚀 Arranque rápido

```bash
npm install      # instala dependencias
npm run dev      # entorno de desarrollo -> http://localhost:3000
npm run build    # build de producción
npm run start    # sirve el build de producción
```

Requisitos: **Node 18.17+** (probado con Node 22).

---

## 🎨 Stack técnico

| Área | Tecnología |
|------|------------|
| Framework | **Next.js 14** (App Router) + React 18 + TypeScript |
| Estilos | **Tailwind CSS** + variables CSS para el sistema de color |
| Scroll de lujo | **Lenis** (smooth scroll con inercia) |
| Animaciones de scroll | **GSAP + ScrollTrigger** |
| Transiciones / gestos | **Framer Motion** |
| 3D / WebGL | **Three.js + React Three Fiber + drei** (con fallback en móvil) |
| Texto letra a letra | **SplitType** |
| Iconos | **lucide-react** |
| Fuentes | `next/font` — **Fraunces** (display serif) + **Inter** (sans) |

---

## ✨ Qué incluye (catálogo de animaciones)

- **Preloader cinematográfico**: el logo dibuja su trazo, contador a 100 % y cortina que revela la web.
- **Scroll suave (Lenis)** en toda la página, sincronizado con GSAP.
- **Hero WebGL**: nube de partículas con degradado de marca + malla wireframe, parallax con el ratón,
  titular con revelado letra a letra. Se degrada con elegancia en móvil y respeta `prefers-reduced-motion`.
- **Cursor personalizado** que crece y muestra etiquetas sobre elementos interactivos.
- **Botones magnéticos** que siguen al cursor.
- **Marquee infinito** de tecnologías (OpenAI, Make, Vapi, Twilio, Slack…).
- **Tarjetas de servicio con tilt 3D** y brillo que sigue al cursor + modal animado de detalle.
- **Sección "Cómo funciona"** con storytelling anclado (sticky/scrub) de 4 pasos.
- **Contadores animados** en la sección de resultados.
- **Comparativa Antes / Después** y bloque persuasivo de beneficios.
- **Testimonios** en carrusel de tarjetas glass.
- **Formulario de reserva** con validación, estados de carga y animación de éxito (POST a Make).
- **FAQ** en acordeón animado.
- **Footer de lujo** con gran logotipo revelado.
- **Barra de progreso de scroll**, **grano animado**, **botón flotante** (reservar + WhatsApp),
  **banner de cookies**, **404 creativa**.

---

## 🛠️ Personalización (lo que debes tocar)

### 1. Contacto, webhook y redes — `lib/site.config.ts`

Es el **único sitio** que necesitas editar para los datos de negocio:

```ts
phone: '+34 622 293 436',
phoneRaw: '+34622293436',
email: 'pabloypepeshopify@gmail.com',
whatsapp: '34622293436',            // vacío '' -> oculta el botón de WhatsApp
makeWebhook: 'https://hook.eu1.make.com/i3sffiqtduc3jhr93kxvvi2j04oejptg',
url: 'https://visax.ai',            // cambia por tu dominio real
social: { instagram: '', linkedin: '', youtube: '', x: '', tiktok: '' },
```

### 2. Colores de marca — `app/globals.css` (bloque `:root`)

Toda la identidad sale de estas variables (extraídas del logo: cian → azul → violeta):

```css
--brand-cyan: #33c6f4;
--brand-blue: #3f7dfb;
--brand-violet: #7c5cff;
--brand-purple: #8b5cf6;
--bg: #06060b;            /* fondo oscuro de lujo */
```

Cámbialas y **todo** (fondos, botones, glows, degradados) se reajusta solo. Si añades tonos nuevos
para clases de Tailwind (`text-brand-*`), replícalos también en `tailwind.config.ts`.

### 3. Servicios — `lib/services.ts`

Título, descripción, "resultado" e integraciones de cada tarjeta, más la lista del marquee de
tecnologías.

### 4. Textos placeholder que conviene sustituir

- **Métricas / resultados** → `components/Stats.tsx` (cifras marcadas como referencia).
- **Testimonios** → `components/Testimonials.tsx` (ejemplos ilustrativos).
- **Aviso legal / Privacidad** → `app/aviso-legal/page.tsx` y `app/privacidad/page.tsx`.

### 5. Logo

El logotipo está reconstruido como **SVG** para poder animarlo:
- Componente reutilizable: `components/ui/Logo.tsx`
- Versión estática (OG/redes): `public/logo.svg`
- Favicon: `app/icon.svg`

Si tienes el logo original en PNG/SVG, colócalo en `public/` y ajusta esos tres archivos.

---

## 🔌 El formulario y el webhook de Make

Los formularios de **reserva** (`components/BookingForm.tsx`) y de **contacto**
(`components/Contact.tsx`) hacen un `POST` con `fetch` al webhook definido en `site.makeWebhook`.

- Los webhooks de Make no devuelven cabeceras CORS, por eso se usa `mode: 'no-cors'` (respuesta
  opaca) y se asume éxito si la petición no lanza error de red — el mismo enfoque que ya funcionaba
  en tu demo.
- El escenario de Make se encarga de **crear el evento en Google Calendar** y **enviar el email de
  confirmación**.
- Si el webhook aún **no está activo**, la web sigue mostrando la animación de éxito (modo demo).
  Para desactivar el envío real, comenta el bloque `await fetch(...)` en esos dos componentes (está
  señalado con comentarios).

Ejemplo de _payload_ enviado:

```json
{
  "nombre": "…",
  "email": "…",
  "telefono": "…",
  "servicio": "Recepcionista Virtual IA",
  "fecha": "2026-01-15",
  "hora": "10:00",
  "mensaje": "…",
  "origen": "web-visax-ai",
  "enviadoEn": "2026-01-10T09:00:00.000Z"
}
```

---

## 📁 Estructura del proyecto

```
app/
  layout.tsx            # fuentes, SEO/metadata, JSON-LD, providers globales
  page.tsx              # one-page (compone todas las secciones)
  template.tsx          # transición de entrada entre páginas
  globals.css           # sistema de color + utilidades + accesibilidad
  servicios/            # subpágina de detalle de servicios
  reservar/             # subpágina de reserva
  aviso-legal/ · privacidad/
  not-found.tsx         # 404 animada
  sitemap.ts · robots.ts · opengraph-image.tsx · icon.svg
components/
  Hero, Marquee, Services, ServiceCard, HowItWorks, WhyAutomate,
  Stats, Testimonials, Schedule, BookingForm, Contact, FAQ, Footer,
  Header, Preloader, ScrollProgress, CookieBanner, FloatingCTA
  providers/  SmoothScroll (Lenis) · CustomCursor
  three/      HeroCanvas (React Three Fiber)
  ui/         Logo · MagneticButton · Reveal · RevealText · SectionHeading · Counter
lib/
  site.config.ts  # ← datos de negocio (teléfono, email, webhook, redes)
  services.ts     # ← servicios y tecnologías
  utils.ts        # helpers (cn, reduced-motion, móvil)
public/
  logo.svg · noise.svg
```

> La documentación de la automatización original en Make.com se conserva en
> [`AUTOMATIZACIONES-MAKE.md`](AUTOMATIZACIONES-MAKE.md) y en las carpetas `blueprints/`, `docs/`,
> `prompts/`, etc.

---

## ▲ Despliegue en Vercel

1. Sube el repositorio a GitHub (esta rama ya vale).
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repo.
3. Vercel detecta **Next.js** automáticamente. No hace falta configurar nada:
   - Build Command: `next build`
   - Output: automático
   - Root Directory: raíz del repo (donde está `package.json`).
4. **Deploy**. En segundos tendrás la URL.
5. Recomendado tras el primer deploy:
   - Añade tu **dominio** en _Settings → Domains_.
   - Actualiza `url` en `lib/site.config.ts` con ese dominio (para SEO, sitemap y Open Graph).

No se necesitan variables de entorno: el webhook y los datos viven en `lib/site.config.ts`.

---

## ♿ Accesibilidad y rendimiento

- Respeta `prefers-reduced-motion` (desactiva scroll con inercia, preloader, grano y animaciones agresivas).
- Foco visible, `aria-label`s y contraste alto sobre fondo oscuro.
- WebGL con menos partículas en móvil y `next/dynamic` (carga diferida) para no penalizar el primer render.
- Fuentes con `display: swap`, imágenes/OG optimizadas, code-splitting por ruta.

---

## 📄 Licencia

Proyecto propietario de VISAX AI. Uso interno.
