import { GET } from '../app/api/seguimiento/route'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockFrom = jest.fn()
const mockSelect = jest.fn()
const mockConsultaMaybeSingle = jest.fn()
const mockCitasLimit = jest.fn()

jest.mock('../lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (tabla: string) => {
      mockFrom(tabla)
      return {
        select: (cols: string) => {
          mockSelect(tabla, cols)
          if (tabla === 'consultas') {
            return { eq: () => ({ maybeSingle: () => mockConsultaMaybeSingle() }) }
          }
          return { eq: () => ({ order: () => ({ limit: () => mockCitasLimit() }) }) }
        },
      }
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

type Respuesta = { status: number; body: Record<string, unknown> }

function buildRequest(token?: string) {
  const params = new URLSearchParams(token !== undefined ? { token } : {})
  return { nextUrl: { searchParams: params } } as never
}

async function llamar(token?: string): Promise<Respuesta> {
  return (await GET(buildRequest(token))) as unknown as Respuesta
}

function columnasSeleccionadas(tabla: string): string[] {
  const llamada = mockSelect.mock.calls.find(([t]) => t === tabla)
  return (llamada?.[1] as string).split(',').map(c => c.trim())
}

const TOKEN_VALIDO = '3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c'

const COLUMNAS_CONSULTA = ['id', 'abogado_id', 'nombre_cliente', 'email_cliente', 'asunto', 'mensaje', 'estado', 'respuesta', 'respondida_en', 'created_at']
const COLUMNAS_CITA = ['fecha_hora', 'meeting_url']

const consultaRow = {
  id: 10, abogado_id: 2, nombre_cliente: 'Ana', email_cliente: 'ana@example.com',
  asunto: 'Embargo', mensaje: 'Detalle', estado: 'respondida', respuesta: 'Hola',
  respondida_en: '2026-06-01T10:00:00Z', created_at: '2026-05-30T10:00:00Z',
}
const citaRow = { fecha_hora: '2026-06-05T14:00:00Z', meeting_url: 'https://example.com/sala' }

beforeEach(() => jest.clearAllMocks())

// ─── GET /api/seguimiento ────────────────────────────────────────────────────

describe('GET /api/seguimiento', () => {
  it('devuelve 400 si falta el token', async () => {
    const res = await llamar()
    expect(res.status).toBe(400)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('devuelve 400 si el token no tiene formato UUID', async () => {
    const res = await llamar('no-es-un-uuid')
    expect(res.status).toBe(400)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('devuelve 404 con mensaje genérico si el token no existe', async () => {
    mockConsultaMaybeSingle.mockResolvedValue({ data: null, error: null })
    const res = await llamar(TOKEN_VALIDO)
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Enlace inválido o expirado.' })
    expect(mockFrom).not.toHaveBeenCalledWith('citas')
  })

  it('devuelve 200 solo con las columnas permitidas', async () => {
    mockConsultaMaybeSingle.mockResolvedValue({ data: consultaRow, error: null })
    mockCitasLimit.mockResolvedValue({ data: [citaRow], error: null })

    const res = await llamar(TOKEN_VALIDO)

    expect(res.status).toBe(200)
    expect(columnasSeleccionadas('consultas')).toEqual(COLUMNAS_CONSULTA)
    expect(columnasSeleccionadas('citas')).toEqual(COLUMNAS_CITA)
    expect(Object.keys(res.body).sort()).toEqual(['cita', 'consulta'])
    expect(Object.keys(res.body.consulta as object).sort()).toEqual([...COLUMNAS_CONSULTA].sort())
    expect(Object.keys(res.body.cita as object).sort()).toEqual([...COLUMNAS_CITA].sort())
  })

  it('devuelve cita null si la consulta no tiene citas', async () => {
    mockConsultaMaybeSingle.mockResolvedValue({ data: consultaRow, error: null })
    mockCitasLimit.mockResolvedValue({ data: [], error: null })
    const res = await llamar(TOKEN_VALIDO)
    expect(res.status).toBe(200)
    expect(res.body.cita).toBeNull()
  })

  it('no expone error.message de Supabase', async () => {
    mockConsultaMaybeSingle.mockResolvedValue({ data: null, error: { message: 'relation "consultas" detalle interno' } })
    const res = await llamar(TOKEN_VALIDO)
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'Error interno' })
  })
})
