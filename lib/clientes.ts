import { supabase } from './supabase'

/** Registro de la tabla `clientes` */
export interface Cliente {
  id: number
  auth_user_id: string
  nombre: string
  email: string
  telefono?: string
  rut?: string
  created_at: string
}

/** Contrato de servicios legales entre un cliente y un abogado */
export interface Contrato {
  id: number
  cliente_id: number
  abogado_id: number
  tipo_servicio: string
  descripcion?: string
  estado: 'activo' | 'completado' | 'cancelado'
  fecha_inicio: string
  monto_total: number
  monto_pie: number
  saldo: number
  created_at: string
}

/** Cuota de pago asociada a un contrato */
export interface Cuota {
  id: number
  contrato_id: number
  numero: number
  monto: number
  fecha_vencimiento: string
  fecha_pago?: string
  estado: 'pendiente' | 'pagada' | 'vencida'
}

/** Evento del historial de un caso (timeline) */
export interface TimelineEvento {
  id: number
  contrato_id: number
  titulo: string
  descripcion?: string
  fecha: string
  completado: boolean
}

/**
 * Obtiene el registro del cliente autenticado en la sesión actual.
 * Usa el `auth_user_id` del token para encontrar al cliente en la tabla.
 */
export async function obtenerDatosCliente(): Promise<{ cliente: Cliente | null }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { cliente: null }
  const { data } = await supabase.from('clientes').select('*').eq('auth_user_id', user.id).single()
  return { cliente: data as Cliente | null }
}

/**
 * Lista todos los contratos de un cliente ordenados por fecha de creación descendente.
 * @param clienteId - ID numérico del cliente en la tabla `clientes`
 */
export async function obtenerMisContratos(clienteId: number): Promise<{ contratos: Contrato[] }> {
  const { data } = await supabase
    .from('contratos')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })
  return { contratos: (data || []) as Contrato[] }
}

/**
 * Lista las cuotas de un contrato ordenadas por número de cuota.
 * @param contratoId - ID del contrato
 */
export async function obtenerCuotasContrato(contratoId: number): Promise<{ cuotas: Cuota[] }> {
  const { data } = await supabase
    .from('cuotas')
    .select('*')
    .eq('contrato_id', contratoId)
    .order('numero')
  return { cuotas: (data || []) as Cuota[] }
}

/**
 * Lista los eventos del timeline de un caso ordenados cronológicamente.
 * @param contratoId - ID del contrato asociado al caso
 */
export async function obtenerTimelineContrato(contratoId: number): Promise<{ eventos: TimelineEvento[] }> {
  const { data } = await supabase
    .from('timeline_eventos')
    .select('*')
    .eq('contrato_id', contratoId)
    .order('fecha')
  return { eventos: (data || []) as TimelineEvento[] }
}
