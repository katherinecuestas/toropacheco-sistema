import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const { error: authErr } = await requireAdmin(request)
  if (authErr) return authErr

  const clienteId = request.nextUrl.searchParams.get('cliente_id')
  const { data, error } = await supabaseAdmin.from('contratos').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  return NextResponse.json({ success: true, contratos: data })
}

export async function POST(request: NextRequest) {
  const { error: authErr } = await requireAdmin(request)
  if (authErr) return authErr

  try {
    const body = await request.json()
    const { data, error: dbError } = await supabaseAdmin.from('contratos').insert(body).select().single()
    if (dbError) return NextResponse.json({ success: false, error: dbError.message }, { status: 400 })
    return NextResponse.json({ success: true, contrato: data })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const { error: authErr } = await requireAdmin(request)
  if (authErr) return authErr

  try {
    const { id, ...datos } = await request.json()
    const { error } = await supabaseAdmin.from('contratos').update(datos).eq('id', id)
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { error: authErr } = await requireAdmin(request)
  if (authErr) return authErr

  try {
    const { id } = await request.json()
    const { error: dbError } = await supabaseAdmin.from('contratos').delete().eq('id', id)
    if (dbError) return NextResponse.json({ success: false, error: dbError.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
