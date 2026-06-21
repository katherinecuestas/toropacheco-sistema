import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: Request) {
  const { error } = await requireAdmin(request)
  if (error) return error

  const { data, error: dbError } = await supabaseAdmin.from('clientes').select('*').order('created_at', { ascending: false })
  if (dbError) return NextResponse.json({ success: false, error: dbError.message }, { status: 400 })
  return NextResponse.json({ success: true, clientes: data })
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAdmin(request)
  if (error) return error

  try {
    const { id, auth_user_id } = await request.json()
    await supabaseAdmin.from('clientes').delete().eq('id', id)
    await supabaseAdmin.auth.admin.deleteUser(auth_user_id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
