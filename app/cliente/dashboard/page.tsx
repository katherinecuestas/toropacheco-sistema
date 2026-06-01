'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { cerrarSesion } from '@/lib/auth'
import { useInactivityLogout } from '@/lib/useInactivityLogout'
import {
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
const crema = '#FDFBF5'

function formatMonto(n: number) {
  return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
}
function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
}

type ContratoConAbogado = Contrato & { abogados?: { nombre_negocio: string } }

export default function ClienteDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [contrato, setContrato] = useState<ContratoConAbogado | null>(null)
  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const [timeline, setTimeline] = useState<TimelineEvento[]>([])

  useInactivityLogout(() => router.push('/cliente/login'))

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/cliente/login'); return }

      const { data: clienteData } = await supabase
        .from('clientes')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (!clienteData) { router.push('/cliente/login'); return }
      setCliente(clienteData)

      const { data: contratos } = await supabase
        .from('contratos')
        .select('*, abogados(nombre_negocio)')
        .eq('cliente_id', clienteData.id)
        .order('created_at', { ascending: false })
        .limit(1)

      const contratoActivo = contratos?.[0] ?? null
      setContrato(contratoActivo)

      if (contratoActivo) {
        const [cuotasRes, timelineRes] = await Promise.all([
          obtenerCuotasContrato(contratoActivo.id),
          obtenerTimelineContrato(contratoActivo.id),
        ])
        setCuotas(cuotasRes.cuotas)
        setTimeline(timelineRes.eventos)
      }

      setLoading(false)
    }
    cargar()
  }, [router])

  async function handleCerrarSesion() {
    await cerrarSesion()
    router.push('/cliente/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: crema }}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: azul }} />
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Cargando tu portal...</p>
        </div>
      </div>
    )
  }

  // ── Cálculos financieros ────────────────────────────────────────────────────
  const montoPagado = cuotas
    .filter(c => c.estado === 'pagada')
    .reduce((acc, c) => acc + c.monto, 0)
  const saldoPendiente = contrato ? contrato.monto_total - montoPagado : 0
  const pctPagado = contrato && contrato.monto_total > 0
    ? Math.round((montoPagado / contrato.monto_total) * 100)
    : 0

  // ── Ícono de timeline ───────────────────────────────────────────────────────
  const ultimoCompletadoIdx = timeline.reduce((last, ev, i) => ev.completado ? i : last, -1)
  function iconoTimeline(ev: TimelineEvento, i: number) {
    if (!ev.completado) return '⏳'
    if (i === ultimoCompletadoIdx) return '🔄'
    return '✅'
  }

  const hoy = new Date()

  return (
    <div className="min-h-screen" style={{ backgroundColor: crema, fontFamily: 'var(--font-inter), sans-serif' }}>

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav className="border-b px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center gap-3"
        style={{ backgroundColor: azulProfundo, borderColor: '#243B55' }}>
        <div className="flex items-center">
          <img src="/logo_claro.png" alt="Toro Pacheco & Asociados" className="h-10 w-auto" />
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-sm text-white opacity-70">
            {cliente?.nombre.split(' ')[0]}
          </span>
          <a href="/" className="text-xs px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
            style={{ color: 'rgba(255,255,255,0.55)' }}>
            ← Sitio
          </a>
          <button onClick={handleCerrarSesion}
            className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: dorado, color: dorado }}>
            Cerrar sesión
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">

        {/* ── 1. HEADER BIENVENIDA ────────────────────────────────────────── */}
        <div className="rounded-2xl p-6 sm:p-8 text-white"
          style={{ backgroundColor: azulProfundo }}>
          <p className="text-xs font-bold tracking-widest mb-2" style={{ color: dorado }}>
            PORTAL DEL CLIENTE
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1"
            style={{ fontFamily: 'var(--font-playfair), serif' }}>
            Bienvenido/a, {cliente?.nombre.split(' ')[0]}
          </h1>
          <p className="text-sm opacity-60">
            {contrato ? 'Estamos trabajando en tu caso.' : 'Aún no tienes servicios activos.'}
          </p>
        </div>

        {!contrato && (
          <div className="bg-white rounded-2xl border p-12 text-center" style={{ borderColor: '#EDE8DC' }}>
            <div className="text-4xl mb-4">📋</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: azul }}>Sin servicios activos</h2>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              Contacta al estudio para más información.
            </p>
            <a href="https://wa.me/56950944482" target="_blank" rel="noopener noreferrer"
              className="inline-block mt-4 px-6 py-2.5 rounded-full text-sm font-bold"
              style={{ backgroundColor: azul, color: dorado }}>
              Contactar por WhatsApp
            </a>
          </div>
        )}

        {contrato && (<>

          {/* ── 2. CARDS RESUMEN (2 columnas) ───────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Card izquierda: datos del contrato */}
            <div className="bg-white rounded-2xl border p-6 space-y-4" style={{ borderColor: '#EDE8DC' }}>
              <p className="text-xs font-bold tracking-widest" style={{ color: dorado }}>CONTRATO ACTIVO</p>
              <div>
                <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair), serif', color: azul }}>
                  {contrato.tipo_servicio}
                </h2>
                {contrato.descripcion && (
                  <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{contrato.descripcion}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  contrato.estado === 'activo'
                    ? 'bg-green-100 text-green-700'
                    : contrato.estado === 'completado'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {contrato.estado.toUpperCase()}
                </span>
              </div>
              <div className="pt-2 border-t space-y-1" style={{ borderColor: '#F3F4F6' }}>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  Abogado asignado
                </p>
                <p className="text-sm font-semibold" style={{ color: azul }}>
                  {contrato.abogados?.nombre_negocio ?? 'Toro Pacheco & Asociados'}
                </p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  Desde {formatFecha(contrato.fecha_inicio)}
                </p>
              </div>
            </div>

            {/* Card derecha: resumen financiero */}
            <div className="bg-white rounded-2xl border p-6 space-y-4" style={{ borderColor: '#EDE8DC' }}>
              <p className="text-xs font-bold tracking-widest" style={{ color: dorado }}>RESUMEN FINANCIERO</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: '#6B7280' }}>Monto total</span>
                  <span className="text-sm font-bold" style={{ color: azul }}>
                    {formatMonto(contrato.monto_total)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: '#6B7280' }}>Monto pagado</span>
                  <span className="text-sm font-bold text-green-600">
                    {formatMonto(montoPagado)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: '#6B7280' }}>Saldo pendiente</span>
                  <span className="text-sm font-bold text-red-500">
                    {formatMonto(saldoPendiente)}
                  </span>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="pt-2">
                <div className="flex justify-between text-xs mb-1.5" style={{ color: '#9CA3AF' }}>
                  <span>Progreso de pago</span>
                  <span>{pctPagado}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ backgroundColor: azul, width: `${pctPagado}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* ── 3. TIMELINE DEL CASO ────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border p-6 sm:p-8" style={{ borderColor: '#EDE8DC' }}>
            <p className="text-xs font-bold tracking-widest mb-6" style={{ color: dorado }}>
              TIMELINE DEL CASO
            </p>
            {timeline.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>
                Sin etapas registradas todavía.
              </p>
            ) : (
              <div className="relative">
                {/* Línea vertical */}
                <div className="absolute left-5 top-0 bottom-0 w-px" style={{ backgroundColor: '#E5E7EB' }} />
                <div className="space-y-6">
                  {timeline.map((evento, i) => {
                    const icono = iconoTimeline(evento, i)
                    const esActual = icono === '🔄'
                    return (
                      <div key={evento.id} className="flex gap-4 relative">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-base"
                          style={{
                            backgroundColor: evento.completado ? (esActual ? dorado + '22' : '#F0FDF4') : '#F9FAFB',
                            border: `2px solid ${evento.completado ? (esActual ? dorado : '#10B981') : '#E5E7EB'}`,
                          }}>
                          {icono}
                        </div>
                        <div className="pt-1.5 pb-2 flex-1">
                          <p className="text-sm font-semibold" style={{ color: evento.completado ? azul : '#9CA3AF' }}>
                            {evento.titulo}
                            {esActual && (
                              <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: dorado + '22', color: dorado }}>
                                en curso
                              </span>
                            )}
                          </p>
                          {evento.descripcion && (
                            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#9CA3AF' }}>
                              {evento.descripcion}
                            </p>
                          )}
                          <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>
                            {formatFecha(evento.fecha)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── 4. TABLA DE CUOTAS ──────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#EDE8DC' }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: '#EDE8DC' }}>
              <p className="text-xs font-bold tracking-widest" style={{ color: dorado }}>CUOTAS Y PAGOS</p>
            </div>
            {cuotas.length === 0 ? (
              <div className="p-8 text-center text-sm" style={{ color: '#9CA3AF' }}>
                Sin cuotas registradas
              </div>
            ) : (
              <div>
                {cuotas.map(cuota => {
                  const vencida = cuota.estado === 'pendiente' && new Date(cuota.fecha_vencimiento) < hoy
                  const estadoEfectivo = cuota.estado === 'pagada' ? 'pagada' : vencida ? 'vencida' : 'pendiente'

                  return (
                    <div key={cuota.id}
                      className="flex items-center justify-between px-4 sm:px-6 py-4 border-b last:border-0"
                      style={{ borderColor: '#F3F4F6' }}>
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{
                            backgroundColor:
                              estadoEfectivo === 'pagada' ? '#10B981'
                              : estadoEfectivo === 'vencida' ? '#EF4444'
                              : azul,
                          }}>
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
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-sm font-bold" style={{ color: azul }}>
                          {formatMonto(cuota.monto)}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          estadoEfectivo === 'pagada'
                            ? 'bg-green-100 text-green-700'
                            : estadoEfectivo === 'vencida'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {estadoEfectivo === 'pagada' ? 'Pagada' : estadoEfectivo === 'vencida' ? 'Vencida' : 'Pendiente'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </>)}
      </div>
    </div>
  )
}
