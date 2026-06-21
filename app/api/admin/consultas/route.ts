import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: Request) {
  const { error } = await requireAdmin(request)
  if (error) return error

  const { data, error: dbError } = await supabaseAdmin.from('consultas').select('*').order('created_at', { ascending: false })
  if (dbError) return NextResponse.json({ consultas: null, error: dbError.message }, { status: 400 })
  return NextResponse.json({ consultas: data })
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin(request)
  if (error) return error

  try {
    const { abogado_id, nombre_cliente, email_cliente, telefono_cliente, asunto, mensaje, estado } = await request.json()
    const { data, error } = await supabaseAdmin
      .from('consultas')
      .insert({ abogado_id, nombre_cliente, email_cliente, telefono_cliente: telefono_cliente || null, asunto, mensaje, estado: estado || 'nueva', token: crypto.randomUUID() })
      .select()
      .single()
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, consulta: data })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, nombre_cliente, email_cliente, telefono_cliente, asunto, mensaje, estado, respuesta } = await request.json()
    const updates: Record<string, unknown> = { nombre_cliente, email_cliente, telefono_cliente: telefono_cliente || null, asunto, mensaje, estado }
    if (respuesta !== undefined) updates.respuesta = respuesta
    if (estado === 'respondida' && respuesta) updates.respondida_en = new Date().toISOString()
    const { data, error } = await supabaseAdmin
      .from('consultas').update(updates).eq('id', id).select().single()
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, consulta: data })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()
    const { error } = await supabaseAdmin.from('consultas').delete().eq('id', id)
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
