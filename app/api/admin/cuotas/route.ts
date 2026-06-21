import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const { error: authErr } = await requireAdmin(request)
  if (authErr) return authErr

  const contratoId = request.nextUrl.searchParams.get('contrato_id')
  const { data, error } = await supabaseAdmin.from('cuotas').select('*').eq('contrato_id', contratoId).order('numero')
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  return NextResponse.json({ success: true, cuotas: data })
}

export async function POST(request: NextRequest) {
  const { error: authErr } = await requireAdmin(request)
  if (authErr) return authErr

  try {
    const body = await request.json()
    const { data, error: dbError } = await supabaseAdmin.from('cuotas').insert(body).select().single()
    if (dbError) return NextResponse.json({ success: false, error: dbError.message }, { status: 400 })
    return NextResponse.json({ success: true, cuota: data })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const { error: authErr } = await requireAdmin(request)
  if (authErr) return authErr

  try {
    const { id, ...datos } = await request.json()
    const { error: dbError } = await supabaseAdmin.from('cuotas').update(datos).eq('id', id)
    if (dbError) return NextResponse.json({ success: false, error: dbError.message }, { status: 400 })
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
    const { error: dbError } = await supabaseAdmin.from('cuotas').delete().eq('id', id)
    if (dbError) return NextResponse.json({ success: false, error: dbError.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
