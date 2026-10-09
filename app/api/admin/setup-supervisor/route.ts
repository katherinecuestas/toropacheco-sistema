import { NextResponse } from 'next/server'

// Ruta deshabilitada — fue de uso único para crear el supervisor inicial.
// Un supervisor es una fila de `usuarios` con rol = 'supervisor' (no es un admin).
// Hoy solo se puede crear directamente desde el panel de Supabase.
export async function POST() {
  return NextResponse.json({ error: 'Ruta deshabilitada' }, { status: 410 })
}
