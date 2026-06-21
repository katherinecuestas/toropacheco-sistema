import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { TRIBUNALES } from '@/lib/tribunales'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateTempPassword } from '@/lib/helpers'

const resend = new Resend(process.env.RESEND_API_KEY)

function findCorte(juzgado: string | null | undefined): string {
  if (!juzgado) return '—'
  return TRIBUNALES.find(g => g.tribunales.includes(juzgado))?.corte ?? juzgado
}

async function getAbogadoId(request: Request): Promise<number | null> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return null
  const { data } = await supabaseAdmin
    .from('usuarios')
    .select('id, rol')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!data || data.rol === 'supervisor') return null
  return data.id
}

export async function GET(request: NextRequest) {
  try {
    const abogadoId = await getAbogadoId(request)
    if (!abogadoId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('prospectos')
      .select('*, tipificaciones(id)')
      .in('estado', ['interesado', 'agendado', 'cotizacion_enviada', 'acepto_cotizacion', 'venta'])
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ prospectos: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

const formatFecha = (f: string | null | undefined) => f ? f.slice(0, 10) : null

export async function POST(request: NextRequest) {
  try {
    const abogadoId = await getAbogadoId(request)
    if (!abogadoId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { nombre, rut, telefono, email, requerimiento, fecha_requerimiento,
            juzgado, monto_deuda, estado, observacion, fecha_llamar, plazo_fatal } = body

    const { data, error } = await supabaseAdmin
      .from('prospectos')
      .insert({
        creado_por: abogadoId,
        nombre: nombre || null,
        rut: rut || null,
        telefono: telefono || null,
        email: email || null,
        requerimiento: requerimiento || null,
        fecha_requerimiento: formatFecha(fecha_requerimiento),
        juzgado: juzgado || null,
        monto_deuda: monto_deuda ? Number(monto_deuda) : null,
        estado: estado || 'sin_contacto',
        observacion: observacion || null,
        fecha_llamar: formatFecha(fecha_llamar),
        plazo_fatal: formatFecha(plazo_fatal),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const { data: u } = await supabaseAdmin
      .from('usuarios').select('nombres, nombre_negocio').eq('id', abogadoId).maybeSingle()
    const nombreU = u?.nombres?.split(' ')[0] ?? u?.nombre_negocio?.split(' ')[0] ?? 'Abogado'

    await supabaseAdmin.from('prospecto_timeline').insert({
      prospecto_id: data.id,
      usuario_id: abogadoId,
      evento: 'creado',
      descripcion: `Prospecto creado por ${nombreU}`,
    })

    return NextResponse.json({ success: true, prospecto: data })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const abogadoId = await getAbogadoId(request)
    if (!abogadoId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { id, estado } = body

    // Cambio de estado explícito
    if (estado) {
      const { error } = await supabaseAdmin
        .from('prospectos')
        .update({ estado })
        .eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })

      // Evento timeline para cualquier cambio de estado
      const { data: u } = await supabaseAdmin
        .from('usuarios').select('nombres, nombre_negocio').eq('id', abogadoId).maybeSingle()
      const nombreU = u?.nombres?.split(' ')[0] ?? u?.nombre_negocio?.split(' ')[0] ?? 'Branco'
      const LABEL: Record<string, string> = {
        cotizacion_enviada: 'Cotización enviada', acepto_cotizacion: 'Aceptó cotización', venta: 'Venta ✅',
        interesado: 'Interesado', agendado: 'Agendado',
      }
      await supabaseAdmin.from('prospecto_timeline').insert({
        prospecto_id: id, usuario_id: abogadoId,
        evento: 'estado_cambiado',
        descripcion: `${nombreU} cambió estado a "${LABEL[estado] ?? estado}"`,
      })

      // Flujo especial: conversión a cliente cuando estado === 'venta'
      if (estado === 'venta') {
        const { data: p } = await supabaseAdmin
          .from('prospectos').select('*').eq('id', id).maybeSingle()
        if (!p) return NextResponse.json({ success: true })

        const now = new Date()
        const corte = findCorte(p.juzgado)

        // Insertar en ventas
        await supabaseAdmin.from('ventas').insert({
          prospecto_id: id,
          supervisor_id: p.creado_por,
          abogado_id: abogadoId,
          region: corte,
          tribunal: p.juzgado,
          monto_deuda: p.monto_deuda,
          mes: now.getMonth() + 1,
          anio: now.getFullYear(),
        })

        // Crear usuario en Supabase Auth (solo si tiene email)
        if (p.email) {
          const tempPassword = generateTempPassword()
          const { data: authData } = await supabaseAdmin.auth.admin.createUser({
            email: p.email, password: tempPassword, email_confirm: true,
          })
          if (authData?.user) {
            await supabaseAdmin.from('clientes').insert({
              nombre: p.nombre, email: p.email,
              telefono: p.telefono ?? null, rut: p.rut ?? null,
              auth_user_id: authData.user.id,
            })
          }

          // Email de bienvenida con contraseña temporal única
          await resend.emails.send({
            from: 'Toro Pacheco & Asociados <notificaciones@toropachecoasociados.cl>',
            to: p.email,
            subject: 'Bienvenido a Toro Pacheco & Asociados',
            text: [
              `Estimado/a ${p.nombre},`,
              '',
              'Nos complace informarte que tu caso ha sido asignado a nuestro equipo.',
              'Ya puedes acceder a tu portal de cliente en:',
              '',
              '  https://toropachecoasociados.cl/mi-cuenta',
              '',
              `  Email: ${p.email}`,
              `  Contraseña temporal: ${tempPassword}`,
              '',
              'Te recomendamos cambiar tu contraseña al ingresar por primera vez.',
              '',
              'Toro Pacheco & Asociados',
            ].join('\n'),
          })
        }

        // Notificar a Vladimir
        await supabaseAdmin.from('notificaciones').insert({
          usuario_id: p.creado_por,
          tipo: 'venta',
          titulo: `¡Venta! ${p.nombre}`,
          mensaje: `${p.nombre} fue convertido a cliente. Tribunal: ${p.juzgado ?? '—'}`,
          leida: false,
        })
      }

      return NextResponse.json({ success: true })
    }

    // Comportamiento original: marcar revisado
    const { error } = await supabaseAdmin
      .from('prospectos')
      .update({ revisado: true })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
