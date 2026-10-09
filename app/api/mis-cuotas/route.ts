import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAbogado } from '@/lib/api-auth'

/**
 * Verifica que el contrato exista y pertenezca al abogado.
 * Devuelve `null` si tiene acceso, o la respuesta 404/403 correspondiente.
 */
async function verificarContrato(contratoId: number | string, abogadoId: number) {
  const { data: contrato } = await supabaseAdmin
    .from('contratos').select('id, abogado_id').eq('id', contratoId).maybeSingle()
  if (!contrato) return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
  if (contrato.abogado_id !== abogadoId) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  return null
}

/**
 * Verifica que la cuota exista y pertenezca a un contrato del abogado.
 * Devuelve `{ contratoId }` si tiene acceso, o `{ error }` con la respuesta 404/403.
 */
async function verificarCuota(cuotaId: number | string, abogadoId: number) {
  const { data: cuota } = await supabaseAdmin
    .from('cuotas').select('id, contrato_id').eq('id', cuotaId).maybeSingle()
  if (!cuota) return { contratoId: null, error: NextResponse.json({ error: 'Cuota no encontrada' }, { status: 404 }) }
  const error = await verificarContrato(cuota.contrato_id, abogadoId)
  return { contratoId: cuota.contrato_id as number, error }
}

export async function GET(request: Request) {
  const { usuario, error: authErr } = await requireAbogado(request)
  if (authErr) return authErr

  try {
    const { searchParams } = new URL(request.url)
    const contratoId = searchParams.get('contrato_id')
    if (!contratoId) return NextResponse.json({ cuotas: [] })

    const accesoErr = await verificarContrato(contratoId, usuario!.id)
    if (accesoErr) return accesoErr

    const { data, error } = await supabaseAdmin
      .from('cuotas')
      .select('*')
      .eq('contrato_id', contratoId)
      .order('numero')

    if (error) return NextResponse.json({ error: 'Error al obtener cuotas' }, { status: 500 })
    return NextResponse.json({ cuotas: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { usuario, error: authErr } = await requireAbogado(request)
    if (authErr) return authErr

    const { contrato_id, numero, monto, fecha_vencimiento } = await request.json()

    const accesoErr = await verificarContrato(contrato_id, usuario!.id)
    if (accesoErr) return accesoErr

    const { data, error } = await supabaseAdmin
      .from('cuotas')
      .insert({ contrato_id, numero, monto, fecha_vencimiento, estado: 'pendiente' })
      .select().single()

    if (error) return NextResponse.json({ error: 'Error al crear la cuota' }, { status: 500 })
    return NextResponse.json({ success: true, cuota: data })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const { usuario, error: authErr } = await requireAbogado(request)
  if (authErr) return authErr

  try {
    const { id, estado, fecha_pago, comprobante, comprobante_url } = await request.json()

    // El contrato se toma de la cuota en BD, no del body
    const { contratoId, error: accesoErr } = await verificarCuota(id, usuario!.id)
    if (accesoErr) return accesoErr

    const { error: updateError } = await supabaseAdmin.from('cuotas').update({ estado, fecha_pago: fecha_pago || null, comprobante: comprobante || null, comprobante_url: comprobante_url || null }).eq('id', id)
    if (updateError) return NextResponse.json({ error: 'Error al actualizar la cuota' }, { status: 500 })

    // Recalcular saldo del contrato
    const { data: contrato } = await supabaseAdmin.from('contratos').select('monto_total, monto_pie').eq('id', contratoId).single()
    const { data: cuotas } = await supabaseAdmin.from('cuotas').select('monto').eq('contrato_id', contratoId).eq('estado', 'pagada')
    const pagado = (cuotas ?? []).reduce((sum: number, c: { monto: number }) => sum + c.monto, 0)
    const saldo = (contrato?.monto_total ?? 0) - (contrato?.monto_pie ?? 0) - pagado

    await supabaseAdmin.from('contratos').update({ saldo }).eq('id', contratoId)

    return NextResponse.json({ success: true, saldo })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { usuario, error: authErr } = await requireAbogado(request)
  if (authErr) return authErr

  try {
    const { id } = await request.json()

    const { error: accesoErr } = await verificarCuota(id, usuario!.id)
    if (accesoErr) return accesoErr

    const { error } = await supabaseAdmin.from('cuotas').delete().eq('id', id)
    if (error) return NextResponse.json({ error: 'Error al eliminar la cuota' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
