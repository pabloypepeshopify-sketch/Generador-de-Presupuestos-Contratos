# Webs de clientes

Copias editables de las webs que hemos hecho a bares. Cada carpeta es una web
estática: se publica subiendo la carpeta tal cual (sin build).

| Carpeta | Web publicada | Dónde está |
|---|---|---|
| `martinez-bar/` | https://martinezbar.com (martinez-bar.vercel.app) | Vercel, otra cuenta (no el equipo VISAX AI) |
| `ribera22/` | https://ribera22.com (ribera22.vercel.app) | Vercel, otra cuenta (no el equipo VISAX AI) |

Todas llevan al final de la web y de la carta el enlace a VISAX NFC
(https://visaxnfc.es/), igual que La Flor de la Canela:

- Pie de todas las páginas: "Web y carta digital hecha por VISAX NFC" con el logo
  (`assets/img/visax.svg`), clase `.credito`.
- Final de la carta: "Carta digital hecha por VISAX NFC", clase `.credito-carta`.
- Textos traducidos en `assets/js/i18n.js` (claves `cred.pie` y `cred.carta`).

## Publicar un cambio

Desde la cuenta de Vercel donde están los proyectos `martinez-bar` y `ribera22`:

```bash
cd webs-clientes/martinez-bar && npx vercel --prod
```

```bash
cd webs-clientes/ribera22 && npx vercel --prod
```

O en vercel.com: proyecto → Deployments → arrastrar la carpeta.
