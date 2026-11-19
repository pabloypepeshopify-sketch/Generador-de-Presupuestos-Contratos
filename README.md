# La Flor de la Canela · web + carta digital

Web de una página con carta digital para **La Flor de la Canela**, restobar de cocina peruana y española en
**Av. de El Greco, 4 · 41007 Sevilla** (San Pablo – Santa Justa) · 618 01 22 08 · Instagram `@flordelacanela4`.

HTML + CSS + JS sin paso de build. Se despliega tal cual (Vercel, Netlify o cualquier hosting estático).

## Qué lleva

- **Portada** con el concepto "Ceviche y ensaladilla, en la misma mesa", nota de Google (4,8 · 168 reseñas) y accesos a carta y reserva.
- **La casa**: historia (Chabuca Granda, Dani Maguiño, 2006, el antiguo Enea), fachada y salón de azulejo.
- **Dos cocinas**: tarjeta peruana y tarjeta sevillana que abren la carta en su pestaña.
- **Lo que hay que probar**: platos con foto, sacados de la carta (precio incluido).
- **Carta digital** (`#carta`):
  - Pestañas Cocina peruana / Cocina española / Postres y bebidas (tartas, cervezas peruanas, Inka Kola, pisco sour, sangría).
  - Tapa y ración en columnas, como la carta impresa.
  - Los 14 alérgenos con la misma numeración (1–14) y colores que la carta del local.
  - Filtro "ocultar platos que lleven…" y buscador (busca en las dos cocinas a la vez, sin importar tildes).
  - Chips de sección que siguen el scroll.
  - Fotos en los platos que tienen.
- **La barra**: pisco sour, sangría, Cusqueña, Pilsen Callao, Inka Kola y tartas, con botón a esa pestaña de la carta.
- **Galería** con visor.
- **Reserva**: formulario que abre WhatsApp con el mensaje ya escrito (nombre, personas, día, hora, terraza/dentro, notas). También enlace a TheFork y teléfono.
- **Dónde estamos**: mapa de Google, cómo llegar, WhatsApp, redes.
- **Idiomas: español, inglés, japonés y chino (simplificado)**. Selector con el globo arriba a la derecha; recuerda la elección. `?lang=en`, `?lang=ja` o `?lang=zh` fuerzan un idioma. Si el móvil está en japonés o chino entra en ese idioma; si está en otro que no sea español, en inglés.
  - En japonés y chino los platos mantienen el nombre en español (es lo que se pide) y debajo llevan el nombre traducido.
  - La reserva por WhatsApp desde japonés o chino se manda en español, con una línea "Idioma del cliente", para que la entienda el personal.
- **Móvil**: barra fija abajo (Carta · Llamar · Reservar · Llegar).
- SEO: `schema.org/Restaurant`, Open Graph para que el enlace se vea bien en WhatsApp.

## Tocar la carta

Platos y precios: `js/carta-datos.js` (precios, descripciones ES/EN, alérgenos, fotos, "de la casa"). El formato está explicado al principio del archivo.
Japonés y chino: `js/traducciones.js`, enlazado por el nombre del plato. Si se añade un plato nuevo y no se traduce, en japonés/chino sale en inglés.

## QR de mesa

Apuntar el QR a `https://DOMINIO/#carta`. También valen `#carta-sevilla` (cocina española) y `#carta-postres` (postres y bebidas).

## Pendiente de confirmar con el cliente

1. **Fotos**: salen del reportaje de detapasconchencho.es (mayo 2026). Pedir al local las originales (o permiso) antes de publicar.
   - Además, 13 platos llevan fotos de referencia de Wikimedia Commons (licencia libre, enlazadas con `foto: 'wm:…'` en `js/carta-datos.js`). No son del local: los créditos están en `creditos-fotos.html`. Si el local hace fotos propias, cambiarlas por esas.
2. **Horario**: no aparece publicado en ningún sitio. Ahora pone "Llámanos o escríbenos por WhatsApp…". Rellenar en `index.html` (bloque `vis.horario.v`) y en `js/app.js` (texto en inglés).
3. **Historia**: lo de Dani Maguiño, la plaza Pintor Amalio García del Moral y 2006 viene del mismo reportaje. Confirmar nombre y datos.
4. **Alérgenos de la cocina española, tartas y bebidas**: no los tenemos. Ahora salen como "consulta al personal" y se ocultan si hay filtros activos. Cuando los den, añadir `a: [...]` a cada plato.
5. **Descripciones**: las de la cocina peruana son las de la carta (traducidas). Las de la cocina española son textos cortos nuestros; que el local las revise.
6. **Nombres corregidos** respecto a la carta impresa: "Wanta Frito" → Wantán frito, "Tequeños Frito" → Tequeños fritos, "Tortillas de Camarones" → Tortillitas de camarones. "Sopa García" se ha dejado tal cual.
7. **Bebidas**: el cliente pasó la lista sin precios; salen con "Precio en barra". Cuando los den, poner `t`/`r` o `u` y quitar `sinPrecio` de la sección.
8. **TikTok**: el enlace es una búsqueda de "La Flor de la Canela 4"; poner el usuario exacto cuando lo pasen.
9. **Dominio**: ahora está en https://la-flor-de-la-canela.vercel.app (proyecto Vercel `la-flor-de-la-canela`, equipo VISAX AI). Si ponen dominio propio, cambiar esa URL en `og:image`, `og:url`, `canonical` y el JSON-LD de `index.html`.
10. **Nota de Google** (4,8 · 168 reseñas, noviembre 2026): actualizar de vez en cuando.
11. **Precios de la libreta (19/11/2026) que hay que confirmar**:
    - Wantán frito: tapa 8,50 € (en la libreta hay un 8 escrito encima de un 7).
    - Chicharrón de pescado: la libreta no trae precio; se ha dejado el de la carta impresa (6,90 / 13,50).
    - Arroz con mariscos: la libreta pone tapa 7,50 y ración 14,00 (antes ración 17,90). Puede que esos números fueran del chicharrón de pescado, que está justo encima.
    - Merluza a la romana: solo trae ración (13,90); se ha quitado la tapa.
12. **Traducciones al japonés y chino**: hechas por nosotros; conviene que las revise alguien nativo antes de imprimir nada.

## Probar en local

```bash
cd webs-clientes/la-flor-de-la-canela && python3 -m http.server 8080
```

Abrir http://localhost:8080
