'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { obtenerSlotsDisponibles, obtenerCitaPorConsulta } from '@/lib/citas'
import type { Consulta } from '@/lib/consultas'
import type { Cita } from '@/lib/citas'

function SeguimientoContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [consulta, setConsulta] = useState<Consulta | null>(null)
  const [cita, setCita] = useState<Cita | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarAgenda, setMostrarAgenda] = useState(false)
  const [fechaSeleccionada, setFechaSeleccionada] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [slotSeleccionado, setSlotSeleccionado] = useState('')
  const [cargandoSlots, setCargandoSlots] = useState(false)
  const [agendando, setAgendando] = useState(false)
  const [citaConfirmada, setCitaConfirmada] = useState(false)

  useEffect(() => {
    async function cargar() {
      if (!token) {
        setError('Enlace inválido o expirado.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('consultas')
        .select('*')
        .eq('token', token)
        .single()

      if (error || !data) {
        setError('No se encontró la consulta. Verifica el enlace.')
        setLoading(false)
        return
      }

      setConsulta(data as Consulta)

      const { cita: citaExistente } = await obtenerCitaPorConsulta(data.id)
      if (citaExistente) setCita(citaExistente)

      setLoading(false)
    }
    cargar()
  }, [token])

  async function handleFechaChange(fecha: string) {
    setFechaSeleccionada(fecha)
    setSlotSeleccionado('')
    if (!fecha || !consulta) return
    setCargandoSlots(true)
    const { slots: disponibles } = await obtenerSlotsDisponibles(consulta.abogado_id, fecha)
    setSlots(disponibles)
    setCargandoSlots(false)
  }

  async function handleAgendar() {
    if (!fechaSeleccionada || !slotSeleccionado || !consulta) return
    setAgendando(true)

    const fechaHora = `${fechaSeleccionada}T${slotSeleccionado}:00`

    const res = await fetch('/api/crear-cita', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consultaId: consulta.id,
        abogadoId: consulta.abogado_id,
        nombreCliente: consulta.nombre_cliente,
        emailCliente: consulta.email_cliente,
        fechaHora,
      }),
    })

    const resultado = await res.json()
    if (resultado.success) {
      setCita(resultado.cita)
      setCitaConfirmada(true)
      setMostrarAgenda(false)
    } else {
      setError(resultado.error || 'Error al agendar. Intenta nuevamente.')
    }
    setAgendando(false)
  }

  function getFechasDisponibles() {
    const fechas = []
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    for (let i = 1; i <= 30; i++) {
      const d = new Date(hoy)
      d.setDate(hoy.getDate() + i)
      if (d.getDay() !== 0) {
        fechas.push(d.toISOString().split('T')[0])
      }
    }
    return fechas
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Cargando tu consulta...</p>
      </div>
    )
  }

  if (error && !consulta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">🔗</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Enlace no válido</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  const estadoConfig = {
    nueva: { label: 'En revisión', color: 'bg-blue-100 text-blue-800', icono: '🕐' },
    respondida: { label: 'Respondida', color: 'bg-green-100 text-green-800', icono: '✅' },
    rechazada: { label: 'No podemos tomar tu caso', color: 'bg-red-100 text-red-800', icono: '❌' },
  }

  const estado = estadoConfig[consulta!.estado]

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Toropacheco y Asociados</h1>
          <p className="text-gray-500 text-sm mt-1">Estado de tu consulta legal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex-1 min-w-0 pr-2">{consulta!.asunto}</h2>
            <span className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium ${estado.color}`}>
              {estado.icono} {estado.label}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Enviada el {new Date(consulta!.created_at).toLocaleDateString('es-CL', {
              day: 'numeric', month: 'long', year: 'numeric'
            })}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Tu consulta</h3>
          <p className="text-gray-700 leading-relaxed">{consulta!.mensaje}</p>
        </div>

        {consulta!.estado === 'respondida' && consulta!.respuesta && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6">
            <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-3">
              Respuesta del abogado
            </h3>
            <p className="text-gray-700 leading-relaxed">{consulta!.respuesta}</p>
            {consulta!.respondida_en && (
              <p className="text-xs text-gray-400 mt-3">
                Respondida el {new Date(consulta!.respondida_en).toLocaleDateString('es-CL', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
              </p>
            )}
          </div>
        )}

        {consulta!.estado === 'nueva' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6 text-center">
            <p className="text-blue-700 font-medium">Tu consulta está siendo revisada</p>
            <p className="text-blue-600 text-sm mt-1">Te responderemos en menos de 24 horas a tu email.</p>
          </div>
        )}

        {cita && !citaConfirmada && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 mb-6">
            <h3 className="text-sm font-semibold text-indigo-700 uppercase tracking-wide mb-3">
              📅 Videoconsulta agendada
            </h3>
            <p className="text-gray-700 font-medium">
              {new Date(cita.fecha_hora).toLocaleString('es-CL', {
                weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
              })}
            </p>
            {cita.meeting_url ? (
              <a href={cita.meeting_url} target="_blank" rel="noopener noreferrer"
                className="inline-block mt-4 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
                Ingresar a la reunión →
              </a>
            ) : (
              <p className="text-sm text-indigo-600 mt-3">El abogado te enviará el enlace próximamente.</p>
            )}
          </div>
        )}

        {citaConfirmada && cita && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="text-lg font-bold text-green-800 mb-1">¡Cita confirmada!</h3>
            <p className="text-green-700 text-sm mb-4">
              {new Date(cita.fecha_hora).toLocaleString('es-CL', {
                weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
              })}
            </p>
            {cita.meeting_url ? (
              <a href={cita.meeting_url} target="_blank" rel="noopener noreferrer"
                className="inline-block bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors">
                Ingresar a la reunión →
              </a>
            ) : (
              <p className="text-gray-500 text-sm mb-4">El abogado te enviará el enlace a tu email.</p>
            )}
          </div>
        )}

        {consulta!.estado === 'respondida' && !cita && !citaConfirmada && (
          <div className="bg-gray-900 rounded-2xl p-6 text-white mb-6">
            <h3 className="text-lg font-bold mb-2">¿Quieres continuar con tu caso?</h3>
            <p className="text-gray-400 text-sm mb-4">Agenda una videoconsulta de 30 minutos con nuestro abogado.</p>
            {!mostrarAgenda ? (
              <button onClick={() => setMostrarAgenda(true)}
                className="bg-white text-gray-900 font-semibold px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors">
                Agendar videollamada
              </button>
            ) : (
              <div className="space-y-4">
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Selecciona una fecha</label>
                  <select value={fechaSeleccionada} onChange={e => handleFechaChange(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Elige una fecha --</option>
                    {getFechasDisponibles().map(f => (
                      <option key={f} value={f}>
                        {new Date(f + 'T12:00:00').toLocaleDateString('es-CL', {
                          weekday: 'long', day: 'numeric', month: 'long'
                        })}
                      </option>
                    ))}
                  </select>
                </div>
                {cargandoSlots && <p className="text-gray-400 text-sm">Cargando horarios...</p>}
                {!cargandoSlots && fechaSeleccionada && slots.length === 0 && (
                  <p className="text-gray-400 text-sm">No hay horarios disponibles para ese día.</p>
                )}
                {!cargandoSlots && slots.length > 0 && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Selecciona un horario</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {slots.map(slot => (
                        <button key={slot} onClick={() => setSlotSeleccionado(slot)}
                          className={`py-2 rounded-lg text-sm font-medium transition-colors ${slotSeleccionado === slot ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {slotSeleccionado && (
                  <button onClick={handleAgendar} disabled={agendando}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm sm:text-base">
                    {agendando ? 'Agendando...' : (
                      <>
                        <span className="block sm:hidden">Confirmar cita</span>
                        <span className="hidden sm:block">{`Confirmar ${fechaSeleccionada} a las ${slotSeleccionado}`}</span>
                      </>
                    )}
                  </button>
                )}
                <button onClick={() => { setMostrarAgenda(false); setFechaSeleccionada(''); setSlotSeleccionado('') }}
                  className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SeguimientoPage() {
  return (
    <Suspense>
      <SeguimientoContent />
    </Suspense>
  )
}