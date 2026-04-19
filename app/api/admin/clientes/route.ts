import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data, error } = await supabaseAdmin.from('clientes').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  return NextResponse.json({ success: true, clientes: data })
}

export async function DELETE(request: NextRequest) {
  try {
    const { id, auth_user_id } = await request.json()
    await supabaseAdmin.from('clientes').delete().eq('id', id)
    await supabaseAdmin.auth.admin.deleteUser(auth_user_id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
