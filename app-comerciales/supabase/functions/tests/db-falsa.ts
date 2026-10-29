// Base de datos en memoria con la parte del cliente de Supabase que usan las funciones.
// Solo para pruebas: imita filtros, orden, índices únicos y valores por defecto.

type Fila = Record<string, unknown>;
type Resultado = { data: unknown; error: { code: string; message: string } | null; count?: number | null };

const UNICOS: Record<string, string[][]> = {
  locales: [["google_id"], ["codigo"]],
  mensajes: [["wa_msg_id"], ["conversacion_id", "orden"]],
  conversaciones: [["wa_id"]],
};
const IDENTIDAD = new Set(["mensajes", "eventos", "limites_web"]);

const DEFECTOS: Record<string, () => Fila> = {
  locales: () => ({
    estado: "pendiente", origen: "manual", informe_visitas: 0, agente_pausado: false, num_llamadas: 0, productos: [],
    codigo: Math.random().toString(36).slice(2, 10).replace(/[01lo]/g, "x").padEnd(8, "x"),
  }),
  conversaciones: () => ({ procesando_hasta: null, actualizado_en: new Date().toISOString() }),
  mensajes: () => ({ orden: null, wa_msg_id: null, texto: null }),
};

const clonar = <T>(x: T): T => (x === undefined ? x : JSON.parse(JSON.stringify(x)));

export class DbFalsa {
  tablas: Record<string, Fila[]> = {};
  private sec = 0;
  from(tabla: string) {
    this.tablas[tabla] ??= [];
    return new Consulta(this, tabla);
  }
  rpc() {
    return Promise.resolve({ data: null, error: null });
  }
  nuevoId(tabla: string) {
    return IDENTIDAD.has(tabla) ? ++this.sec : crypto.randomUUID();
  }
}

type Filtro = (f: Fila) => boolean;

function comparar(op: string, a: unknown, b: unknown) {
  const x = a as string | number, y = b as string | number;
  if (a == null) return false;
  return op === "lt" ? x < y : op === "lte" ? x <= y : op === "gt" ? x > y : x >= y;
}

class Consulta implements PromiseLike<Resultado> {
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private filtros: Filtro[] = [];
  private ordenes: [string, boolean, boolean][] = [];
  private columnas = "*";
  private opciones: { count?: string; head?: boolean } = {};
  private devolver = false;
  private datos: Fila | Fila[] = [];
  private unico: "single" | "maybe" | null = null;
  private conflicto: { onConflict?: string; ignoreDuplicates?: boolean } = {};
  private max = Infinity;

  constructor(private db: DbFalsa, private tabla: string) {}

  select(columnas = "*", opciones: { count?: string; head?: boolean } = {}) {
    if (this.op === "select") {
      this.columnas = columnas;
      this.opciones = opciones;
    } else {
      this.devolver = true;
      this.columnas = columnas;
    }
    return this;
  }
  insert(filas: Fila | Fila[]) {
    this.op = "insert";
    this.datos = filas;
    return this;
  }
  upsert(filas: Fila | Fila[], o: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
    this.op = "upsert";
    this.datos = filas;
    this.conflicto = o;
    return this;
  }
  update(cambios: Fila) {
    this.op = "update";
    this.datos = cambios;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(c: string, v: unknown) {
    this.filtros.push((f) => f[c] === v);
    return this;
  }
  neq(c: string, v: unknown) {
    this.filtros.push((f) => f[c] !== v);
    return this;
  }
  is(c: string, v: null) {
    this.filtros.push((f) => (f[c] ?? null) === v);
    return this;
  }
  not(c: string, op: string, v: unknown) {
    if (op !== "is" || v !== null) throw new Error(`not(${op}) no implementado`);
    this.filtros.push((f) => f[c] != null);
    return this;
  }
  in(c: string, vs: unknown[]) {
    this.filtros.push((f) => vs.includes(f[c]));
    return this;
  }
  gt(c: string, v: unknown) {
    this.filtros.push((f) => comparar("gt", f[c], v));
    return this;
  }
  gte(c: string, v: unknown) {
    this.filtros.push((f) => comparar("gte", f[c], v));
    return this;
  }
  lt(c: string, v: unknown) {
    this.filtros.push((f) => comparar("lt", f[c], v));
    return this;
  }
  or(expr: string) {
    const partes = expr.split(",").map((p) => {
      const [c, op, ...resto] = p.split(".");
      const v = resto.join(".");
      if (op === "is" && v === "null") return (f: Fila) => f[c] == null;
      if (op === "not" && v === "is.null") return (f: Fila) => f[c] != null;
      return (f: Fila) => comparar(op, f[c], v);
    });
    this.filtros.push((f) => partes.some((p) => p(f)));
    return this;
  }
  order(c: string, o: { ascending?: boolean; nullsFirst?: boolean } = {}) {
    this.ordenes.push([c, o.ascending !== false, !!o.nullsFirst]);
    return this;
  }
  limit(n: number) {
    this.max = n;
    return this;
  }
  single() {
    this.unico = "single";
    return this;
  }
  maybeSingle() {
    this.unico = "maybe";
    return this;
  }

  then<A = Resultado, B = never>(ok?: ((r: Resultado) => A | PromiseLike<A>) | null, mal?: ((e: unknown) => B | PromiseLike<B>) | null) {
    // Asíncrono de verdad, para que las pruebas de concurrencia se intercalen
    return new Promise<Resultado>((r) => setTimeout(() => r(this.ejecutar()), 1)).then(ok, mal);
  }

  private proyectar(f: Fila) {
    if (this.columnas.trim() === "*") return clonar(f);
    const o: Fila = {};
    for (const c of this.columnas.split(",").map((x) => x.trim())) o[c] = clonar(f[c]);
    return o;
  }

  private choca(fila: Fila, excepto?: Fila) {
    for (const cols of UNICOS[this.tabla] ?? []) {
      if (cols.some((c) => fila[c] == null)) continue;
      if (this.db.tablas[this.tabla].some((o) => o !== excepto && cols.every((c) => o[c] === fila[c]))) return cols;
    }
    return null;
  }

  private ejecutar(): Resultado {
    const tabla = this.db.tablas[this.tabla];
    const filtradas = () => tabla.filter((f) => this.filtros.every((p) => p(f)));
    const error = (message: string, code = "23505") => ({ data: null, error: { code, message } });
    let filas: Fila[] = [];

    if (this.op === "insert" || this.op === "upsert") {
      const lista = Array.isArray(this.datos) ? this.datos : [this.datos];
      for (const d of lista) {
        const nueva: Fila = { ...(DEFECTOS[this.tabla]?.() ?? {}), id: this.db.nuevoId(this.tabla), creado_en: new Date().toISOString(), ...clonar(d) };
        const cols = this.choca(nueva);
        if (cols) {
          if (this.op === "upsert" && this.conflicto.ignoreDuplicates) continue;
          return error(`duplicate key (${cols.join(",")})`);
        }
        tabla.push(nueva);
        filas.push(nueva);
      }
      if (!this.devolver) return { data: null, error: null };
    } else if (this.op === "update") {
      for (const f of filtradas()) {
        const nueva = { ...f, ...clonar(this.datos as Fila) };
        if (this.choca(nueva, f)) return error("duplicate key");
        Object.assign(f, clonar(this.datos as Fila));
        filas.push(f);
      }
      if (!this.devolver) return { data: null, error: null };
    } else if (this.op === "delete") {
      filas = filtradas();
      this.db.tablas[this.tabla] = tabla.filter((f) => !filas.includes(f));
      return { data: null, error: null };
    } else {
      filas = filtradas();
    }

    for (const [c, asc, nullsFirst] of [...this.ordenes].reverse()) {
      filas = [...filas].sort((a, b) => {
        if (a[c] == null || b[c] == null) return a[c] == b[c] ? 0 : (a[c] == null) === nullsFirst ? -1 : 1;
        return (a[c]! < b[c]! ? -1 : a[c]! > b[c]! ? 1 : 0) * (asc ? 1 : -1);
      });
    }
    filas = filas.slice(0, this.max);
    const count = this.opciones.count ? filas.length : null;
    if (this.opciones.head) return { data: null, error: null, count };
    const data = filas.map((f) => this.proyectar(f));
    if (this.unico) {
      if (data.length > 1 || (this.unico === "single" && !data.length)) return error("not exactly one row", "PGRST116");
      return { data: data[0] ?? null, error: null, count };
    }
    return { data, error: null, count };
  }
}
