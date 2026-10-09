import { GET, POST, PUT } from '../app/api/admin/abogados/route'
import { db, resetDb, req, TOKEN, ABOGADO_ID, type Respuesta } from './support/fakeSupabase'

jest.mock('../lib/supabase-admin', () => jest.requireActual('./support/fakeSupabase'))

// Simular NextResponse.json como un objeto simple { status, body }
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status: number }) => ({ body, status: init?.status ?? 200 }),
  },
}))

// Columna legada en BD: debe ignorarse (ni leerse para decidir ni exponerse)
beforeEach(() => {
  resetDb()
  db.usuarios[0].is_admin = true
})

const llamar = async (fn: (r: Request) => Promise<unknown>, method: string, token?: string, body?: unknown) =>
  (await fn(req(method, '/api/admin/abogados', token, body) as never)) as unknown as Respuesta
const esAdminEnTabla = (authUserId: string) => db.admins.some(a => a.auth_user_id === authUserId)
const edicion = (auth_user_id: string, es_admin: boolean) => ({
  id: ABOGADO_ID, auth_user_id, email: 'branco@example.com', nombres: 'Branco', estado: true, es_admin,
})

describe('/api/admin/abogados — admin desde la tabla admins', () => {
  it('403 para un abogado aunque usuarios.is_admin sea true', async () => {
    expect((await llamar(GET, 'GET', TOKEN.abogado)).status).toBe(403)
  })

  it('GET calcula es_admin desde admins y no expone is_admin', async () => {
    db.admins.push({ id: 2, auth_user_id: 'auth-abogado-2' })
    const res = await llamar(GET, 'GET', TOKEN.admin)
    expect(res.status).toBe(200)
    const lista = res.body.abogados as Record<string, unknown>[]
    expect(lista.find(u => u.auth_user_id === 'auth-abogado-1')).toMatchObject({ es_admin: false })
    expect(lista.find(u => u.auth_user_id === 'auth-abogado-2')).toMatchObject({ es_admin: true })
    expect(lista.every(u => !('is_admin' in u))).toBe(true)
  })

  it('PUT con es_admin = true crea la fila en admins', async () => {
    expect((await llamar(PUT, 'PUT', TOKEN.admin, edicion('auth-abogado-1', true))).status).toBe(200)
    expect(esAdminEnTabla('auth-abogado-1')).toBe(true)
  })

  it('PUT con es_admin = false borra la fila en admins', async () => {
    db.admins.push({ id: 2, auth_user_id: 'auth-abogado-1' })
    expect((await llamar(PUT, 'PUT', TOKEN.admin, edicion('auth-abogado-1', false))).status).toBe(200)
    expect(esAdminEnTabla('auth-abogado-1')).toBe(false)
  })

  it('PUT no permite que un admin se quite su propio acceso', async () => {
    expect((await llamar(PUT, 'PUT', TOKEN.admin, edicion('auth-admin', false))).status).toBe(400)
    expect(esAdminEnTabla('auth-admin')).toBe(true)
  })

  it('PUT no escribe la columna usuarios.is_admin', async () => {
    await llamar(PUT, 'PUT', TOKEN.admin, edicion('auth-abogado-1', false))
    expect(db.usuarios[0].is_admin).toBe(true) // valor legado intacto
  })

  it('POST con es_admin = true crea el usuario y su fila en admins', async () => {
    const res = await llamar(POST, 'POST', TOKEN.admin, {
      email: 'nueva@example.com', password: 'Segura1234', nombres: 'Nueva', es_admin: true,
    })
    expect(res.status).toBe(200)
    const creado = db.usuarios.find(u => u.email === 'nueva@example.com')!
    expect(creado).not.toHaveProperty('is_admin')
    expect(esAdminEnTabla(creado.auth_user_id as string)).toBe(true)
  })
})
