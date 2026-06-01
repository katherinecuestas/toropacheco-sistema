'use client'

import { useState, useEffect } from 'react'

const azul = '#1F3A5F'
const dorado = '#C7B88A'

export const TIPO_LABEL: Record<string, string> = {
  venta:                 '💰 Venta',
  contesto_interesado:   '✅ Contestó — Interesado',
  contesto_agendado:     '📅 Contestó — Agendado',
  contesto_lo_va_pensar: '🤔 Contestó — Lo va a pensar',
  contesto_no_interesa:  '❌ Contestó — No le interesa',
  no_contesto:           '📵 No contestó',
  wsp_enviado:           '💬 WhatsApp enviado',
  ya_tiene_abogado:      '⚖️ Ya tiene abogado',
  otro:                  '📝 Otro',
}

const TIMELINE_ICONO: Record<string, string> = {
  creado:      '🆕',
  tipificacion:'📋',
  default:     '🔵',
}

function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso.slice(0, 10) + 'T12:00:00')
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

function tiempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Ahora'
  if (min < 60) return `Hace ${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `Hace ${h}h`
  return `Hace ${Math.floor(h / 24)}d`
}

const ESTADO_OPTIONS = [
  { value: 'interesado',         label: 'Interesado' },
  { value: 'agendado',           label: 'Agendado' },
  { value: 'cotizacion_enviada', label: 'Cotización enviada' },
  { value: 'acepto_cotizacion',  label: 'Aceptó cotización' },
  { value: 'venta',              label: 'Venta ✅' },
]

interface Props {
  prospecto: any
  token: string
  onClose: () => void
  onTipificacionCreada?: () => void
  onEstadoCambiado?: () => void
}

export function ProspectoModal({ prospecto: p, token, onClose, onTipificacionCreada, onEstadoCambiado }: Props) {
  const [tipificaciones, setTipificaciones] = useState<any[]>([])
  const [timeline, setTimeline] = useState<any[]>([])
  const [tipo, setTipo] = useState('')
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'datos' | 'timeline'>('datos')
  const [estadoActual, setEstadoActual] = useState(p.estado)
  const [nuevoEstado, setNuevoEstado] = useState(p.estado)
  const [cambiandoEstado, setCambiandoEstado] = useState(false)
  const [mensajeEstado, setMensajeEstado] = useState('')
  const [confirmarVenta, setConfirmarVenta] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [p.id])

  async function cargarDatos() {
    const [tipRes, tlRes] = await Promise.all([
      fetch(`/api/tipificaciones?prospecto_id=${p.id}`, { headers: { authorization: `Bearer ${token}` } }),
      fetch(`/api/prospecto-timeline?prospecto_id=${p.id}`, { headers: { authorization: `Bearer ${token}` } }),
    ])
    const tipData = await tipRes.json()
    const tlData  = await tlRes.json()
    if (tipData.tipificaciones) setTipificaciones(tipData.tipificaciones)
    if (tlData.timeline) setTimeline(tlData.timeline)
  }

  async function handleTipificar(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!tipo) return
    setGuardando(true)
    setError('')
    const res = await fetch('/api/tipificaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ prospecto_id: p.id, tipo, nota: tipo === 'otro' ? nota : '' }),
    })
    const data = await res.json()
    if (data.success) {
      setTipo('')
      setNota('')
      await cargarDatos()
      onTipificacionCreada?.()
    } else {
      setError(data.error || 'Error al guardar.')
    }
    setGuardando(false)
  }

  async function handleCambiarEstado() {
    if (nuevoEstado === estadoActual) return
    if (nuevoEstado === 'venta' && !confirmarVenta) { setConfirmarVenta(true); return }
    setCambiandoEstado(true)
    setMensajeEstado('')
    const res = await fetch('/api/prospectos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: p.id, estado: nuevoEstado }),
    })
    const data = await res.json()
    if (data.success) {
      setEstadoActual(nuevoEstado)
      setConfirmarVenta(false)
      setMensajeEstado(nuevoEstado === 'venta' ? '✅ ¡Venta registrada! Cliente creado y notificado.' : 'Estado actualizado.')
      await cargarDatos()
      onEstadoCambiado?.()
      setTimeout(() => setMensajeEstado(''), 5000)
    } else {
      setMensajeEstado('Error: ' + (data.error ?? 'No se pudo actualizar.'))
    }
    setCambiandoEstado(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#EDE8DC', backgroundColor: azul }}>
          <div>
            <p className="text-xs font-bold tracking-widest" style={{ color: dorado }}>PROSPECTO</p>
            <h2 className="text-lg font-bold text-white">{p.nombre}</h2>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-2xl leading-none">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: '#EDE8DC' }}>
          {(['datos', 'timeline'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === t ? 'border-b-2 text-white' : 'text-gray-500 hover:text-gray-700'}`}
              style={tab === t ? { borderColor: dorado, backgroundColor: azul + '11', color: azul } : {}}>
              {t === 'datos' ? '📋 Datos y tipificación' : '📅 Timeline'}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto max-h-[70vh]">

          {/* TAB: DATOS + TIPIFICACIÓN */}
          {tab === 'datos' && (
            <div className="p-6 space-y-6">

              {/* Datos del prospecto */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                {[
                  { label: 'RUT',       value: p.rut },
                  { label: 'Teléfono',  value: p.telefono },
                  { label: 'Email',     value: p.email },
                  { label: 'ROL',       value: p.requerimiento },
                  { label: 'Tribunal',  value: p.juzgado },
                  { label: 'Deuda',     value: p.monto_deuda ? '$' + Number(p.monto_deuda).toLocaleString('es-CL') : null },
                  { label: 'Plazo',     value: fmtFecha(p.plazo_fatal) },
                  { label: 'Llamar',    value: fmtFecha(p.fecha_llamar) },
                  { label: 'Estado',    value: p.estado },
                ].map(({ label, value }) => value ? (
                  <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <p className="font-medium text-gray-800 text-sm">{value}</p>
                  </div>
                ) : null)}
                {p.observacion && (
                  <div className="col-span-2 sm:col-span-3 bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400 mb-0.5">Observación</p>
                    <p className="text-sm text-gray-700">{p.observacion}</p>
                  </div>
                )}
              </div>

              {/* Cambiar estado */}
              <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: '#C7D2FE', backgroundColor: '#EEF2FF' }}>
                <p className="text-xs font-bold tracking-wide" style={{ color: azul }}>CAMBIAR ESTADO</p>
                {mensajeEstado && (
                  <p className={`text-xs font-medium px-3 py-2 rounded-lg ${mensajeEstado.startsWith('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                    {mensajeEstado}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 items-center">
                  <select
                    value={nuevoEstado}
                    onChange={e => { setNuevoEstado(e.target.value); setConfirmarVenta(false) }}
                    className="flex-1 min-w-[180px] border border-indigo-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  >
                    {ESTADO_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleCambiarEstado}
                    disabled={cambiandoEstado || nuevoEstado === estadoActual}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40 text-white transition-colors"
                    style={{ backgroundColor: nuevoEstado === 'venta' ? '#059669' : azul }}>
                    {cambiandoEstado ? '...' : confirmarVenta ? '¿Confirmar venta?' : 'Actualizar'}
                  </button>
                  {confirmarVenta && (
                    <button onClick={() => setConfirmarVenta(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                      Cancelar
                    </button>
                  )}
                </div>
                {confirmarVenta && (
                  <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                    ⚠️ Esto creará un cliente en el sistema y enviará email de bienvenida. ¿Confirmar?
                  </p>
                )}
              </div>

              {/* Formulario tipificación */}
              <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: '#EDE8DC', backgroundColor: '#FDFBF5' }}>
                <p className="text-xs font-bold tracking-wide" style={{ color: azul }}>+ NUEVA TIPIFICACIÓN</p>
                {error && <p className="text-xs text-red-600">{error}</p>}
                <form onSubmit={handleTipificar} className="space-y-3">
                  <select
                    required value={tipo}
                    onChange={e => { setTipo(e.target.value); setNota('') }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    style={{ color: tipo ? '#1F2937' : '#9CA3AF' }}
                  >
                    <option value="">— Selecciona tipo —</option>
                    {Object.entries(TIPO_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  {tipo === 'otro' && (
                    <input
                      type="text" maxLength={20}
                      value={nota}
                      onChange={e => setNota(e.target.value)}
                      placeholder="Nota (máx 20 caracteres)"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  )}
                  <button type="submit" disabled={guardando || !tipo}
                    className="px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-50 text-white transition-colors"
                    style={{ backgroundColor: azul }}>
                    {guardando ? 'Guardando...' : 'Registrar tipificación'}
                  </button>
                </form>
              </div>

              {/* Tipificaciones anteriores */}
              {tipificaciones.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold tracking-wide text-gray-400">HISTORIAL DE TIPIFICACIONES</p>
                  {tipificaciones.map(t => {
                    const u = t.usuarios
                    const nombreU = u?.nombres?.split(' ')[0] ?? u?.nombre_negocio?.split(' ')[0] ?? 'Usuario'
                    return (
                      <div key={t.id} className="flex items-start gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
                        <span className="text-base flex-shrink-0">{t.tipo === 'otro' ? '📝' : '📋'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">{TIPO_LABEL[t.tipo] ?? t.tipo}</p>
                          {t.nota && <p className="text-xs text-gray-500 italic">"{t.nota}"</p>}
                          <p className="text-xs text-gray-400 mt-0.5">{nombreU} · {tiempoRelativo(t.created_at)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: TIMELINE */}
          {tab === 'timeline' && (
            <div className="p-6">
              {timeline.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sin eventos en el timeline.</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
                  <div className="space-y-4">
                    {timeline.map((ev, i) => {
                      const u = ev.usuarios
                      const icono = TIMELINE_ICONO[ev.evento] ?? TIMELINE_ICONO.default
                      return (
                        <div key={ev.id} className="flex gap-4 relative">
                          <span className="text-lg flex-shrink-0 z-10 bg-white w-8 text-center">{icono}</span>
                          <div className="flex-1 min-w-0 pb-4">
                            <p className="text-sm text-gray-800">{ev.descripcion}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(ev.created_at).toLocaleString('es-CL', {
                                day: 'numeric', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
