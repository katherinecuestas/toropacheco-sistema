import { POST } from '../app/api/confirmar-consulta/route'
import { db, resetDb, req, type Respuesta } from './support/fakeSupabase'

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

const supervisor = (id: number, estado: boolean) =>
  ({ id, auth_user_id: `auth-sup-${id}`, rol: 'supervisor', estado, nombres: `Sup ${id}`, nombre_negocio: null })

const enviar = async () =>
  (await POST(req('POST', '/api/confirmar-consulta', undefined, {
    emailCliente: 'ana@example.com', nombreCliente: 'Ana', asunto: 'Embargo', mensaje: 'Detalle',
    telefonoCliente: '+56911111111', token: '3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c',
  }) as never)) as unknown as Respuesta

const notificadosA = () => (db.notificaciones ?? []).map(n => n.usuario_id).sort()

beforeEach(() => {
  resetDb({ prospectos: [], notificaciones: [] })
  // El usuario 3 del fixture es un supervisor sin campo estado; se reemplaza por supervisores explícitos
  db.usuarios = db.usuarios.filter(u => u.rol !== 'supervisor')
})

describe('POST /api/confirmar-consulta — notificación a supervisores', () => {
  it('notifica a TODOS los supervisores activos (no falla con más de uno)', async () => {
    db.usuarios.push(supervisor(10, true), supervisor(11, true))
    expect((await enviar()).status).toBe(200)
    expect(notificadosA()).toEqual([10, 11])
  })

  it('no notifica a supervisores deshabilitados', async () => {
    db.usuarios.push(supervisor(10, true), supervisor(12, false))
    await enviar()
    expect(notificadosA()).toEqual([10])
  })

  it('no notifica a abogados', async () => {
    db.usuarios.push(supervisor(10, true))
    await enviar()
    expect(notificadosA()).not.toContain(1)
  })

  it('sin supervisores activos no crea notificaciones, pero sí registra el prospecto', async () => {
    db.usuarios.push(supervisor(12, false))
    expect((await enviar()).status).toBe(200)
    expect(notificadosA()).toEqual([])
    expect(db.prospectos).toHaveLength(1)
  })

  it('cada notificación lleva los datos de la consulta', async () => {
    db.usuarios.push(supervisor(10, true))
    await enviar()
    expect(db.notificaciones[0]).toMatchObject({ tipo: 'prospecto', titulo: 'Nueva consulta web — Ana', leida: false })
  })
})
