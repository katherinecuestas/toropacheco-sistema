/**
 * Supabase falso en memoria para tests de rutas API.
 *
 * Reemplaza a `lib/supabase-admin` con `jest.mock('../lib/supabase-admin', () => jest.requireActual('./support/fakeSupabase'))`.
 * Soporta lo que usan las rutas: select / insert / update / delete, filtros eq / in,
 * order, limit, single, maybeSingle y `auth.getUser(token)`.
 */

type Row = Record<string, unknown>
type Filtro = (row: Row) => boolean

export const db: Record<string, Row[]> = {}

const instante = (v: unknown) => new Date(String(v)).getTime()

/** token → auth_user_id que devuelve `auth.getUser` */
const tokens: Record<string, string> = {}

class Query implements PromiseLike<{ data: unknown; error: unknown }> {
  private filtros: Filtro[] = []
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private payload: Row | Row[] | null = null
  private orden: { col: string; asc: boolean } | null = null
  private limite: number | null = null

  constructor(private tabla: string) {}

  select() { return this }
  insert(valores: Row | Row[]) { this.op = 'insert'; this.payload = valores; return this }
  update(valores: Row) { this.op = 'update'; this.payload = valores; return this }
  delete() { this.op = 'delete'; return this }

  // Comparación laxa: los ids llegan como string desde query params
  eq(col: string, valor: unknown) { this.filtros.push(r => String(r[col]) === String(valor)); return this }
  in(col: string, valores: unknown[]) { this.filtros.push(r => valores.map(String).includes(String(r[col]))); return this }
  neq(col: string, valor: unknown) { this.filtros.push(r => String(r[col]) !== String(valor)); return this }
  // Comparaciones de fechas como instantes (no como texto), igual que timestamptz
  gte(col: string, valor: string) { this.filtros.push(r => instante(r[col]) >= instante(valor)); return this }
  lt(col: string, valor: string) { this.filtros.push(r => instante(r[col]) < instante(valor)); return this }
  lte(col: string, valor: string) { this.filtros.push(r => instante(r[col]) <= instante(valor)); return this }
  order(col: string, opts?: { ascending?: boolean }) { this.orden = { col, asc: opts?.ascending ?? true }; return this }
  limit(n: number) { this.limite = n; return this }

  single() { return Promise.resolve(this.ejecutar('single')) }
  maybeSingle() { return Promise.resolve(this.ejecutar('maybe')) }
  then<A, B>(ok?: ((v: { data: unknown; error: unknown }) => A | PromiseLike<A>) | null, err?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return Promise.resolve(this.ejecutar('many')).then(ok, err)
  }

  private ejecutar(modo: 'single' | 'maybe' | 'many') {
    const tabla = (db[this.tabla] ??= [])
    const coincide = (r: Row) => this.filtros.every(f => f(r))
    let filas: Row[]

    if (this.op === 'insert') {
      const nuevas = (Array.isArray(this.payload) ? this.payload : [this.payload!]).map(v => ({
        id: Math.max(0, ...tabla.map(r => Number(r.id) || 0)) + 1,
        ...v,
      }))
      tabla.push(...nuevas)
      filas = nuevas
    } else if (this.op === 'update') {
      filas = tabla.filter(coincide)
      filas.forEach(r => Object.assign(r, this.payload))
    } else if (this.op === 'delete') {
      filas = tabla.filter(coincide)
      db[this.tabla] = tabla.filter(r => !coincide(r))
    } else {
      filas = tabla.filter(coincide)
      if (this.orden) {
        const { col, asc } = this.orden
        filas = [...filas].sort((a, b) => (String(a[col]) > String(b[col]) ? 1 : -1) * (asc ? 1 : -1))
      }
      if (this.limite !== null) filas = filas.slice(0, this.limite)
    }

    const copia = filas.map(r => ({ ...r }))
    if (modo === 'many') return { data: copia, error: null }
    if (copia.length === 0) {
      return modo === 'single'
        ? { data: null, error: { message: 'detalle interno de Supabase: 0 rows' } }
        : { data: null, error: null }
    }
    return { data: copia[0], error: null }
  }
}

export const supabaseAdmin = {
  from: (tabla: string) => new Query(tabla),
  auth: {
    getUser: async (token: string) => {
      const authId = tokens[token]
      return { data: { user: authId ? { id: authId } : null } }
    },
  },
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

export const TOKEN = {
  abogado: 'tok-abogado-1',
  otroAbogado: 'tok-abogado-2',
  supervisor: 'tok-supervisor',
  admin: 'tok-admin',
}

export const ABOGADO_ID = 1
export const OTRO_ABOGADO_ID = 2

/** Reinicia la BD falsa con usuarios de cada rol más las filas que pase el test. */
export function resetDb(tablas: Record<string, Row[]> = {}) {
  for (const k of Object.keys(db)) delete db[k]
  Object.assign(tokens, {
    [TOKEN.abogado]: 'auth-abogado-1',
    [TOKEN.otroAbogado]: 'auth-abogado-2',
    [TOKEN.supervisor]: 'auth-supervisor',
    [TOKEN.admin]: 'auth-admin',
  })
  db.usuarios = [
    { id: ABOGADO_ID, auth_user_id: 'auth-abogado-1', rol: 'abogado', is_admin: false, nombres: 'Branco', nombre_negocio: null },
    { id: OTRO_ABOGADO_ID, auth_user_id: 'auth-abogado-2', rol: 'abogado', is_admin: false, nombres: 'Otra', nombre_negocio: null },
    { id: 3, auth_user_id: 'auth-supervisor', rol: 'supervisor', is_admin: false, nombres: 'Vladimir', nombre_negocio: null },
    { id: 4, auth_user_id: 'auth-admin', rol: 'abogado', is_admin: true, nombres: 'Admin', nombre_negocio: null },
  ]
  for (const [tabla, filas] of Object.entries(tablas)) db[tabla] = filas.map(r => ({ ...r }))
}

/** Construye un Request real con token opcional y body JSON opcional. */
export function req(method: string, path: string, token?: string, body?: unknown): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`
  return new Request(`http://localhost${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
}

export type Respuesta = { status: number; body: Record<string, unknown> }
