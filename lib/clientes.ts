import { supabase } from './supabase'

export interface Cliente {
  id: number
  auth_user_id: string
  nombre: string
  email: string
  telefono?: string
  rut?: string
  created_at: string
}

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

export interface Cuota {
  id: number
  contrato_id: number
  numero: number
  monto: number
  fecha_vencimiento: string
  fecha_pago?: string
  estado: 'pendiente' | 'pagada' | 'vencida'
}

export interface TimelineEvento {
  id: number
  contrato_id: number
  titulo: string
  descripcion?: string
  fecha: string
  completado: boolean
}

export async function obtenerDatosCliente() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { cliente: null }
  const { data } = await supabase.from('clientes').select('*').eq('auth_user_id', user.id).single()
  return { cliente: data as Cliente | null }
}

export async function obtenerMisContratos(clienteId: number) {
  const { data } = await supabase
    .from('contratos')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })
  return { contratos: (data || []) as Contrato[] }
}

export async function obtenerCuotasContrato(contratoId: number) {
  const { data } = await supabase
    .from('cuotas')
    .select('*')
    .eq('contrato_id', contratoId)
    .order('numero')
  return { cuotas: (data || []) as Cuota[] }
}

export async function obtenerTimelineContrato(contratoId: number) {
  const { data } = await supabase
    .from('timeline_eventos')
    .select('*')
    .eq('contrato_id', contratoId)
    .order('fecha')
  return { eventos: (data || []) as TimelineEvento[] }
}
