import { supabase } from './supabase'
import { authHeaders } from './auth-headers'

export interface Usuario {
  id: number
  created_at: string
  auth_user_id: string
  email: string
  nombres?: string
  apellido_paterno?: string
  apellido_materno?: string
  rut?: string
  dv?: string
  nombre_usuario?: string
  nombre?: string
  nombre_negocio: string
  telefono?: string
  estado: boolean
  es_admin: boolean
  rol?: string
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
  const res = await fetch('/api/admin/abogados', { headers: await authHeaders() })
  return res.json()
}

export async function toggleEstadoAbogado(id: number, estadoActual: boolean) {
  const { error } = await supabase
    .from('usuarios')
    .update({ estado: !estadoActual })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function crearAbogado(datos: {
  email: string
  password: string
  nombres: string
  apellido_paterno: string
  apellido_materno: string
  rut?: string
  dv?: string
  nombre_usuario: string
  telefono?: string
  es_admin?: boolean
}) {
  const res = await fetch('/api/admin/abogados', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(datos),
  })
  return res.json()
}

export async function editarAbogado(datos: {
  id: number
  auth_user_id: string
  email: string
  nombres: string
  apellido_paterno: string
  apellido_materno: string
  rut?: string
  dv?: string
  nombre_usuario: string
  telefono?: string
  es_admin: boolean
  estado: boolean
}) {
  const res = await fetch('/api/admin/abogados', {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify(datos),
  })
  return res.json()
}

export async function toggleEstadoAbogadoAdmin(id: number, auth_user_id: string, estado: boolean) {
  const res = await fetch('/api/admin/abogados', {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify({ id, auth_user_id, action: 'toggle-estado', estado }),
  })
  return res.json()
}

export async function cambiarPasswordAbogado(auth_user_id: string, password: string) {
  const res = await fetch('/api/admin/abogados', {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify({ auth_user_id, action: 'cambiar-password', password }),
  })
  return res.json()
}

export async function eliminarAbogado(id: number, auth_user_id: string) {
  const res = await fetch('/api/admin/abogados', {
    method: 'DELETE',
    headers: await authHeaders(),
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
    headers: await authHeaders(),
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
    headers: await authHeaders(),
    body: JSON.stringify(datos),
  })
  return res.json()
}

export async function eliminarConsulta(id: number) {
  const res = await fetch('/api/admin/consultas', {
    method: 'DELETE',
    headers: await authHeaders(),
    body: JSON.stringify({ id }),
  })
  return res.json()
}

export async function obtenerTodasConsultas() {
  const res = await fetch('/api/admin/consultas', { headers: await authHeaders() })
  return res.json()
}

// --- CLIENTES ---
export async function obtenerTodosClientes() {
  const res = await fetch('/api/admin/clientes', { headers: await authHeaders() })
  return res.json()
}

export async function eliminarCliente(id: number, auth_user_id: string) {
  const res = await fetch('/api/admin/clientes', {
    method: 'DELETE',
    headers: await authHeaders(),
    body: JSON.stringify({ id, auth_user_id }),
  })
  return res.json()
}

// --- CONTRATOS ---
export async function obtenerContratosCliente(clienteId: number) {
  const res = await fetch(`/api/admin/contratos?cliente_id=${clienteId}`, { headers: await authHeaders() })
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
    headers: await authHeaders(),
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
    headers: await authHeaders(),
    body: JSON.stringify(datos),
  })
  return res.json()
}

export async function eliminarContrato(id: number) {
  const res = await fetch('/api/admin/contratos', {
    method: 'DELETE',
    headers: await authHeaders(),
    body: JSON.stringify({ id }),
  })
  return res.json()
}

// --- CUOTAS ---
export async function obtenerCuotasContrato(contratoId: number) {
  const res = await fetch(`/api/admin/cuotas?contrato_id=${contratoId}`, { headers: await authHeaders() })
  return res.json()
}

export async function crearCuota(datos: { contrato_id: number; numero: number; monto: number; fecha_vencimiento: string }) {
  const res = await fetch('/api/admin/cuotas', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(datos),
  })
  return res.json()
}

export async function editarCuota(datos: { id: number; monto: number; fecha_vencimiento: string; fecha_pago?: string; estado: string }) {
  const res = await fetch('/api/admin/cuotas', {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify(datos),
  })
  return res.json()
}

export async function eliminarCuota(id: number) {
  const res = await fetch('/api/admin/cuotas', {
    method: 'DELETE',
    headers: await authHeaders(),
    body: JSON.stringify({ id }),
  })
  return res.json()
}

// --- TIMELINE ---
export async function obtenerTimelineContrato(contratoId: number) {
  const res = await fetch(`/api/admin/timeline?contrato_id=${contratoId}`, { headers: await authHeaders() })
  return res.json()
}

export async function crearEvento(datos: { contrato_id: number; titulo: string; descripcion?: string; fecha: string; completado?: boolean }) {
  const res = await fetch('/api/admin/timeline', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(datos),
  })
  return res.json()
}

export async function editarEvento(datos: { id: number; titulo: string; descripcion?: string; fecha: string; completado: boolean }) {
  const res = await fetch('/api/admin/timeline', {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify(datos),
  })
  return res.json()
}

export async function eliminarEvento(id: number) {
  const res = await fetch('/api/admin/timeline', {
    method: 'DELETE',
    headers: await authHeaders(),
    body: JSON.stringify({ id }),
  })
  return res.json()
}

export async function obtenerEstadisticas() {
  const res = await fetch('/api/admin/stats', { headers: await authHeaders() })
  return res.json()
}
