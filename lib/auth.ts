import { supabase } from './supabase'

/**
 * Registrar nuevo usuario y crear perfil de abogado
 */
export async function registrarAbogado(
  email: string,
  password: string,
  nombreNegocio: string,
  telefono?: string
) {
  try {
    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      return { success: false, error: authError.message }
    }

    if (!authData.user) {
      return { success: false, error: 'No se pudo crear el usuario' }
    }

    // 2. Crear registro en tabla abogados
    const { error: profileError } = await supabase
      .from('abogados')
      .insert([
        {
          auth_user_id: authData.user.id,
          email: email,
          nombre_negocio: nombreNegocio,
          telefono: telefono || null,
          estado: true,
        },
      ])

    if (profileError) {
      return { success: false, error: profileError.message }
    }

    return { 
      success: true, 
      message: 'Cuenta creada exitosamente. Revisa tu email para confirmar.' 
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * Iniciar sesión
 */
export async function iniciarSesion(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, user: data.user }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * Cerrar sesión
 */
export async function cerrarSesion() {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * Obtener sesión actual
 */
export async function obtenerSesion() {
  try {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      return { session: null, error: error.message }
    }

    return { session: data.session, error: null }
  } catch (error) {
    return { 
      session: null, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * Obtener datos del abogado actual
 */
export async function obtenerDatosAbogado() {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { abogado: null, error: 'No hay sesión activa' }
    }

    const { data, error } = await supabase
      .from('abogados')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (error) {
      return { abogado: null, error: error.message }
    }

    return { abogado: data, error: null }
  } catch (error) {
    return { 
      abogado: null, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}