import { requireAuth, requireAdmin, requireSupervisor, requireAbogado } from '../lib/api-auth'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetUser = jest.fn()
const mockFrom = jest.fn()
const mockSelect = jest.fn()
const mockEq = jest.fn()
/** Fila que devuelve maybeSingle() por tabla (usuarios, admins) */
const mockFilas: Record<string, unknown> = {}

jest.mock('../lib/supabase-admin', () => ({
  supabaseAdmin: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: (tabla: string) => {
      mockFrom(tabla)
      const q = {
        select: (...args: unknown[]) => { mockSelect(tabla, ...args); return q },
        eq: (...args: unknown[]) => { mockEq(tabla, ...args); return q },
        maybeSingle: async () => ({ data: mockFilas[tabla] ?? null }),
      }
      return q
    },
  },
}))

// Simular NextResponse.json como un objeto simple { status, body }
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status: number }) => ({ body, status: init?.status ?? 200 }),
  },
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildRequest(token?: string): Request {
  return {
    headers: { get: (key: string) => key === 'authorization' ? (token ? `Bearer ${token}` : null) : null },
  } as unknown as Request
}

function setupSupabase(
  authUser: { id: string } | null,
  usuarioRow: Record<string, unknown> | null,
  adminRow: Record<string, unknown> | null = null,
) {
  mockGetUser.mockResolvedValue({ data: { user: authUser } })
  mockFilas.usuarios = usuarioRow
  mockFilas.admins = adminRow
}

const usuarioAbogado = { id: 1, rol: 'abogado', nombres: 'Test', nombre_negocio: null }
const usuarioSup     = { id: 3, rol: 'supervisor', nombres: 'Sup', nombre_negocio: null }

beforeEach(() => {
  jest.clearAllMocks()
  for (const k of Object.keys(mockFilas)) delete mockFilas[k]
})

// ─── requireAuth ─────────────────────────────────────────────────────────────

describe('requireAuth()', () => {
  it('devuelve 401 si no hay token', async () => {
    const { usuario, error } = await requireAuth(buildRequest())
    expect(usuario).toBeNull()
    expect((error as { status: number }).status).toBe(401)
  })

  it('devuelve 401 si Supabase no reconoce el token', async () => {
    setupSupabase(null, null)
    const { usuario, error } = await requireAuth(buildRequest('token-invalido'))
    expect(usuario).toBeNull()
    expect((error as { status: number }).status).toBe(401)
  })

  it('devuelve 401 si el auth_user no tiene fila en usuarios', async () => {
    setupSupabase({ id: 'uuid-x' }, null)
    const { usuario, error } = await requireAuth(buildRequest('token-ok'))
    expect(usuario).toBeNull()
    expect((error as { status: number }).status).toBe(401)
  })

  it('devuelve usuario y error null para cualquier rol válido', async () => {
    setupSupabase({ id: 'uuid-a' }, usuarioAbogado)
    const { usuario, error } = await requireAuth(buildRequest('token-ok'))
    expect(error).toBeNull()
    expect(usuario?.id).toBe(1)
    expect(usuario?.rol).toBe('abogado')
  })
})

// ─── requireAdmin ─────────────────────────────────────────────────────────────

describe('guards de rol sin sesión válida', () => {
  it.each([
    ['requireSupervisor', requireSupervisor],
    ['requireAbogado', requireAbogado],
  ])('%s devuelve 401 (no 403) si no hay token', async (_nombre, guard) => {
    const { usuario, error } = await guard(buildRequest())
    expect(usuario).toBeNull()
    expect((error as { status: number }).status).toBe(401)
  })

  it.each([
    ['requireSupervisor', requireSupervisor],
    ['requireAbogado', requireAbogado],
  ])('%s devuelve 401 si Supabase no reconoce el token', async (_nombre, guard) => {
    setupSupabase(null, null)
    const { error } = await guard(buildRequest('token-invalido'))
    expect((error as { status: number }).status).toBe(401)
  })
})

describe('requireAdmin() — fuente de verdad: tabla admins', () => {
  it('401 sin token, sin consultar la base', async () => {
    const { admin, error } = await requireAdmin(buildRequest())
    expect(admin).toBeNull()
    expect((error as { status: number }).status).toBe(401)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('401 si Supabase no reconoce el token', async () => {
    setupSupabase(null, null)
    const { error } = await requireAdmin(buildRequest('token-invalido'))
    expect((error as { status: number }).status).toBe(401)
  })

  it('403 para abogado sin fila en admins', async () => {
    setupSupabase({ id: 'uuid-a' }, usuarioAbogado, null)
    const { admin, error } = await requireAdmin(buildRequest('tok'))
    expect(admin).toBeNull()
    expect((error as { status: number }).status).toBe(403)
  })

  it('403 aunque la fila de usuarios diga is_admin = true (la columna ya no se usa)', async () => {
    setupSupabase({ id: 'uuid-a' }, { ...usuarioAbogado, is_admin: true }, null)
    const { error } = await requireAdmin(buildRequest('tok'))
    expect((error as { status: number }).status).toBe(403)
  })

  it('pasa (sin error) para un admin que solo existe en la tabla admins', async () => {
    setupSupabase({ id: 'uuid-admin' }, null, { id: 1 })
    const { admin, error } = await requireAdmin(buildRequest('tok'))
    expect(error).toBeNull()
    expect(admin).toEqual({ auth_user_id: 'uuid-admin' })
  })

  it('pasa para un abogado que además tiene fila en admins', async () => {
    setupSupabase({ id: 'uuid-a' }, usuarioAbogado, { id: 2 })
    const { error } = await requireAdmin(buildRequest('tok'))
    expect(error).toBeNull()
  })

  it('consulta admins por auth_user_id y no lee la tabla usuarios', async () => {
    setupSupabase({ id: 'uuid-admin' }, null, { id: 1 })
    await requireAdmin(buildRequest('tok'))
    expect(mockFrom).toHaveBeenCalledWith('admins')
    expect(mockFrom).not.toHaveBeenCalledWith('usuarios')
    expect(mockEq).toHaveBeenCalledWith('admins', 'auth_user_id', 'uuid-admin')
  })
})

// ─── requireSupervisor ────────────────────────────────────────────────────────

describe('requireSupervisor()', () => {
  it('devuelve 403 para abogado', async () => {
    setupSupabase({ id: 'uuid-a' }, usuarioAbogado)
    const { error } = await requireSupervisor(buildRequest('tok'))
    expect((error as { status: number }).status).toBe(403)
  })

  it('devuelve usuario para supervisor', async () => {
    setupSupabase({ id: 'uuid-s' }, usuarioSup)
    const { usuario, error } = await requireSupervisor(buildRequest('tok'))
    expect(error).toBeNull()
    expect(usuario?.rol).toBe('supervisor')
  })
})

// ─── requireAbogado ───────────────────────────────────────────────────────────

describe('requireAbogado()', () => {
  it('devuelve 403 para supervisor', async () => {
    setupSupabase({ id: 'uuid-s' }, usuarioSup)
    const { error } = await requireAbogado(buildRequest('tok'))
    expect((error as { status: number }).status).toBe(403)
  })

  it('devuelve usuario para abogado', async () => {
    setupSupabase({ id: 'uuid-a' }, usuarioAbogado)
    const { usuario, error } = await requireAbogado(buildRequest('tok'))
    expect(error).toBeNull()
    expect(usuario?.rol).toBe('abogado')
  })
})
