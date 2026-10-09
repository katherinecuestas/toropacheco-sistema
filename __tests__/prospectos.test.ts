import { PATCH } from '../app/api/prospectos/route'
import { db, resetDb, req, TOKEN, ABOGADO_ID, type Respuesta } from './support/fakeSupabase'

jest.mock('../lib/supabase-admin', () => jest.requireActual('./support/fakeSupabase'))

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: jest.fn().mockResolvedValue({ error: null }) } })),
}))

// Simular NextResponse.json como un objeto simple { status, body }
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status: number }) => ({ body, status: init?.status ?? 200 }),
  },
}))

const SUPERVISOR_ID = 3
const EN_PIPELINE = 50        // estado visible para abogados (GET /api/prospectos)
const FUERA_PIPELINE = 51     // 'sin_contacto' creado por el supervisor: el abogado no lo ve
const PROPIO_FUERA = 52       // 'sin_contacto' pero creado por el mismo abogado

beforeEach(() => resetDb({
  prospectos: [
    { id: EN_PIPELINE, nombre: 'Ana', estado: 'interesado', creado_por: SUPERVISOR_ID, revisado: false },
    { id: FUERA_PIPELINE, nombre: 'Luis', estado: 'sin_contacto', creado_por: SUPERVISOR_ID, revisado: false },
    { id: PROPIO_FUERA, nombre: 'Rosa', estado: 'sin_contacto', creado_por: ABOGADO_ID, revisado: false },
  ],
  prospecto_timeline: [],
}))

const prospecto = (id: number) => db.prospectos.find(p => p.id === id)!
const patch = async (token: string | undefined, body: unknown) =>
  (await PATCH(req('PATCH', '/api/prospectos', token, body) as never)) as unknown as Respuesta

describe('PATCH /api/prospectos', () => {
  it('401 sin token, sin modificar', async () => {
    expect((await patch(undefined, { id: EN_PIPELINE, estado: 'agendado' })).status).toBe(401)
    expect(prospecto(EN_PIPELINE).estado).toBe('interesado')
  })

  it('403 con token de supervisor', async () => {
    expect((await patch(TOKEN.supervisor, { id: EN_PIPELINE, estado: 'agendado' })).status).toBe(403)
  })

  it('403 si el prospecto no está en el pipeline del abogado ni lo creó él', async () => {
    expect((await patch(TOKEN.abogado, { id: FUERA_PIPELINE, estado: 'venta' })).status).toBe(403)
    expect(prospecto(FUERA_PIPELINE).estado).toBe('sin_contacto')
    expect(db.ventas ?? []).toHaveLength(0)
  })

  it('403 también al marcar revisado un prospecto sin permiso', async () => {
    expect((await patch(TOKEN.abogado, { id: FUERA_PIPELINE })).status).toBe(403)
    expect(prospecto(FUERA_PIPELINE).revisado).toBe(false)
  })

  it('404 si el prospecto no existe', async () => {
    expect((await patch(TOKEN.abogado, { id: 999, estado: 'agendado' })).status).toBe(404)
  })

  it('200 cambia el estado de un prospecto del pipeline y registra el timeline', async () => {
    expect((await patch(TOKEN.abogado, { id: EN_PIPELINE, estado: 'agendado' })).status).toBe(200)
    expect(prospecto(EN_PIPELINE).estado).toBe('agendado')
    expect(db.prospecto_timeline).toHaveLength(1)
  })

  it('200 sobre un prospecto creado por el mismo abogado aunque esté fuera del pipeline', async () => {
    expect((await patch(TOKEN.abogado, { id: PROPIO_FUERA })).status).toBe(200)
    expect(prospecto(PROPIO_FUERA).revisado).toBe(true)
  })
})
