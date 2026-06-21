import { supabase } from './supabase'

/**
 * Consulta gratuita enviada por un cliente potencial a un abogado.
 * El campo `token` (no incluido aquí) se usa para el enlace de confirmación por correo.
 */
export interface Consulta {
  id: number
  created_at: string
  abogado_id: number
  nombre_cliente: string
  email_cliente: string
  telefono_cliente?: string
  asunto: string
  mensaje: string
  estado: 'nueva' | 'respondida' | 'rechazada'
  respondida_en?: string
  respuesta?: string
  respondida_por?: number
}

/**
 * Envía una consulta gratuita a un abogado (ruta pública, sin autenticación).
 * Genera un token UUID único, inserta la consulta con estado `nueva`
 * y dispara el correo de confirmación vía `/api/confirmar-consulta`.
 *
 * @param abogadoId - ID del abogado destinatario
 * @param nombreCliente - Nombre completo del consultante
 * @param emailCliente - Email al que llegará la confirmación
 * @param asunto - Tema breve de la consulta
 * @param mensaje - Descripción detallada del caso
 * @param telefonoCliente - Teléfono opcional de contacto
 */
export async function enviarConsulta(
  abogadoId: number,
  nombreCliente: string,
  emailCliente: string,
  asunto: string,
  mensaje: string,
  telefonoCliente?: string
) {
  try {
    const token = crypto.randomUUID()

    const { error } = await supabase
      .from('consultas')
      .insert([
        {
          abogado_id: abogadoId,
          nombre_cliente: nombreCliente,
          email_cliente: emailCliente,
          telefono_cliente: telefonoCliente || null,
          asunto: asunto,
          mensaje: mensaje,
          estado: 'nueva',
          token,
        }
      ])

    if (error) {
      return { success: false, error: error.message }
    }

    await fetch('/api/confirmar-consulta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailCliente, nombreCliente, asunto, mensaje, telefonoCliente, token })
    })

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * Lista todas las consultas recibidas por el abogado autenticado, ordenadas por fecha descendente.
 * Resuelve el `auth_user_id` del token de sesión para filtrar por abogado sin confiar en el cliente.
 */
export async function obtenerMisConsultas() {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { consultas: null, error: 'No hay sesión activa' }
    }

    const { data: abogado, error: abogadoError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (abogadoError || !abogado) {
      return { consultas: null, error: 'No se encontró el perfil del abogado' }
    }

    const { data, error } = await supabase
      .from('consultas')
      .select('*')
      .eq('abogado_id', abogado.id)
      .order('created_at', { ascending: false })

    if (error) {
      return { consultas: null, error: error.message }
    }

    return { consultas: data as Consulta[], error: null }
  } catch (error) {
    return {
      consultas: null,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * Envía la respuesta del abogado a una consulta, delegando a `/api/responder-consulta`.
 * El endpoint extrae el `abogadoId` real del token, por lo que el parámetro aquí
 * es ignorado en servidor — se incluye por compatibilidad con formularios existentes.
 *
 * @param consultaId - ID de la consulta a responder
 * @param respuesta - Texto de la respuesta
 * @param abogadoId - ID del abogado (redundante; el server lo extrae del JWT)
 */
export async function responderConsulta(
  consultaId: number,
  respuesta: string,
  abogadoId: number
) {
  try {
    const res = await fetch('/api/responder-consulta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consultaId, respuesta, abogadoId }),
    })
    return res.json()
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * Marca una consulta como `rechazada` directamente en la base de datos.
 * A diferencia de `responderConsulta`, no pasa por una ruta API — usa el cliente de sesión.
 *
 * @param consultaId - ID de la consulta a rechazar
 */
export async function rechazarConsulta(consultaId: number) {
  try {
    const { data, error } = await supabase
      .from('consultas')
      .update({
        estado: 'rechazada'
      })
      .eq('id', consultaId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, consulta: data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}