import { GET, POST, PUT, PATCH } from '../app/api/admin/abogados/route'
import { db, resetDb, req, TOKEN, ABOGADO_ID, fallarInsert, fallarUpdate, cuentasAuth, ESQUEMA_USUARIOS, supabaseAdmin, type Respuesta } from './support/fakeSupabase'

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

describe('POST /api/admin/abogados — rol', () => {
  const crear = (extra: Record<string, unknown>) => llamar(POST, 'POST', TOKEN.admin, {
    email: 'nuevo@example.com', password: 'Segura1234', nombres: 'Nuevo', ...extra,
  })
  const creado = () => db.usuarios.find(u => u.email === 'nuevo@example.com')

  it("con rol 'supervisor' crea el usuario con ese rol", async () => {
    expect((await crear({ rol: 'supervisor' })).status).toBe(200)
    expect(creado()).toMatchObject({ rol: 'supervisor', estado: true })
  })

  it("sin rol crea un abogado", async () => {
    expect((await crear({})).status).toBe(200)
    expect(creado()!.rol).toBe('abogado')
  })

  it.each([['admin'], ['Supervisor'], [''], [123]])('400 con rol inválido (%p), sin crear nada', async (rol) => {
    const res = await crear({ rol })
    expect(res.status).toBe(400)
    expect(creado()).toBeUndefined()
  })

  it('403 si quien crea no es admin', async () => {
    expect((await llamar(POST, 'POST', TOKEN.abogado, { email: 'x@example.com', password: 'Segura1234', rol: 'supervisor' })).status).toBe(403)
  })
})

describe('POST /api/admin/abogados — campos permitidos y errores', () => {
  // resetDb() aplica el esquema REAL de usuarios (sin columna "nombre"; NOT NULL en
  // auth_user_id, email, estado y nombre_negocio): ver ESQUEMA_USUARIOS en support/fakeSupabase
  let consoleError: jest.SpyInstance

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => consoleError.mockRestore())

  const crear = (body: Record<string, unknown>) => llamar(POST, 'POST', TOKEN.admin, body)
  const fila = (email: string) => db.usuarios.find(u => u.email === email)

  it('el payload exacto del modal de supervisores crea un supervisor', async () => {
    // Mismo objeto que envía app/admin/page.tsx → crearAbogado({ ..., rol: 'supervisor' })
    const payloadModal = {
      nombres: 'Vladimir', apellido_paterno: '', apellido_materno: '', nombre_usuario: '',
      email: 'vladimir@example.com', password: 'Segura1234', rol: 'supervisor',
    }
    const res = await crear(payloadModal)
    expect(res.status).toBe(200)
    expect(fila('vladimir@example.com')).toMatchObject({
      nombres: 'Vladimir', nombre_negocio: 'Vladimir', rol: 'supervisor', estado: true,
    })
    expect(fila('vladimir@example.com')).not.toHaveProperty('nombre')
  })

  it('ignora campos no permitidos (is_admin, id, nombre, estado, auth_user_id, columna_inventada)', async () => {
    const res = await crear({
      nombres: 'Intruso', email: 'intruso@example.com', password: 'Segura1234',
      is_admin: true, id: 999, nombre: 'X', estado: false, auth_user_id: 'auth-falso', columna_inventada: 1,
    })
    expect(res.status).toBe(200)
    const creado = fila('intruso@example.com')!
    expect(creado.is_admin).toBeUndefined()
    expect(creado).not.toHaveProperty('nombre')
    expect(creado).not.toHaveProperty('columna_inventada')
    expect(creado.id).not.toBe(999)
    expect(creado.estado).toBe(true)
    expect(creado.auth_user_id).toBe(cuentasAuth.find(c => c.email === 'intruso@example.com')!.id)
    expect(db.admins.some(a => a.auth_user_id === creado.auth_user_id)).toBe(false)
  })

  it('si falla el insert en usuarios, borra la cuenta recién creada en Auth', async () => {
    fallarInsert.add('usuarios')
    const res = await crear({ nombres: 'Ana', email: 'ana@example.com', password: 'Segura1234' })
    expect(res.status).toBe(500)
    expect(cuentasAuth.find(c => c.email === 'ana@example.com')).toBeUndefined()
    expect(fila('ana@example.com')).toBeUndefined()
  })

  it('no devuelve error.message de Supabase: responde genérico y lo registra con console.error', async () => {
    fallarInsert.add('usuarios')
    const res = await crear({ nombres: 'Ana', email: 'ana@example.com', password: 'Segura1234' })
    expect(res.body.error).toBe('No se pudo crear el usuario.')
    expect(JSON.stringify(res.body)).not.toContain('fallo simulado')
    expect(consoleError).toHaveBeenCalled()
  })

  it('email ya registrado: mensaje propio, sin reenviar el de Supabase Auth', async () => {
    await crear({ nombres: 'Ana', email: 'ana@example.com', password: 'Segura1234' })
    const res = await crear({ nombres: 'Ana', email: 'ana@example.com', password: 'Segura1234' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Ya existe una cuenta con ese email.')
    expect(JSON.stringify(res.body)).not.toContain('already been registered')
  })
})

describe('esquema real de usuarios — nombre_negocio y columnas existentes', () => {
  let consoleError: jest.SpyInstance
  beforeEach(() => { consoleError = jest.spyOn(console, 'error').mockImplementation(() => {}) })
  afterEach(() => consoleError.mockRestore())

  const fila = (email: string) => db.usuarios.find(u => u.email === email)!
  const columnasInexistentes = (f: Record<string, unknown>) =>
    Object.keys(f).filter(c => !ESQUEMA_USUARIOS.columnas.includes(c))

  it('la base falsa rechaza un insert en usuarios sin una columna NOT NULL', async () => {
    const { error } = await supabaseAdmin.from('usuarios')
      .insert({ auth_user_id: 'x', email: 'x@example.com', estado: true }).select().single()
    expect(error).toMatchObject({ code: '23502' })
  })

  it('POST con el payload exacto del modal de supervisores: nombre_negocio no vacío', async () => {
    const payloadModal = {
      nombres: 'Vladimir', apellido_paterno: '', apellido_materno: '', nombre_usuario: '',
      email: 'vladimir@example.com', password: 'Segura1234', rol: 'supervisor',
    }
    expect((await llamar(POST, 'POST', TOKEN.admin, payloadModal)).status).toBe(200)
    const creado = fila('vladimir@example.com')
    expect(creado.nombre_negocio).toBe('Vladimir')
    expect(creado.rol).toBe('supervisor')
    expect(columnasInexistentes(creado)).toEqual([])
  })

  it('POST sin nombres: nombre_negocio se completa con el email', async () => {
    const res = await llamar(POST, 'POST', TOKEN.admin, {
      nombres: '   ', apellido_paterno: '', apellido_materno: '', email: 'sin.nombre@example.com', password: 'Segura1234', rol: 'supervisor',
    })
    expect(res.status).toBe(200)
    expect(fila('sin.nombre@example.com').nombre_negocio).toBe('sin.nombre@example.com')
  })

  it('POST guarda dv y nombre_usuario', async () => {
    await llamar(POST, 'POST', TOKEN.admin, {
      nombres: 'Ana', apellido_paterno: 'Pérez', email: 'ana@example.com', password: 'Segura1234',
      rut: '12345678', dv: 'K', nombre_usuario: 'aperez',
    })
    expect(fila('ana@example.com')).toMatchObject({ rut: '12345678', dv: 'K', nombre_usuario: 'aperez', nombre_negocio: 'Ana Pérez' })
  })

  // Mismo objeto que envía app/admin/page.tsx → editarAbogado({ id, auth_user_id, ...formEditarUsuario })
  const payloadEdicion = {
    id: ABOGADO_ID, auth_user_id: 'auth-abogado-1',
    email: 'branco@example.com', nombres: 'Branco', apellido_paterno: 'Toro', apellido_materno: 'Pacheco',
    rut: '11111111', dv: '1', nombre_usuario: 'btoro', telefono: '+56911111111', es_admin: false, estado: true,
  }

  it('PUT con el payload del formulario de edición no escribe columnas inexistentes', async () => {
    const res = await llamar(PUT, 'PUT', TOKEN.admin, payloadEdicion)
    expect(res.status).toBe(200)
    const editado = db.usuarios.find(u => u.id === ABOGADO_ID)!
    expect(columnasInexistentes(editado)).toEqual([])
    expect(editado).not.toHaveProperty('nombre')
    expect(editado).toMatchObject({ nombre_negocio: 'Branco Toro Pacheco', dv: '1', nombre_usuario: 'btoro', email: 'branco@example.com' })
  })

  it('PUT ignora campos no permitidos (nombre, is_admin, rol, auth_user_id)', async () => {
    const antes = { ...db.usuarios.find(u => u.id === ABOGADO_ID)! }
    const res = await llamar(PUT, 'PUT', TOKEN.admin, { ...payloadEdicion, nombre: 'X', is_admin: true, rol: 'supervisor', columna_inventada: 1 })
    expect(res.status).toBe(200)
    const editado = db.usuarios.find(u => u.id === ABOGADO_ID)!
    expect(editado.rol).toBe(antes.rol)
    expect(editado.auth_user_id).toBe(antes.auth_user_id)
    expect(editado.is_admin).toBe(antes.is_admin)
    expect(columnasInexistentes(editado)).toEqual([])
  })

  it('PUT sin nombres ni nombre_negocio: completa con el email, nunca vacío', async () => {
    await llamar(PUT, 'PUT', TOKEN.admin, { ...payloadEdicion, nombres: '', apellido_paterno: '', apellido_materno: '' })
    expect(db.usuarios.find(u => u.id === ABOGADO_ID)!.nombre_negocio).toBe('branco@example.com')
  })

  it('PUT: si falla la base, mensaje genérico (sin error.message) y console.error', async () => {
    fallarUpdate.add('usuarios')
    const res = await llamar(PUT, 'PUT', TOKEN.admin, payloadEdicion)
    expect(res.status).toBe(500)
    expect(res.body.error).toBe('No se pudo actualizar el usuario.')
    expect(JSON.stringify(res.body)).not.toContain('fallo simulado')
    expect(consoleError).toHaveBeenCalled()
  })

  it('PATCH cambiar-password: si Auth falla, mensaje propio (sin error.message)', async () => {
    const original = supabaseAdmin.auth.admin.updateUserById
    supabaseAdmin.auth.admin.updateUserById = async () => ({ data: {}, error: { code: 'weak_password', message: 'Password is known to be weak' } }) as never
    try {
      const res = await llamar(PATCH, 'PATCH', TOKEN.admin, { auth_user_id: 'auth-abogado-1', action: 'cambiar-password', password: 'Segura1234' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('La contraseña no cumple los requisitos mínimos.')
      expect(JSON.stringify(res.body)).not.toContain('known to be weak')
    } finally {
      supabaseAdmin.auth.admin.updateUserById = original
    }
  })
})
