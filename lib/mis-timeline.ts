import { authHeaders } from './auth-headers'

// Timeline del caso desde el panel del abogado (/dashboard), vía /api/mis-timeline.
// El panel admin usa las funciones equivalentes de lib/admin.ts (/api/admin/timeline).

/** Eventos del timeline de un contrato del abogado autenticado. */
export async function obtenerTimelineContrato(contratoId: number) {
  const res = await fetch(`/api/mis-timeline?contrato_id=${contratoId}`, { headers: await authHeaders() })
  return res.json()
}

/** Crea un evento en el timeline de un contrato del abogado autenticado. */
export async function crearEvento(datos: { contrato_id: number; titulo: string; descripcion?: string; fecha: string; completado?: boolean }) {
  const res = await fetch('/api/mis-timeline', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(datos),
  })
  return res.json()
}

/** Edita un evento del timeline (no permite cambiarlo de contrato). */
export async function editarEvento(datos: { id: number; titulo: string; descripcion?: string; fecha: string; completado: boolean }) {
  const res = await fetch('/api/mis-timeline', {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify(datos),
  })
  return res.json()
}

/** Elimina un evento del timeline. */
export async function eliminarEvento(id: number) {
  const res = await fetch('/api/mis-timeline', {
    method: 'DELETE',
    headers: await authHeaders(),
    body: JSON.stringify({ id }),
  })
  return res.json()
}
