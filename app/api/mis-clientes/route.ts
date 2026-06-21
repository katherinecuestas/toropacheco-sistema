import { NextResponse } from 'next/server'
import { requireAbogado } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: Request) {
  try {
    const { usuario, error } = await requireAbogado(request)
    if (error) return error
    const abogadoId = usuario!.id

    // Solo clientes que tienen al menos un contrato con este abogado
    const { data: contratos, error: contratosError } = await supabaseAdmin
      .from('contratos')
      .select('*, clientes(*)')
      .eq('abogado_id', abogadoId)
      .order('created_at', { ascending: false })

    if (contratosError) return NextResponse.json({ error: contratosError.message }, { status: 400 })

    const clienteIds = [...new Set((contratos ?? []).map(c => c.cliente_id))]

    const result = clienteIds.map(id => {
      const contratosCliente = (contratos ?? []).filter(c => c.cliente_id === id)
      const cliente = contratosCliente[0]?.clientes ?? null
      return { ...cliente, contrato: contratosCliente[0] ?? null }
    })

    return NextResponse.json({ clientes: result })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { usuario, error } = await requireAbogado(request)
    if (error) return error
    const abogadoId = usuario!.id

    const { nombre, rut, email, telefono, tipo_servicio, descripcion, fecha_inicio, monto_total, monto_pie, clienteExistenteId } = await request.json()

    const saldo = monto_total - monto_pie

    let clienteId: number

    if (clienteExistenteId) {
      clienteId = clienteExistenteId
    } else {
      const { data: nuevoCliente, error: clienteError } = await supabaseAdmin
        .from('clientes')
        .insert({ nombre, rut, email, telefono })
        .select().single()
      if (clienteError) return NextResponse.json({ error: clienteError.message }, { status: 400 })
      clienteId = nuevoCliente.id
    }

    const { data: contrato, error: contratoError } = await supabaseAdmin
      .from('contratos')
      .insert({ cliente_id: clienteId, abogado_id: abogadoId, tipo_servicio, descripcion, fecha_inicio, monto_total, monto_pie, saldo })
      .select().single()

    if (contratoError) return NextResponse.json({ error: contratoError.message }, { status: 400 })

    const { data: cliente } = await supabaseAdmin.from('clientes').select('*').eq('id', clienteId).single()
    return NextResponse.json({ success: true, contrato: { ...contrato, clientes: cliente } })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { usuario, error } = await requireAbogado(request)
    if (error) return error
    const abogadoId = usuario!.id

    const { contrato_id, cliente_id, nombre, rut, email, telefono, tipo_servicio, descripcion, estado, fecha_inicio, monto_total, monto_pie } = await request.json()

    // Verificar que el contrato pertenece a este abogado antes de modificar
    const { data: contratoVerif } = await supabaseAdmin
      .from('contratos').select('id').eq('id', contrato_id).eq('abogado_id', abogadoId).maybeSingle()
    if (!contratoVerif) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

    await supabaseAdmin.from('clientes').update({ nombre, rut, email, telefono }).eq('id', cliente_id)

    const { data: cuotas } = await supabaseAdmin
      .from('cuotas')
      .select('monto, estado')
      .eq('contrato_id', contrato_id)
      .eq('estado', 'pagada')

    const pagado = (cuotas ?? []).reduce((sum: number, c: { monto: number }) => sum + c.monto, 0)
    const saldo = monto_total - monto_pie - pagado

    await supabaseAdmin.from('contratos')
      .update({ tipo_servicio, descripcion, estado, fecha_inicio, monto_total, monto_pie, saldo })
      .eq('id', contrato_id)
      .eq('abogado_id', abogadoId)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { usuario, error } = await requireAbogado(request)
    if (error) return error
    const abogadoId = usuario!.id

    const { contrato_id, cliente_id } = await request.json()

    // Solo eliminar contratos que pertenecen a este abogado
    await supabaseAdmin.from('contratos').delete().eq('id', contrato_id).eq('abogado_id', abogadoId)

    const { count } = await supabaseAdmin.from('contratos').select('*', { count: 'exact', head: true }).eq('cliente_id', cliente_id)
    if (count === 0) await supabaseAdmin.from('clientes').delete().eq('id', cliente_id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
