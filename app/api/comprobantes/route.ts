import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TIPOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const TAMANO_MAXIMO = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  // 1. Validar que el usuario esté autenticado
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Sesión inválida' }, { status: 401 })
  }

  // 2. Leer el archivo del formulario
  const formData = await request.formData()
  const archivo = formData.get('archivo') as File | null
  const cuotaId = formData.get('cuota_id') as string | null

  if (!archivo || !cuotaId) {
    return NextResponse.json({ success: false, error: 'Faltan datos requeridos' }, { status: 400 })
  }

  // 3. Validar tipo de archivo
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    return NextResponse.json(
      { success: false, error: 'Tipo de archivo no permitido. Solo PDF, JPG, PNG o WEBP.' },
      { status: 400 }
    )
  }

  // 4. Validar tamaño
  if (archivo.size > TAMANO_MAXIMO) {
    return NextResponse.json(
      { success: false, error: 'El archivo supera el límite de 5MB.' },
      { status: 400 }
    )
  }

  // 5. Upload desde el servidor con service_role key
  const ext = archivo.name.split('.').pop()
  const path = `cuota-${cuotaId}-${Date.now()}.${ext}`
  const buffer = Buffer.from(await archivo.arrayBuffer())

  const { error: uploadError } = await supabaseAdmin.storage
    .from('comprobantes')
    .upload(path, buffer, { contentType: archivo.type, upsert: true })

  if (uploadError) {
    return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage.from('comprobantes').getPublicUrl(path)

  return NextResponse.json({ success: true, url: urlData.publicUrl })
}
