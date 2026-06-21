import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: Request) {
  const { error } = await requireAdmin(request)
  if (error) return error

  const [
    { count: totalAbogados },
    { count: abogadosActivos },
    { count: totalConsultas },
    { count: consultasNuevas },
    { count: consultasRespondidas },
  ] = await Promise.all([
    supabaseAdmin.from('usuarios').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('usuarios').select('*', { count: 'exact', head: true }).eq('estado', true),
    supabaseAdmin.from('consultas').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('consultas').select('*', { count: 'exact', head: true }).eq('estado', 'nueva'),
    supabaseAdmin.from('consultas').select('*', { count: 'exact', head: true }).eq('estado', 'respondida'),
  ])

  return NextResponse.json({
    totalAbogados: totalAbogados ?? 0,
    abogadosActivos: abogadosActivos ?? 0,
    totalConsultas: totalConsultas ?? 0,
    consultasNuevas: consultasNuevas ?? 0,
    consultasRespondidas: consultasRespondidas ?? 0,
  })
}
