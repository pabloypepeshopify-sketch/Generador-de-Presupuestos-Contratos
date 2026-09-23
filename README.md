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
| 3D / WebGL | **Three.js + React Three Fiber + postprocessing (bloom)** — completo en escritorio, ligero en móvil, HTML sin GPU |
| Texto letra a letra | **SplitType** |
| Iconos | **lucide-react** |
| Fuentes | `next/font` — **Fraunces** (display serif) + **Inter** (sans) |

---

## ✨ Qué incluye (catálogo de animaciones)

- **Intro 3D**: el isotipo VISAX en metal 3D aparece rodeado de un remolino de partículas que **explota** en un destello; después entra el titular. En escritorio, la primera visita de la sesión la precede un fundido del logo mientras carga la escena.
- **Scroll suave (Lenis)** en toda la página, sincronizado con GSAP.
- **Aberración cromática de marca** (solo escritorio): al hacer scroll, el titular de la sección que
  entra se separa en violeta/cian según la velocidad (máx. 3 px, 0 en reposo, vuelve a 0 en ~200 ms).
  Es el efecto más prescindible: se quita eliminando `startChroma()` en `SmoothScroll`.
- **Experiencia 3D (hero + servicios)** — `components/Experience.tsx` + `components/three/`:
  un canvas fijo detrás del contenido. Tras la explosión, las partículas forman una nube detrás
  del titular con el logo 3D girando; al hacer scroll se transforman en "corales" violeta/cian y la
  cámara vuela por un pasillo con los **9 servicios como tarjetas de cristal**, con un índice a la
  izquierda (píldoras en móvil), "Ver detalle" y clic sobre la tarjeta. Al salir de servicios el
  canvas se desvanece y deja de renderizar. Solo colores de la paleta.
  - Escritorio: ~42 000 partículas + bloom. Móvil: ~12 000, sin bloom.
  - Sin 3D (HTML de siempre): `prefers-reduced-motion`, equipos modestos (<4 núcleos / <2 GB) o
    WebGL por software sin GPU. `?xp3d` en la URL lo fuerza para pruebas.
- **Cursor personalizado** que crece y muestra etiquetas sobre elementos interactivos.
- **Botones magnéticos** que siguen al cursor.
- **Marquee infinito** de tecnologías (OpenAI, Make, Vapi, Twilio, Slack…).
- **Tarjetas de servicio (versión HTML)**: entrada escalonada, tilt 3D ≤ 6°, escala 1,02 y glow
  violeta al hover/foco (sin tilt con teclado), parallax lateral en escritorio + modal de detalle.
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
phone: '656 999 241',
phoneRaw: '+34656999241',
email: 'contactovisaxai@gmail.com',
whatsapp: '34656999241',            // vacío '' -> oculta el botón de WhatsApp
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

## 🔌 Reserva de citas con disponibilidad en vivo

El formulario de reserva (`components/BookingForm.tsx`) funciona en **dos pasos** conectados a
**dos escenarios de Make** ("citas por correo"):

**Paso 1 — Disponibilidad** (`site.availabilityWebhook`)
El usuario elige un día en el calendario (fines de semana y días pasados bloqueados, sin escribir a
mano). Al elegirlo, la web hace `POST` con `{ "fecha": "YYYY-MM-DD" }` y **lee** la respuesta JSON:

```json
{
  "inicio": "09:00",
  "fin": "18:00",
  "duracion": 45,
  "ocupadas_inicio": "2026-01-15T10:30:00,2026-01-15T12:00:00",
  "ocupadas_fin": "2026-01-15T11:15:00,2026-01-15T12:45:00"
}
```

Con eso genera los tramos (`inicio` → `fin` en pasos de `duracion` min). Los que se solapan con una
franja ocupada salen **tachados y en gris ("Reservado")**; el resto, clicables.

> ⚠️ **CORS obligatorio aquí.** Para que el navegador pueda **leer** esta respuesta, el módulo
> **"Webhook response"** de ese escenario en Make debe devolver la cabecera
> `Access-Control-Allow-Origin: *`. Si no, las horas no cargarán (verás un aviso con botón de
> reintentar). `ocupadas_inicio` / `ocupadas_fin` pueden venir **vacíos** = todo libre.

**Paso 2 — Reserva** (`site.makeWebhook`)
El usuario clica una hora libre, pone **nombre + email** (teléfono opcional) y envía. Se hace `POST`
con `mode: 'no-cors'` (envío garantizado) de:

```json
{ "nombre": "…", "email": "…", "telefono": "…", "fecha": "2026-01-15", "hora": "10:30" }
```

El escenario **crea el evento en Google Calendar** y **envía el email de confirmación**. Tras el
envío, la web muestra la confirmación y **vuelve a consultar la disponibilidad** (con unos segundos
de margen) para que la hora recién reservada aparezca ya tachada.

Ambos webhooks se configuran en `lib/site.config.ts`. El formulario de **contacto**
(`components/Contact.tsx`) sigue usando `site.makeWebhook` con `no-cors`.

### 🧪 Probarlo sin instalar nada

En `demo/reserva-citas-demo.html` tienes el **mismo flujo en un solo archivo HTML** conectado a los
webhooks reales. Ábrelo con doble clic en el navegador para comprobar al instante si la
disponibilidad carga (CORS) y si la reserva llega a Make.

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
  three/      Experience (escena), particles, logo, cards, Effects (bloom)
  ui/         Logo · MagneticButton · Reveal · RevealText · SectionHeading · Counter
lib/
  site.config.ts  # ← datos de negocio (teléfono, email, webhook, redes)
  services.ts     # ← servicios y tecnologías
  utils.ts        # helpers (cn, reduced-motion, móvil, canUseWebGL)
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
- 3D cargado con `next/dynamic` (en móvil, en un momento ocioso); el bloom solo se descarga en escritorio. Tope de 60 fps, DPR ≤ 1,5 (1,25 en móvil), pausa con la pestaña oculta o al salir de servicios. Partículas animadas en GPU (cero trabajo por partícula en CPU).
- Fuentes con `display: swap`, imágenes/OG optimizadas, code-splitting por ruta.

---

## 📄 Licencia

Proyecto propietario de VISAX AI. Uso interno.
