import { supabase } from './supabase'

/**
 * Tipo de datos para una consulta
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
 * Enviar consulta gratuita (público, sin autenticación)
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
 * Obtener consultas del abogado autenticado
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
 * Responder una consulta
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
 * Rechazar una consulta
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