# VISAX AI · Web (visaxai.es)

Web de **VISAX AI**, el socio tecnológico de las empresas por suscripción mensual:
analizamos, detectamos, implementamos y seguimos mejorando.
*Tu socio tecnológico. Tu empresa, en constante evolución.*

## Arranque

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # compilación de producción
npm run lint
```

Requisitos: Node 18.17+.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- framer-motion (animaciones suaves, respeta `prefers-reduced-motion`) y lucide-react (iconos)
- Tipografía Geist servida desde el repo (`app/fonts`, licencia OFL)
- Formularios → rutas `app/api/*` → webhooks de **n8n** → Gmail y Google Calendar

## Dónde se cambia cada cosa

| Qué | Archivo |
|---|---|
| Teléfonos, email, zona, fundadores, lema, datos legales | `lib/site.config.ts` |
| **Planes y precios** (`price: null` = «Precio a medida») | `config/plans.ts` |
| Secciones ocultas (testimonios) y marcas «TODO: confirmar» | `config/flags.ts` |
| Textos de la portada (mensajes clave, problema, capacidades, fases, por qué) | `content/home.ts` |
| Sectores y ejemplos | `content/sectores.ts` |
| Preguntas frecuentes (`a: null` + `pending` = sin respuesta confirmada) | `content/faq.ts` |
| Colores, radios, sombras (design tokens) | `styles/tokens.css` |
| Logotipo | `lib/brand.ts` |

Las preguntas o datos marcados como pendientes solo se ven **fuera de producción** (vista previa y local), con una etiqueta «TODO: confirmar». En visaxai.es no aparecen.

## Formularios (n8n)

La web no llama a n8n desde el navegador: lo hacen las rutas del servidor.

| Ruta de la web | Webhook de n8n | Flujo de n8n |
|---|---|---|
| `POST /api/diagnostico` | `…/diagnostico` | «VISAX AI · Web · Diagnóstico → Gmail» |
| `POST /api/visitas/disponibilidad` | `…/visitas/disponibilidad` | «VISAX AI · Web · Visitas → Google Calendar y Gmail» |
| `POST /api/visitas/reservar` | `…/visitas/reservar` | (mismo flujo) |

- La URL base de los webhooks va en la variable de entorno **`N8N_WEBHOOK_BASE`** del proyecto de Vercel (no está en el código).
- Cada solicitud se guarda en la Data Table de n8n `visaxai_solicitudes_web` y llega un correo a contactovisaxai@gmail.com.
- El horario de visitas (días, horas, duración, margen, antelación) se cambia en los nodos de código del flujo de visitas (objeto `A`). Si lo cambias, ajusta también `MAX_DIAS` en `components/sections/VisitaReserva.tsx`.
- Antispam: campo trampa invisible y tiempo mínimo de relleno (`lib/forms.ts`).

## Estructura

```
app/
  layout.tsx            raíz: fuentes, metadatos y datos estructurados (Organization + LocalBusiness)
  (marketing)/          web pública: portada, aviso legal, privacidad, cookies
  (portal)/acceso/      acceso clientes (próximamente, sin login falso)
  (admin)/              panel interno futuro (solo layout)
  api/                  diagnostico, visitas/disponibilidad, visitas/reservar
components/
  layout/               Header, Footer, FloatingCTA, ScrollProgress, LegalPage
  sections/             secciones de la portada
  ui/                   Button, Field, SectionHeading, Reveal, Logo, Pending
config/ content/ lib/ styles/
docs/ARQUITECTURA_PORTAL.md   propuesta técnica del portal de clientes y el panel
```

`/servicios` y `/reservar` (modelo anterior) redirigen con 301 a la portada.

## Despliegue

Proyecto de Vercel `visax-ai-v2` (dominio visaxai.es). Antes del primer despliegue con formularios, define `N8N_WEBHOOK_BASE` en las variables de entorno del proyecto.
