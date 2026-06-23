'use client'

import React, { useState } from 'react'
import { enviarConsulta } from '@/lib/consultas'
import { obtenerSlotsDisponibles } from '@/lib/citas'
import { azul, dorado, azulProfundo } from '@/lib/brand'

const ABOGADO_ID = 2

export default function FormularioConsulta() {
  const [tab, setTab] = useState<'texto' | 'video'>('texto')

  // ─── ESTADOS DEL FORMULARIO DE CONSULTA POR TEXTO ───────────────────────────
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', asunto: '', mensaje: '' })
  const [enviando, setEnviando] = useState(false)
  const [exito, setExito] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.nombre || !form.email || !form.asunto || !form.mensaje) {
      setError('Por favor completa todos los campos obligatorios.')
      return
    }
    setEnviando(true)
    setError('')
    const { success, error: err } = await enviarConsulta(
      ABOGADO_ID, form.nombre, form.email, form.asunto, form.mensaje, form.telefono
    )
    if (success) {
      setExito(true)
      setForm({ nombre: '', email: '', telefono: '', asunto: '', mensaje: '' })
    } else {
      setError(err || 'Error al enviar. Intenta nuevamente.')
    }
    setEnviando(false)
  }

  // ─── ESTADOS DE LA VIDEOLLAMADA ───────────────────────────────────────────────
  const [video, setVideo] = useState({ nombre: '', email: '' })
  const [fechaVideo, setFechaVideo] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [slotSeleccionado, setSlotSeleccionado] = useState('')
  const [cargandoSlots, setCargandoSlots] = useState(false)
  const [agendando, setAgendando] = useState(false)
  const [exitoVideo, setExitoVideo] = useState(false)
  const [errorVideo, setErrorVideo] = useState('')

  async function handleFechaVideo(fecha: string) {
    setFechaVideo(fecha)
    setSlotSeleccionado('')
    if (!fecha) return
    setCargandoSlots(true)
    const { slots: disponibles } = await obtenerSlotsDisponibles(ABOGADO_ID, fecha)
    setSlots(disponibles)
    setCargandoSlots(false)
  }

  async function handleAgendarVideo(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!video.nombre || !video.email || !fechaVideo || !slotSeleccionado) {
      setErrorVideo('Completa todos los campos y selecciona un horario.')
      return
    }
    setAgendando(true)
    setErrorVideo('')
    const res = await fetch('/api/crear-cita', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consultaId: null,
        abogadoId: ABOGADO_ID,
        nombreCliente: video.nombre,
        emailCliente: video.email,
        fechaHora: new Date(`${fechaVideo}T${slotSeleccionado}:00`).toISOString(),
      }),
    })
    const resultado = await res.json()
    if (resultado.success) {
      setExitoVideo(true)
      setVideo({ nombre: '', email: '' })
      setFechaVideo('')
      setSlots([])
      setSlotSeleccionado('')
    } else {
      setErrorVideo(resultado.error || 'Error al agendar. Intenta nuevamente.')
    }
    setAgendando(false)
  }

  function getFechasDisponibles() {
    const fechas = []
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    for (let i = 0; i <= 30; i++) {
      const d = new Date(hoy)
      d.setDate(hoy.getDate() + i)
      fechas.push(d.toISOString().split('T')[0])
    }
    return fechas
  }

  return (
    <section id="consulta" className="py-16 sm:py-24 px-4 sm:px-6" style={{ backgroundColor: '#F5F7FA' }}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs font-bold tracking-widest mb-3" style={{ color: dorado }}>COMIENZA HOY</p>
          <h2 className="text-2xl sm:text-4xl font-bold mb-3" style={{ fontFamily: 'var(--font-playfair), serif', color: azul }}>
            ¿Cómo quieres comenzar?
          </h2>
          <div className="w-16 h-0.5 mx-auto mb-4" style={{ backgroundColor: dorado }} />
          <p className="text-sm" style={{ color: '#6B7280' }}>Elige la opción que mejor se adapte a tu situación</p>
        </div>

        {/* Selector de pestañas */}
        <div className="flex rounded-xl p-1 mb-6 border" style={{ backgroundColor: 'white', borderColor: '#E5E7EB' }}>
          <button
            onClick={() => setTab('texto')}
            className="flex-1 py-3 text-sm font-semibold rounded-lg transition-all"
            style={tab === 'texto' ? { backgroundColor: azul, color: 'white' } : { color: '#6B7280' }}
          >
            ✉️ Consulta gratuita
          </button>
          <button
            onClick={() => setTab('video')}
            className="flex-1 py-3 text-sm font-semibold rounded-lg transition-all"
            style={tab === 'video' ? { backgroundColor: azul, color: 'white' } : { color: '#6B7280' }}
          >
            🎥 Agendar videollamada
          </button>
        </div>

        {/* ── Contenido pestaña TEXTO ── */}
        {tab === 'texto' && (
          <div className="bg-white rounded-2xl p-5 sm:p-8 shadow-sm border" style={{ borderColor: '#E5E7EB' }}>
            {exito ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: '#F0F7EE' }}>
                  <span className="text-3xl">✅</span>
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair), serif', color: azul }}>
                  ¡Consulta enviada!
                </h3>
                <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
                  Te responderemos a tu email en menos de 24 horas.
                </p>
                <button onClick={() => setExito(false)} className="text-sm font-medium underline" style={{ color: azul }}>
                  Enviar otra consulta
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="text-sm p-4 rounded-lg border" style={{ backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', color: '#B91C1C' }}>
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Nombre completo *</label>
                    <input type="text" name="nombre" value={form.nombre} onChange={handleChange}
                      placeholder="Ej: Juan Pérez"
                      className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 border"
                      style={{ borderColor: '#D1D5DB', '--tw-ring-color': azul } as React.CSSProperties} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Correo electrónico *</label>
                    <input type="email" name="email" value={form.email} onChange={handleChange}
                      placeholder="tu@email.com"
                      className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 border"
                      style={{ borderColor: '#D1D5DB' }} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Teléfono</label>
                    <input type="tel" name="telefono" value={form.telefono} onChange={handleChange}
                      placeholder="+56 9 1234 5678"
                      className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 border"
                      style={{ borderColor: '#D1D5DB' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Asunto *</label>
                    <select name="asunto" value={form.asunto}
                      onChange={e => setForm({ ...form, asunto: e.target.value })}
                      className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none border"
                      style={{ borderColor: '#D1D5DB', color: form.asunto ? '#374151' : '#9CA3AF' }}>
                      <option value="">Selecciona tu área *</option>
                      <option value="Deuda / Embargo / Juicio Ejecutivo">Deuda / Embargo / Juicio Ejecutivo</option>
                      <option value="Derecho Tributario / SII">Derecho Tributario / SII</option>
                      <option value="Despido / Derecho Laboral">Despido / Derecho Laboral</option>
                      <option value="Contrato / Herencia / Civil">Contrato / Herencia / Civil</option>
                      <option value="Constitución de empresa">Constitución de empresa</option>
                      <option value="Otra consulta">Otra consulta</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Describe tu situación *</label>
                  <textarea name="mensaje" value={form.mensaje} onChange={handleChange} rows={5}
                    placeholder="Cuéntanos con detalle tu situación legal..."
                    className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 border resize-none"
                    style={{ borderColor: '#D1D5DB' }} />
                </div>
                <button type="submit" disabled={enviando}
                  className="w-full font-bold py-4 rounded-xl tracking-wide transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: dorado, color: azulProfundo }}>
                  {enviando ? 'Enviando...' : 'ENVIAR CONSULTA GRATUITA'}
                </button>
                <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
                  Los campos marcados con * son obligatorios. Tu información es confidencial.
                </p>
              </form>
            )}
          </div>
        )}

        {/* ── Contenido pestaña VIDEO ── */}
        {tab === 'video' && (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
            {exitoVideo ? (
              <div className="text-center py-12 px-8">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#F0F7EE' }}>
                  <span className="text-3xl">🎉</span>
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair), serif', color: azul }}>
                  ¡Videollamada agendada!
                </h3>
                <p className="text-sm mb-2" style={{ color: '#6B7280' }}>Te enviamos el enlace de la videollamada a tu email.</p>
                {fechaVideo && slotSeleccionado && (
                  <p className="text-sm font-semibold mt-3 mb-6" style={{ color: azul }}>
                    📅 {new Date(`${fechaVideo}T${slotSeleccionado}`).toLocaleString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
                <button onClick={() => { setExitoVideo(false); setFechaVideo(''); setSlots([]); setSlotSeleccionado('') }}
                  className="text-sm font-medium underline" style={{ color: azul }}>
                  Agendar otra
                </button>
              </div>
            ) : (
              <form onSubmit={handleAgendarVideo}>

                {/* Indicador de 3 pasos */}
                <div className="flex border-b" style={{ borderColor: '#E5E7EB' }}>
                  {[
                    { n: '1', label: 'Tus datos' },
                    { n: '2', label: 'Fecha' },
                    { n: '3', label: 'Horario' },
                  ].map((paso, i) => {
                    const activo = i === 0
                      ? true
                      : i === 1
                        ? !!(video.nombre && video.email)
                        : !!(video.nombre && video.email && fechaVideo)
                    return (
                      <div key={paso.n} className="flex-1 py-3 flex items-center justify-center gap-2">
                        <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
                          style={{ backgroundColor: activo ? azul : '#E5E7EB', color: activo ? 'white' : '#9CA3AF' }}>
                          {paso.n}
                        </span>
                        <span className="text-xs font-medium hidden sm:block" style={{ color: activo ? azul : '#9CA3AF' }}>
                          {paso.label}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div className="p-6 space-y-6">
                  {errorVideo && (
                    <div className="text-sm p-4 rounded-lg border" style={{ backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', color: '#B91C1C' }}>
                      {errorVideo}
                    </div>
                  )}

                  {/* PASO 1: Datos del cliente */}
                  <div>
                    <p className="text-xs font-bold tracking-widest mb-3" style={{ color: dorado }}>PASO 1 — TUS DATOS</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Nombre completo *</label>
                        <input type="text" value={video.nombre} onChange={e => setVideo({ ...video, nombre: e.target.value })}
                          placeholder="Ej: Juan Pérez"
                          className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none border"
                          style={{ borderColor: '#D1D5DB' }} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Correo electrónico *</label>
                        <input type="email" value={video.email} onChange={e => setVideo({ ...video, email: e.target.value })}
                          placeholder="tu@email.com"
                          className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none border"
                          style={{ borderColor: '#D1D5DB' }} />
                      </div>
                    </div>
                  </div>

                  <hr style={{ borderColor: '#F3F4F6' }} />

                  {/* PASO 2: Selección de fecha */}
                  <div>
                    <p className="text-xs font-bold tracking-widest mb-3" style={{ color: dorado }}>PASO 2 — ELIGE UNA FECHA</p>
                    <div className="space-y-2">
                      {getFechasDisponibles().slice(0, 14).map(f => {
                        const d = new Date(f + 'T12:00:00')
                        const seleccionada = fechaVideo === f
                        return (
                          <button key={f} type="button" onClick={() => handleFechaVideo(f)}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left"
                            style={seleccionada
                              ? { backgroundColor: azul, borderColor: azul, color: 'white' }
                              : { backgroundColor: 'white', borderColor: '#E5E7EB', color: '#374151' }}>
                            <span className="text-sm font-semibold capitalize">
                              {d.toLocaleDateString('es-CL', { weekday: 'long' })}
                            </span>
                            <span className="text-sm" style={{ color: seleccionada ? '#C7B88A' : '#6B7280' }}>
                              {d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <hr style={{ borderColor: '#F3F4F6' }} />

                  {/* PASO 3: Selección de horario */}
                  <div>
                    <p className="text-xs font-bold tracking-widest mb-3" style={{ color: dorado }}>PASO 3 — ELIGE UN HORARIO</p>

                    {!fechaVideo && (
                      <div className="py-6 text-center rounded-xl border-2 border-dashed" style={{ borderColor: '#E5E7EB' }}>
                        <p className="text-sm" style={{ color: '#9CA3AF' }}>Primero selecciona una fecha arriba</p>
                      </div>
                    )}

                    {cargandoSlots && (
                      <div className="py-6 text-center">
                        <p className="text-sm" style={{ color: '#9CA3AF' }}>Cargando horarios disponibles...</p>
                      </div>
                    )}

                    {!cargandoSlots && fechaVideo && slots.length === 0 && (
                      <div className="py-6 text-center rounded-xl border-2 border-dashed" style={{ borderColor: '#E5E7EB' }}>
                        <p className="text-sm" style={{ color: '#6B7280' }}>No hay horarios disponibles para ese día.</p>
                        <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Prueba seleccionando otra fecha.</p>
                      </div>
                    )}

                    {!cargandoSlots && slots.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {slots.map(slot => (
                          <button key={slot} type="button" onClick={() => setSlotSeleccionado(slot)}
                            className="py-3 rounded-xl text-sm font-bold border transition-all"
                            style={slotSeleccionado === slot
                              ? { backgroundColor: azul, borderColor: azul, color: 'white' }
                              : { backgroundColor: 'white', borderColor: '#E5E7EB', color: '#374151' }}>
                            {slot}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Resumen de la cita */}
                  {fechaVideo && slotSeleccionado && (
                    <div className="rounded-xl p-4 border" style={{ backgroundColor: '#F0F4FF', borderColor: '#C7D2FE' }}>
                      <p className="text-sm font-semibold mb-1" style={{ color: azul }}>
                        📅 {new Date(`${fechaVideo}T${slotSeleccionado}`).toLocaleString('es-CL', {
                          weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                      <p className="text-xs" style={{ color: '#6B7280' }}>Duración: 30 minutos · Enlace de videollamada por email</p>
                    </div>
                  )}

                  <button type="submit" disabled={agendando || !fechaVideo || !slotSeleccionado}
                    className="w-full font-bold py-4 rounded-xl tracking-wide transition-opacity disabled:opacity-40"
                    style={{ backgroundColor: dorado, color: azulProfundo }}>
                    {agendando ? 'Agendando...' : 'CONFIRMAR VIDEOLLAMADA'}
                  </button>
                  <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
                    Tu información es confidencial. Recibirás el enlace de videollamada por correo.
                  </p>
                </div>
              </form>
            )}
          </div>
        )}

      </div>
    </section>
  )
}
