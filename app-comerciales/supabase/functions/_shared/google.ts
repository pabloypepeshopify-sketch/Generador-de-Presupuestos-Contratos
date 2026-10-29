// Google Places API (New): buscar locales, su ficha y sus vecinos, con nota y número de reseñas.
// Necesita el secreto GOOGLE_PLACES_API_KEY en Supabase (Edge Functions → Secrets).

const BASE = "https://places.googleapis.com/v1";
const CAMPOS = [
  "id", "displayName", "formattedAddress", "nationalPhoneNumber", "websiteUri", "googleMapsUri",
  "rating", "userRatingCount", "primaryType", "types", "businessStatus", "location",
];

export type Sitio = {
  google_id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  web: string | null;
  maps_url: string | null;
  nota: number | null;
  resenas: number;
  tipo: string;
  abierto: boolean;
  hosteleria: boolean;
  lat: number | null;
  lng: number | null;
};

export type Zona = { media_nota: number | null; mediana_resenas: number | null; top: { nombre: string; nota: number | null; resenas: number }[] };

export class SinClaveGoogle extends Error {
  constructor() {
    super("Falta la clave de Google Maps (secreto GOOGLE_PLACES_API_KEY en Supabase).");
  }
}

function clave() {
  const k = Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (!k) throw new SinClaveGoogle();
  return k;
}

async function pedir(ruta: string, mascara: string, cuerpo?: unknown) {
  const res = await fetch(`${BASE}${ruta}`, {
    method: cuerpo ? "POST" : "GET",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": clave(), "X-Goog-FieldMask": mascara },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Google Maps: ${datos?.error?.message ?? res.status}`);
  return datos;
}

const HOSTELERIA = /restaurant|(^|_)bar($|_)|pub|cafe|coffee|bakery|tea_house|night_club|fast_food|food_court|meal_|brunch|diner|bistro|tapas|winery|brewery|hotel|lodging|ice_cream|pizza|hamburger|sandwich|dessert/;

function tipoLocal(t: string) {
  if (/pub|night_club|cocktail|lounge/.test(t)) return "Pub / copas";
  if (/(^|_)bar($|_)|tapas|wine|brew/.test(t)) return "Bar";
  if (/restaurant|pizza|hamburger|diner|bistro|fast_food|food_court|meal_/.test(t)) return "Restaurante";
  if (/cafe|coffee|bakery|tea|dessert|ice_cream|brunch/.test(t)) return "Cafetería";
  if (/hotel|lodging|hostel/.test(t)) return "Hotel";
  return "Otro";
}

// deno-lint-ignore no-explicit-any
function aSitio(p: any): Sitio {
  const tipos: string[] = [p.primaryType, ...(p.types ?? [])].filter(Boolean);
  return {
    google_id: p.id,
    nombre: p.displayName?.text ?? "Sin nombre",
    direccion: p.formattedAddress ?? null,
    telefono: p.nationalPhoneNumber ?? null,
    web: p.websiteUri ?? null,
    maps_url: p.googleMapsUri ?? null,
    nota: typeof p.rating === "number" ? Math.round(p.rating * 10) / 10 : null,
    resenas: p.userRatingCount ?? 0,
    tipo: tipoLocal(p.primaryType ?? tipos[0] ?? ""),
    abierto: !p.businessStatus || p.businessStatus === "OPERATIONAL",
    hosteleria: tipos.some((t) => HOSTELERIA.test(t)),
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
  };
}

// Búsqueda por texto ("bares en Triana, Sevilla"): hasta 3 páginas de 20 (máximo de Google: 60).
export async function buscarTexto(consulta: string, paginas = 3, tamano = 20): Promise<Sitio[]> {
  const mascara = CAMPOS.map((c) => `places.${c}`).join(",") + ",nextPageToken";
  const sitios: Sitio[] = [];
  let pageToken: string | undefined;
  for (let i = 0; i < paginas; i++) {
    const datos = await pedir("/places:searchText", mascara, {
      textQuery: consulta, languageCode: "es", regionCode: "ES", pageSize: tamano, ...(pageToken ? { pageToken } : {}),
    });
    sitios.push(...(datos.places ?? []).map(aSitio));
    pageToken = datos.nextPageToken;
    if (!pageToken) break;
  }
  return sitios;
}

// Candidatos para "Analiza tu local": solo nombre y dirección (más barato)
export async function candidatos(consulta: string) {
  const datos = await pedir("/places:searchText", "places.id,places.displayName,places.formattedAddress", {
    textQuery: consulta, languageCode: "es", regionCode: "ES", pageSize: 5,
  });
  // deno-lint-ignore no-explicit-any
  return (datos.places ?? []).map((p: any) => ({ google_id: p.id, nombre: p.displayName?.text ?? "", direccion: p.formattedAddress ?? "" }));
}

export async function ficha(googleId: string): Promise<Sitio> {
  if (!/^[\w-]{10,300}$/.test(googleId)) throw new Error("Local no válido");
  return aSitio(await pedir(`/places/${googleId}?languageCode=es&regionCode=ES`, CAMPOS.join(",")));
}

// Los locales de hostelería más populares alrededor de un punto
export async function vecinos(lat: number, lng: number, radio = 700): Promise<Sitio[]> {
  const datos = await pedir("/places:searchNearby", CAMPOS.map((c) => `places.${c}`).join(","), {
    includedTypes: ["bar", "restaurant", "cafe"],
    maxResultCount: 20,
    rankPreference: "POPULARITY",
    locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: radio } },
    languageCode: "es",
    regionCode: "ES",
  });
  return (datos.places ?? []).map(aSitio);
}

export function cifrasZona(sitios: Sitio[]): Zona {
  const validos = sitios.filter((s) => s.abierto && s.nota != null);
  if (!validos.length) return { media_nota: null, mediana_resenas: null, top: [] };
  const media = validos.reduce((n, s) => n + (s.nota ?? 0), 0) / validos.length;
  const resenas = validos.map((s) => s.resenas).sort((a, b) => a - b);
  const m = Math.floor(resenas.length / 2);
  const mediana = resenas.length % 2 ? resenas[m] : Math.round((resenas[m - 1] + resenas[m]) / 2);
  const top = [...validos].sort((a, b) => b.resenas - a.resenas).slice(0, 5)
    .map((s) => ({ nombre: s.nombre, nota: s.nota, resenas: s.resenas }));
  return { media_nota: Math.round(media * 10) / 10, mediana_resenas: mediana, top };
}

// 3 = mucha oportunidad (pocas reseñas para su zona o nota baja), 1 = ya va fuerte
export function oportunidad(s: Sitio, z: Zona): 1 | 2 | 3 {
  const mediana = z.mediana_resenas ?? 0;
  if ((s.nota != null && s.nota < 4.2) || s.resenas < mediana * 0.5) return 3;
  if ((s.nota != null && s.nota < 4.5) || s.resenas < mediana) return 2;
  return 1;
}
