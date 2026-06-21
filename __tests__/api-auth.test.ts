import { requireAuth, requireAdmin, requireSupervisor, requireAbogado } from '../lib/api-auth'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetUser = jest.fn()
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockMaybeSingle = jest.fn()

jest.mock('../lib/supabase-admin', () => ({
  supabaseAdmin: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: () => ({
      select: (...args: unknown[]) => { mockSelect(...args); return { eq: mockEq } },
    }),
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

function setupSupabase(authUser: { id: string } | null, usuarioRow: Record<string, unknown> | null) {
  mockGetUser.mockResolvedValue({ data: { user: authUser } })
  mockEq.mockReturnValue({ eq: mockEq, maybeSingle: () => mockMaybeSingle() })
  mockMaybeSingle.mockResolvedValue({ data: usuarioRow })
}

const usuarioAbogado = { id: 1, rol: 'abogado', is_admin: false, nombres: 'Test', nombre_negocio: null }
const usuarioAdmin   = { id: 2, rol: 'abogado', is_admin: true,  nombres: 'Admin', nombre_negocio: null }
const usuarioSup     = { id: 3, rol: 'supervisor', is_admin: false, nombres: 'Sup', nombre_negocio: null }

beforeEach(() => jest.clearAllMocks())

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

describe('requireAdmin()', () => {
  it('devuelve 403 para abogado sin is_admin', async () => {
    setupSupabase({ id: 'uuid-a' }, usuarioAbogado)
    const { usuario, error } = await requireAdmin(buildRequest('tok'))
    expect(usuario).toBeNull()
    expect((error as { status: number }).status).toBe(403)
  })

  it('devuelve usuario para admin', async () => {
    setupSupabase({ id: 'uuid-b' }, usuarioAdmin)
    const { usuario, error } = await requireAdmin(buildRequest('tok'))
    expect(error).toBeNull()
    expect(usuario?.is_admin).toBe(true)
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
