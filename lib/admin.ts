import { supabase } from './supabase'

export interface Abogado {
  id: number
  created_at: string
  auth_user_id: string
  email: string
  nombre_negocio: string
  telefono?: string
  estado: boolean
  is_admin: boolean
}

export async function verificarAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('admins')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  return !!data
}

export async function obtenerTodosAbogados() {
  const { data, error } = await supabase
    .from('abogados')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return { abogados: null, error: error.message }
  return { abogados: data as Abogado[], error: null }
}

export async function toggleEstadoAbogado(id: number, estadoActual: boolean) {
  const { error } = await supabase
    .from('abogados')
    .update({ estado: !estadoActual })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function crearAbogado(datos: {
  email: string
  password: string
  nombre_negocio: string
  telefono?: string
  is_admin?: boolean
}) {
  const res = await fetch('/api/admin/abogados', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  })
  return res.json()
}

export async function editarAbogado(datos: {
  id: number
  auth_user_id: string
  email: string
  nombre_negocio: string
  telefono?: string
  is_admin: boolean
  estado: boolean
}) {
  const res = await fetch('/api/admin/abogados', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  })
  return res.json()
}

export async function eliminarAbogado(id: number, auth_user_id: string) {
  const res = await fetch('/api/admin/abogados', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, auth_user_id }),
  })
  return res.json()
}

export async function crearConsulta(datos: {
  abogado_id: number
  nombre_cliente: string
  email_cliente: string
  telefono_cliente?: string
  asunto: string
  mensaje: string
  estado?: string
}) {
  const res = await fetch('/api/admin/consultas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  })
  return res.json()
}

export async function editarConsulta(datos: {
  id: number
  nombre_cliente: string
  email_cliente: string
  telefono_cliente?: string
  asunto: string
  mensaje: string
  estado: string
  respuesta?: string
}) {
  const res = await fetch('/api/admin/consultas', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  })
  return res.json()
}

export async function eliminarConsulta(id: number) {
  const res = await fetch('/api/admin/consultas', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  return res.json()
}

export async function obtenerTodasConsultas() {
  const { data, error } = await supabase
    .from('consultas')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return { consultas: null, error: error.message }
  return { consultas: data, error: null }
}

// --- CLIENTES ---
export async function obtenerTodosClientes() {
  const res = await fetch('/api/admin/clientes')
  return res.json()
}

export async function eliminarCliente(id: number, auth_user_id: string) {
  const res = await fetch('/api/admin/clientes', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, auth_user_id }),
  })
  return res.json()
}

// --- CONTRATOS ---
export async function obtenerContratosCliente(clienteId: number) {
  const res = await fetch(`/api/admin/contratos?cliente_id=${clienteId}`)
  return res.json()
}

export async function crearContrato(datos: {
  cliente_id: number
  abogado_id: number
  tipo_servicio: string
  descripcion?: string
  fecha_inicio: string
  monto_total: number
  monto_pie: number
  saldo: number
}) {
  const res = await fetch('/api/admin/contratos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  })
  return res.json()
}

export async function editarContrato(datos: {
  id: number
  tipo_servicio: string
  descripcion?: string
  estado: string
  monto_total: number
  monto_pie: number
  saldo: number
}) {
  const res = await fetch('/api/admin/contratos', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  })
  return res.json()
}

export async function eliminarContrato(id: number) {
  const res = await fetch('/api/admin/contratos', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  return res.json()
}

// --- CUOTAS ---
export async function obtenerCuotasContrato(contratoId: number) {
  const res = await fetch(`/api/admin/cuotas?contrato_id=${contratoId}`)
  return res.json()
}

export async function crearCuota(datos: { contrato_id: number; numero: number; monto: number; fecha_vencimiento: string }) {
  const res = await fetch('/api/admin/cuotas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  })
  return res.json()
}

export async function editarCuota(datos: { id: number; monto: number; fecha_vencimiento: string; fecha_pago?: string; estado: string }) {
  const res = await fetch('/api/admin/cuotas', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  })
  return res.json()
}

export async function eliminarCuota(id: number) {
  const res = await fetch('/api/admin/cuotas', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  return res.json()
}

// --- TIMELINE ---
export async function obtenerTimelineContrato(contratoId: number) {
  const res = await fetch(`/api/admin/timeline?contrato_id=${contratoId}`)
  return res.json()
}

export async function crearEvento(datos: { contrato_id: number; titulo: string; descripcion?: string; fecha: string; completado?: boolean }) {
  const res = await fetch('/api/admin/timeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  })
  return res.json()
}

export async function editarEvento(datos: { id: number; titulo: string; descripcion?: string; fecha: string; completado: boolean }) {
  const res = await fetch('/api/admin/timeline', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  })
  return res.json()
}

export async function eliminarEvento(id: number) {
  const res = await fetch('/api/admin/timeline', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  return res.json()
}

export async function obtenerEstadisticas() {
  const [
    { count: totalAbogados },
    { count: abogadosActivos },
    { count: totalConsultas },
    { count: consultasNuevas },
    { count: consultasRespondidas },
  ] = await Promise.all([
    supabase.from('abogados').select('*', { count: 'exact', head: true }),
    supabase.from('abogados').select('*', { count: 'exact', head: true }).eq('estado', true),
    supabase.from('consultas').select('*', { count: 'exact', head: true }),
    supabase.from('consultas').select('*', { count: 'exact', head: true }).eq('estado', 'nueva'),
    supabase.from('consultas').select('*', { count: 'exact', head: true }).eq('estado', 'respondida'),
  ])

  return {
    totalAbogados: totalAbogados ?? 0,
    abogadosActivos: abogadosActivos ?? 0,
    totalConsultas: totalConsultas ?? 0,
    consultasNuevas: consultasNuevas ?? 0,
    consultasRespondidas: consultasRespondidas ?? 0,
  }
}
