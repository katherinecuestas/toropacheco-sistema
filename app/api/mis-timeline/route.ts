import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAbogado } from '@/lib/api-auth'

// Timeline del caso (timeline_eventos) para el abogado dueño del contrato.
// /api/admin/timeline queda solo para administradores.

/**
 * Verifica que el contrato exista y pertenezca al abogado.
 * Devuelve `null` si tiene acceso, o la respuesta 404/403 correspondiente.
 */
async function verificarContrato(contratoId: unknown, abogadoId: number) {
  const { data: contrato } = await supabaseAdmin
    .from('contratos').select('id, abogado_id').eq('id', contratoId).maybeSingle()
  if (!contrato) return NextResponse.json({ success: false, error: 'Contrato no encontrado' }, { status: 404 })
  if (contrato.abogado_id !== abogadoId) return NextResponse.json({ success: false, error: 'Acceso denegado' }, { status: 403 })
  return null
}

/**
 * Verifica que el evento exista y que su contrato pertenezca al abogado.
 * Devuelve `null` si tiene acceso, o la respuesta 404/403 correspondiente.
 */
async function verificarEvento(eventoId: unknown, abogadoId: number) {
  const { data: evento } = await supabaseAdmin
    .from('timeline_eventos').select('id, contrato_id').eq('id', eventoId).maybeSingle()
  if (!evento) return NextResponse.json({ success: false, error: 'Evento no encontrado' }, { status: 404 })
  return verificarContrato(evento.contrato_id, abogadoId)
}

// GET → eventos de un contrato propio
export async function GET(request: Request) {
  const { usuario, error: authErr } = await requireAbogado(request)
  if (authErr) return authErr

  try {
    const contratoId = new URL(request.url).searchParams.get('contrato_id')
    if (!contratoId) return NextResponse.json({ success: false, error: 'contrato_id requerido' }, { status: 400 })

    const accesoErr = await verificarContrato(contratoId, usuario!.id)
    if (accesoErr) return accesoErr

    const { data, error } = await supabaseAdmin
      .from('timeline_eventos').select('*').eq('contrato_id', contratoId).order('fecha')
    if (error) return NextResponse.json({ success: false, error: 'Error al obtener el timeline' }, { status: 500 })
    return NextResponse.json({ success: true, eventos: data ?? [] })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}

// POST → crear evento en un contrato propio
export async function POST(request: Request) {
  const { usuario, error: authErr } = await requireAbogado(request)
  if (authErr) return authErr

  try {
    const { contrato_id, titulo, descripcion, fecha, completado } = await request.json()

    const accesoErr = await verificarContrato(contrato_id, usuario!.id)
    if (accesoErr) return accesoErr

    const { data, error } = await supabaseAdmin
      .from('timeline_eventos')
      .insert({ contrato_id, titulo, descripcion: descripcion ?? null, fecha, completado: completado ?? false })
      .select().single()
    if (error) return NextResponse.json({ success: false, error: 'Error al crear el evento' }, { status: 500 })
    return NextResponse.json({ success: true, evento: data })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}

// PUT → editar evento de un contrato propio (no permite moverlo a otro contrato)
export async function PUT(request: Request) {
  const { usuario, error: authErr } = await requireAbogado(request)
  if (authErr) return authErr

  try {
    const { id, titulo, descripcion, fecha, completado } = await request.json()

    const accesoErr = await verificarEvento(id, usuario!.id)
    if (accesoErr) return accesoErr

    const { error } = await supabaseAdmin
      .from('timeline_eventos').update({ titulo, descripcion: descripcion ?? null, fecha, completado }).eq('id', id)
    if (error) return NextResponse.json({ success: false, error: 'Error al actualizar el evento' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}

// DELETE → eliminar evento de un contrato propio
export async function DELETE(request: Request) {
  const { usuario, error: authErr } = await requireAbogado(request)
  if (authErr) return authErr

  try {
    const { id } = await request.json()

    const accesoErr = await verificarEvento(id, usuario!.id)
    if (accesoErr) return accesoErr

    const { error } = await supabaseAdmin.from('timeline_eventos').delete().eq('id', id)
    if (error) return NextResponse.json({ success: false, error: 'Error al eliminar el evento' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
