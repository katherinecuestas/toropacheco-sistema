import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAbogado } from '@/lib/api-auth'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const contratoId = searchParams.get('contrato_id')
  if (!contratoId) return NextResponse.json({ cuotas: [] })

  const { data } = await supabaseAdmin
    .from('cuotas')
    .select('*')
    .eq('contrato_id', contratoId)
    .order('numero')

  return NextResponse.json({ cuotas: data ?? [] })
}

export async function POST(request: Request) {
  try {
    const { contrato_id, numero, monto, fecha_vencimiento } = await request.json()

    const { data, error } = await supabaseAdmin
      .from('cuotas')
      .insert({ contrato_id, numero, monto, fecha_vencimiento, estado: 'pendiente' })
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, cuota: data })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { id, contrato_id, estado, fecha_pago, monto, comprobante, comprobante_url } = await request.json()

    await supabaseAdmin.from('cuotas').update({ estado, fecha_pago: fecha_pago || null, comprobante: comprobante || null, comprobante_url: comprobante_url || null }).eq('id', id)

    // Recalcular saldo del contrato
    const { data: contrato } = await supabaseAdmin.from('contratos').select('monto_total, monto_pie').eq('id', contrato_id).single()
    const { data: cuotas } = await supabaseAdmin.from('cuotas').select('monto').eq('contrato_id', contrato_id).eq('estado', 'pagada')
    const pagado = (cuotas ?? []).reduce((sum: number, c: { monto: number }) => sum + c.monto, 0)
    const saldo = (contrato?.monto_total ?? 0) - (contrato?.monto_pie ?? 0) - pagado

    await supabaseAdmin.from('contratos').update({ saldo }).eq('id', contrato_id)

    return NextResponse.json({ success: true, saldo })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()
    await supabaseAdmin.from('cuotas').delete().eq('id', id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
