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

/**
 * Esquema de una tabla en la base falsa.
 * - `columnas`: todas las columnas que existen.
 * - `obligatorias`: NOT NULL sin valor por defecto (un insert debe traerlas con valor).
 */
export type Esquema = { columnas: string[]; obligatorias: string[] }

/**
 * Esquema REAL de public.usuarios en producción (column_name, is_nullable):
 *   id NO · created_at NO · auth_user_id NO · email NO · telefono YES · estado NO ·
 *   nombre_negocio NO · is_admin YES · nombres YES · apellido_paterno YES · apellido_materno YES ·
 *   rut YES · dv YES · nombre_usuario YES · rol YES
 * id y created_at son NOT NULL pero tienen valor por defecto, así que no son obligatorias en un insert.
 * NO existe la columna "nombre".
 */
export const ESQUEMA_USUARIOS: Esquema = {
  columnas: [
    'id', 'created_at', 'auth_user_id', 'email', 'telefono', 'estado', 'nombre_negocio', 'is_admin',
    'nombres', 'apellido_paterno', 'apellido_materno', 'rut', 'dv', 'nombre_usuario', 'rol',
  ],
  obligatorias: ['auth_user_id', 'email', 'estado', 'nombre_negocio'],
}

/**
 * Esquemas por tabla. Con esquema, insert/update con una columna desconocida falla igual que
 * PostgREST ("Could not find the 'x' column ... in the schema cache"), y dejar una columna
 * NOT NULL sin valor falla como Postgres (23502). Las tablas sin esquema aceptan cualquier columna.
 * `resetDb()` deja configurado el de `usuarios`.
 */
export const esquemas: Record<string, Esquema> = {}

/** supabase-js serializa a JSON: las claves con valor `undefined` no se envían. */
const sinUndefined = (fila: Row): Row =>
  Object.fromEntries(Object.entries(fila).filter(([, v]) => v !== undefined))

const sinValor = (v: unknown) => v === null || v === undefined || v === ''

/** Valida filas contra el esquema de la tabla. Devuelve el error de PostgREST/Postgres, o null. */
function validarEsquema(tabla: string, filas: Row[], esInsert: boolean) {
  const esquema = esquemas[tabla]
  if (!esquema) return null
  const desconocida = filas.flatMap(f => Object.keys(f)).find(c => !esquema.columnas.includes(c))
  if (desconocida) {
    return { message: `Could not find the '${desconocida}' column of '${tabla}' in the schema cache`, code: 'PGRST204' }
  }
  for (const fila of filas) {
    // Insert: toda obligatoria debe venir con valor. Update: solo se revisan las que se envían.
    const faltante = esquema.obligatorias.find(c => (esInsert || c in fila) && sinValor(fila[c]))
    if (faltante) {
      return { message: `null value in column "${faltante}" of relation "${tabla}" violates not-null constraint`, code: '23502' }
    }
  }
  return null
}

/** Tablas cuyo próximo insert debe fallar (simula un error de la base). */
export const fallarInsert = new Set<string>()

/** Tablas cuyo próximo update debe fallar (simula un error de la base). */
export const fallarUpdate = new Set<string>()

/** Cuentas de Supabase Auth creadas con auth.admin.createUser y aún no borradas. */
export const cuentasAuth: { id: string; email: string }[] = []

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
      const filasNuevas = (Array.isArray(this.payload) ? this.payload : [this.payload!]).map(sinUndefined)
      if (fallarInsert.delete(this.tabla)) {
        return { data: null, error: { message: `fallo simulado en ${this.tabla}`, code: 'XX000' } }
      }
      const errorEsquema = validarEsquema(this.tabla, filasNuevas, true)
      if (errorEsquema) return { data: null, error: errorEsquema }
      const nuevas = filasNuevas.map(v => ({
        id: Math.max(0, ...tabla.map(r => Number(r.id) || 0)) + 1,
        ...v,
      }))
      tabla.push(...nuevas)
      filas = nuevas
    } else if (this.op === 'update') {
      const cambios = sinUndefined(this.payload as Row)
      if (fallarUpdate.delete(this.tabla)) {
        return { data: null, error: { message: `fallo simulado en ${this.tabla}`, code: 'XX000' } }
      }
      const errorEsquema = validarEsquema(this.tabla, [cambios], false)
      if (errorEsquema) return { data: null, error: errorEsquema }
      filas = tabla.filter(coincide)
      filas.forEach(r => Object.assign(r, cambios))
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
    // API admin de Auth: solo lo necesario para /api/admin/abogados
    admin: {
      createUser: async ({ email }: { email: string }) => {
        if (cuentasAuth.some(c => c.email === email)) {
          return { data: { user: null }, error: { code: 'email_exists', message: 'A user with this email address has already been registered' } }
        }
        const cuenta = { id: `auth-nuevo-${cuentasAuth.length + 1}-${Date.now()}`, email }
        cuentasAuth.push(cuenta)
        return { data: { user: { id: cuenta.id } }, error: null }
      },
      updateUserById: async () => ({ data: {}, error: null }),
      deleteUser: async (id: string) => {
        const i = cuentasAuth.findIndex(c => c.id === id)
        if (i >= 0) cuentasAuth.splice(i, 1)
        return { data: {}, error: null }
      },
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
  for (const k of Object.keys(esquemas)) delete esquemas[k]
  esquemas.usuarios = ESQUEMA_USUARIOS
  fallarInsert.clear()
  fallarUpdate.clear()
  cuentasAuth.length = 0
  Object.assign(tokens, {
    [TOKEN.abogado]: 'auth-abogado-1',
    [TOKEN.otroAbogado]: 'auth-abogado-2',
    [TOKEN.supervisor]: 'auth-supervisor',
    [TOKEN.admin]: 'auth-admin',
  })
  db.usuarios = [
    { id: ABOGADO_ID, auth_user_id: 'auth-abogado-1', rol: 'abogado', nombres: 'Branco', nombre_negocio: null },
    { id: OTRO_ABOGADO_ID, auth_user_id: 'auth-abogado-2', rol: 'abogado', nombres: 'Otra', nombre_negocio: null },
    { id: 3, auth_user_id: 'auth-supervisor', rol: 'supervisor', nombres: 'Vladimir', nombre_negocio: null },
  ]
  // El admin existe solo en la tabla admins (única fuente de verdad), sin fila en usuarios
  db.admins = [{ id: 1, auth_user_id: 'auth-admin' }]
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
