import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAbogadoId(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return null
  const { data } = await supabaseAdmin.from('usuarios').select('id').eq('auth_user_id', user.id).maybeSingle()
  return data?.id ?? null
}

export async function GET(request: Request) {
  try {
    const abogadoId = await getAbogadoId(request)
    if (!abogadoId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data } = await supabaseAdmin
      .from('contratos')
      .select('*, clientes(*)')
      .eq('abogado_id', abogadoId)
      .order('created_at', { ascending: false })

    return NextResponse.json({ clientes: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const abogadoId = await getAbogadoId(request)
    if (!abogadoId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { nombre, rut, email, telefono, tipo_servicio, descripcion, fecha_inicio, monto_total, monto_pie } = await request.json()

    const saldo = monto_total - monto_pie

    const { data: cliente, error: clienteError } = await supabaseAdmin
      .from('clientes')
      .insert({ nombre, rut, email, telefono })
      .select().single()

    if (clienteError) return NextResponse.json({ error: clienteError.message }, { status: 400 })

    const { data: contrato, error: contratoError } = await supabaseAdmin
      .from('contratos')
      .insert({ cliente_id: cliente.id, abogado_id: abogadoId, tipo_servicio, descripcion, fecha_inicio, monto_total, monto_pie, saldo })
      .select().single()

    if (contratoError) return NextResponse.json({ error: contratoError.message }, { status: 400 })

    return NextResponse.json({ success: true, contrato: { ...contrato, clientes: cliente } })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const abogadoId = await getAbogadoId(request)
    if (!abogadoId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { contrato_id, cliente_id, nombre, rut, email, telefono, tipo_servicio, descripcion, estado, fecha_inicio, monto_total, monto_pie } = await request.json()

    await supabaseAdmin.from('clientes').update({ nombre, rut, email, telefono }).eq('id', cliente_id)

    const { data: cuotas } = await supabaseAdmin
      .from('cuotas')
      .select('monto, estado')
      .eq('contrato_id', contrato_id)
      .eq('estado', 'pagada')

    const pagado = (cuotas ?? []).reduce((sum: number, c: any) => sum + c.monto, 0)
    const saldo = monto_total - monto_pie - pagado

    await supabaseAdmin.from('contratos')
      .update({ tipo_servicio, descripcion, estado, fecha_inicio, monto_total, monto_pie, saldo })
      .eq('id', contrato_id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const abogadoId = await getAbogadoId(request)
    if (!abogadoId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { contrato_id, cliente_id } = await request.json()

    await supabaseAdmin.from('contratos').delete().eq('id', contrato_id)

    const { count } = await supabaseAdmin.from('contratos').select('*', { count: 'exact', head: true }).eq('cliente_id', cliente_id)
    if (count === 0) await supabaseAdmin.from('clientes').delete().eq('id', cliente_id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
