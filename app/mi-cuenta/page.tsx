'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cerrarSesion } from '@/lib/auth'
import {
  obtenerDatosCliente,
  obtenerMisContratos,
  obtenerCuotasContrato,
  obtenerTimelineContrato,
  type Cliente,
  type Contrato,
  type Cuota,
  type TimelineEvento,
} from '@/lib/clientes'

const azul = '#1F3A5F'
const dorado = '#C7B88A'
const azulProfundo = '#162B46'

function formatMonto(n: number) {
  return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
}
function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function MiCuentaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [contratoActivo, setContratoActivo] = useState<number | null>(null)
  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const [timeline, setTimeline] = useState<TimelineEvento[]>([])
  const [vista, setVista] = useState<'resumen' | 'pagos' | 'timeline'>('resumen')

  useEffect(() => {
    async function cargar() {
      const { cliente: c } = await obtenerDatosCliente()
      if (!c) { router.push('/login'); return }
      setCliente(c)
      const { contratos: cs } = await obtenerMisContratos(c.id)
      setContratos(cs)
      if (cs.length > 0) {
        setContratoActivo(cs[0].id)
        const [cuotasRes, timelineRes] = await Promise.all([
          obtenerCuotasContrato(cs[0].id),
          obtenerTimelineContrato(cs[0].id),
        ])
        setCuotas(cuotasRes.cuotas)
        setTimeline(timelineRes.eventos)
      }
      setLoading(false)
    }
    cargar()
  }, [router])

  async function cambiarContrato(id: number) {
    setContratoActivo(id)
    const [cuotasRes, timelineRes] = await Promise.all([
      obtenerCuotasContrato(id),
      obtenerTimelineContrato(id),
    ])
    setCuotas(cuotasRes.cuotas)
    setTimeline(timelineRes.eventos)
  }

  async function handleCerrarSesion() {
    await cerrarSesion()
    router.push('/')
  }

  const contrato = contratos.find(c => c.id === contratoActivo)
  const cuotasPagadas = cuotas.filter(c => c.estado === 'pagada').length
  const cuotasPendientes = cuotas.filter(c => c.estado === 'pendiente')
  const proximaCuota = cuotasPendientes[0]
  const eventosCompletados = timeline.filter(e => e.completado).length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FDFBF5' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: azul }} />
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Cargando tu cuenta...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F7FA', fontFamily: 'var(--font-inter), sans-serif' }}>

      {/* NAVBAR */}
      <nav className="border-b px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center gap-3" style={{ backgroundColor: azulProfundo, borderColor: '#243B55' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: dorado, color: azulProfundo }}>⚖</div>
          <div>
            <span className="text-sm font-bold text-white">TORO PACHECO</span>
            <span className="text-xs ml-1" style={{ color: dorado }}>&amp; ASOCIADOS</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white opacity-80">Hola, {cliente?.nombre.split(' ')[0]}</span>
          <button onClick={handleCerrarSesion} className="text-xs px-3 py-1.5 rounded-lg border transition-colors" style={{ borderColor: dorado, color: dorado }}>
            Cerrar sesión
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Sin contratos */}
        {contratos.length === 0 && (
          <div className="bg-white rounded-2xl border p-12 text-center" style={{ borderColor: '#EDE8DC' }}>
            <div className="text-4xl mb-4">📋</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: azul }}>Sin servicios activos</h2>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>Aún no tienes contratos registrados. Contacta al estudio para más información.</p>
          </div>
        )}

        {contrato && (
          <>
            {/* Selector de contrato si hay varios */}
            {contratos.length > 1 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {contratos.map(c => (
                  <button key={c.id} onClick={() => cambiarContrato(c.id)}
                    className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors border"
                    style={c.id === contratoActivo
                      ? { backgroundColor: azul, color: dorado, borderColor: azul }
                      : { backgroundColor: 'white', color: azul, borderColor: '#EDE8DC' }}>
                    {c.tipo_servicio}
                  </button>
                ))}
              </div>
            )}

            {/* Header contrato */}
            <div className="rounded-2xl p-6 mb-6 text-white" style={{ backgroundColor: azulProfundo }}>
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                  <p className="text-xs font-bold tracking-widest mb-1" style={{ color: dorado }}>SERVICIO ACTIVO</p>
                  <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair), serif' }}>{contrato.tipo_servicio}</h2>
                  {contrato.descripcion && <p className="text-sm opacity-70 mt-1">{contrato.descripcion}</p>}
                  <p className="text-xs opacity-50 mt-2">Desde {formatFecha(contrato.fecha_inicio)}</p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${contrato.estado === 'activo' ? 'bg-green-500/20 text-green-300' : contrato.estado === 'completado' ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'}`}>
                    {contrato.estado.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Resumen financiero */}
              <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                <div>
                  <p className="text-xs opacity-50 mb-0.5">Monto total</p>
                  <p className="text-sm sm:text-lg font-bold break-all">{formatMonto(contrato.monto_total)}</p>
                </div>
                <div>
                  <p className="text-xs opacity-50 mb-0.5">Pie pagado</p>
                  <p className="text-sm sm:text-lg font-bold break-all" style={{ color: dorado }}>{formatMonto(contrato.monto_pie)}</p>
                </div>
                <div>
                  <p className="text-xs opacity-50 mb-0.5">Saldo</p>
                  <p className="text-sm sm:text-lg font-bold text-red-300 break-all">{formatMonto(contrato.saldo)}</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 border" style={{ borderColor: '#EDE8DC' }}>
              {(['resumen', 'pagos', 'timeline'] as const).map(v => (
                <button key={v} onClick={() => setVista(v)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold capitalize transition-colors"
                  style={vista === v ? { backgroundColor: azul, color: dorado } : { color: azul }}>
                  {v === 'resumen' ? 'Resumen' : v === 'pagos' ? 'Cuotas y pagos' : 'Timeline'}
                </button>
              ))}
            </div>

            {/* RESUMEN */}
            {vista === 'resumen' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#EDE8DC' }}>
                  <p className="text-xs font-bold tracking-widest mb-3" style={{ color: dorado }}>PRÓXIMO PAGO</p>
                  {proximaCuota ? (
                    <>
                      <p className="text-2xl font-bold" style={{ color: azul }}>{formatMonto(proximaCuota.monto)}</p>
                      <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Cuota {proximaCuota.numero} · vence {formatFecha(proximaCuota.fecha_vencimiento)}</p>
                    </>
                  ) : (
                    <p className="text-sm" style={{ color: '#9CA3AF' }}>Sin cuotas pendientes</p>
                  )}
                </div>
                <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#EDE8DC' }}>
                  <p className="text-xs font-bold tracking-widest mb-3" style={{ color: dorado }}>CUOTAS</p>
                  <p className="text-2xl font-bold" style={{ color: azul }}>{cuotasPagadas}/{cuotas.length}</p>
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>pagadas</p>
                  <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ backgroundColor: azul, width: cuotas.length > 0 ? `${(cuotasPagadas / cuotas.length) * 100}%` : '0%' }} />
                  </div>
                </div>
                <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#EDE8DC' }}>
                  <p className="text-xs font-bold tracking-widest mb-3" style={{ color: dorado }}>PROCESO</p>
                  <p className="text-2xl font-bold" style={{ color: azul }}>{eventosCompletados}/{timeline.length}</p>
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>etapas completadas</p>
                  <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ backgroundColor: dorado, width: timeline.length > 0 ? `${(eventosCompletados / timeline.length) * 100}%` : '0%' }} />
                  </div>
                </div>
              </div>
            )}

            {/* PAGOS */}
            {vista === 'pagos' && (
              <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#EDE8DC' }}>
                <div className="px-6 py-4 border-b" style={{ borderColor: '#EDE8DC' }}>
                  <p className="text-xs font-bold tracking-widest" style={{ color: dorado }}>DETALLE DE CUOTAS</p>
                </div>
                {cuotas.length === 0 ? (
                  <div className="p-8 text-center text-sm" style={{ color: '#9CA3AF' }}>Sin cuotas registradas</div>
                ) : (
                  <div>
                    {cuotas.map(cuota => (
                      <div key={cuota.id} className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b last:border-0" style={{ borderColor: '#F3F4F6' }}>
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                            style={{ backgroundColor: cuota.estado === 'pagada' ? '#10B981' : cuota.estado === 'vencida' ? '#EF4444' : azul }}>
                            {cuota.numero}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium" style={{ color: azul }}>Cuota {cuota.numero}</p>
                            <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>
                              Vence: {formatFecha(cuota.fecha_vencimiento)}
                              {cuota.fecha_pago && ` · Pagado: ${formatFecha(cuota.fecha_pago)}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold" style={{ color: azul }}>{formatMonto(cuota.monto)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cuota.estado === 'pagada' ? 'bg-green-100 text-green-700' : cuota.estado === 'vencida' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            {cuota.estado === 'pagada' ? 'Pagada' : cuota.estado === 'vencida' ? 'Vencida' : 'Pendiente'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TIMELINE */}
            {vista === 'timeline' && (
              <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#EDE8DC' }}>
                <p className="text-xs font-bold tracking-widest mb-6" style={{ color: dorado }}>TIMELINE DEL PROCESO</p>
                {timeline.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>Sin etapas registradas</p>
                ) : (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px" style={{ backgroundColor: '#E5E7EB' }} />
                    <div className="space-y-6">
                      {timeline.map((evento, i) => (
                        <div key={evento.id} className="flex gap-4 relative">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-xs font-bold ${evento.completado ? 'text-white' : 'border-2 bg-white'}`}
                            style={evento.completado ? { backgroundColor: azul, borderColor: azul } : { borderColor: '#D1D5DB', color: '#9CA3AF' }}>
                            {evento.completado ? '✓' : i + 1}
                          </div>
                          <div className="pt-1 pb-2">
                            <p className="text-sm font-semibold" style={{ color: evento.completado ? azul : '#9CA3AF' }}>{evento.titulo}</p>
                            {evento.descripcion && <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{evento.descripcion}</p>}
                            <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>{formatFecha(evento.fecha)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
