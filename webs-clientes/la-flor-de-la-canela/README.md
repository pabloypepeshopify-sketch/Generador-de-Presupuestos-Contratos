# La Flor de la Canela · web + carta digital

Web de una página con carta digital para **La Flor de la Canela**, restobar de cocina peruana y española en
**Av. de El Greco, 4 · 41007 Sevilla** (San Pablo – Santa Justa) · 618 01 22 08 · Instagram `@flordelacanela4`.

HTML + CSS + JS sin paso de build. Se despliega tal cual (Vercel, Netlify o cualquier hosting estático).

## Qué lleva

- **Portada** con el concepto "Ceviche y serranito, en la misma mesa", nota de Google (4,8 · 168 reseñas) y accesos a carta y reserva.
- **La casa**: historia (Chabuca Granda, Dani Maguiño, 2006, el antiguo Enea), fachada y salón de azulejo.
- **Dos cocinas**: tarjeta peruana y tarjeta sevillana que abren la carta en su pestaña.
- **Lo que hay que probar**: platos con foto, sacados de la carta (precio incluido).
- **Carta digital** (`#carta`):
  - Pestañas Cocina peruana / Cocina española.
  - Tapa y ración en columnas, como la carta impresa.
  - Los 14 alérgenos con la misma numeración (1–14) y colores que la carta del local.
  - Filtro "ocultar platos que lleven…" y buscador (busca en las dos cocinas a la vez, sin importar tildes).
  - Chips de sección que siguen el scroll.
  - Fotos en los platos que tienen.
- **La barra**: pisco sour (clásico, mango, maracuyá), chicha morada, zumos, mojito.
- **Galería** con visor.
- **Reserva**: formulario que abre WhatsApp con el mensaje ya escrito (nombre, personas, día, hora, terraza/dentro, notas). También enlace a TheFork y teléfono.
- **Dónde estamos**: mapa de Google, cómo llegar, WhatsApp, redes.
- **ES / EN**: toda la web y la carta en inglés con un toque (recuerda la elección; `?lang=en` fuerza inglés). Si el móvil no está en español, entra en inglés.
- **Móvil**: barra fija abajo (Carta · Llamar · Reservar · Llegar).
- SEO: `schema.org/Restaurant`, Open Graph para que el enlace se vea bien en WhatsApp.

## Tocar la carta

Todo está en `js/carta-datos.js` (platos, precios, descripciones ES/EN, alérgenos, fotos, "de la casa").
No hay que tocar nada más. El formato está explicado al principio del archivo.

## QR de mesa

Apuntar el QR a `https://DOMINIO/#carta`. También vale `#carta-sevilla` para abrir directamente la cocina española.

## Pendiente de confirmar con el cliente

1. **Fotos**: salen del reportaje de detapasconchencho.es (mayo 2026). Pedir al local las originales (o permiso) antes de publicar.
2. **Horario**: no aparece publicado en ningún sitio. Ahora pone "Llámanos o escríbenos por WhatsApp…". Rellenar en `index.html` (bloque `vis.horario.v`) y en `js/app.js` (texto en inglés).
3. **Historia**: lo de Dani Maguiño, la plaza Pintor Amalio García del Moral y 2006 viene del mismo reportaje. Confirmar nombre y datos.
4. **Alérgenos de la cocina española**: la carta impresa no los trae. Ahora salen como "consulta al personal" y se ocultan si hay filtros activos. Cuando los den, añadir `a: [...]` a cada plato.
5. **Descripciones**: las de la cocina peruana son las de la carta (traducidas). Las de la cocina española son textos cortos nuestros; que el local las revise.
6. **Nombres corregidos** respecto a la carta impresa: "Wanta Frito" → Wantán frito, "Tequeños Frito" → Tequeños fritos, "Tortillas de Camarones" → Tortillitas de camarones. "Sopa García" se ha dejado tal cual.
7. **Bebidas y postres**: sin precios (no están en la carta). Si quieren, se añaden como una sección más.
8. **TikTok**: el enlace es una búsqueda de "La Flor de la Canela 4"; poner el usuario exacto cuando lo pasen.
9. **Dominio**: al tenerlo, poner la URL absoluta en `og:image` y `hasMenu`, y añadir `<link rel="canonical">`.
10. **Nota de Google** (4,8 · 168 reseñas, noviembre 2026): actualizar de vez en cuando.

## Probar en local

```bash
cd webs-clientes/la-flor-de-la-canela && python3 -m http.server 8080
```

Abrir http://localhost:8080
