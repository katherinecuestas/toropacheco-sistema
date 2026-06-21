import { NextResponse } from 'next/server'

// Ruta deshabilitada — fue de uso único para crear el supervisor inicial.
// Si necesitas crear otro supervisor, usa /api/admin/abogados con is_admin:true
// o directamente desde el panel de Supabase.
export async function POST() {
  return NextResponse.json({ error: 'Ruta deshabilitada' }, { status: 410 })
}
