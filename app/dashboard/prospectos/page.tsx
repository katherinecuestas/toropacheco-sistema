'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { obtenerSesion, cerrarSesion } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

const azul = '#1F3A5F'
const dorado = '#C7B88A'
const azulProfundo = '#162B46'

type Estado = 'interesado' | 'agendado'

const ESTADO_BADGE: Record<Estado, string> = {
  interesado: 'bg-green-100 text-green-700',
  agendado:   'bg-emerald-100 text-emerald-800',
}

function fmtMonto(n: number | null): string {
  if (!n) return '—'
  return '$' + n.toLocaleString('es-CL')
}

function fmtFecha(valor: string | null | undefined): string {
  if (!valor) return '—'
  const limpio = String(valor).slice(0, 10)
  const d = new Date(limpio + 'T12:00:00')
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

function plazoColor(plazo: string | null | undefined): string {
  if (!plazo) return 'text-gray-400'
  const d = new Date(String(plazo).slice(0, 10) + 'T12:00:00')
  if (isNaN(d.getTime())) return 'text-gray-400'
  const diff = Math.round((d.getTime() - Date.now()) / 86400000)
  if (diff < 0) return 'text-red-700 font-bold'
  if (diff <= 2) return 'text-orange-600 font-semibold'
  if (diff <= 5) return 'text-yellow-600 font-semibold'
  return 'text-green-700'
}

export default function ProspectosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [prospectos, setProspectos] = useState<any[]>([])
  const [abogado, setAbogado] = useState<any>(null)
  const [token, setToken] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroFecha, setFiltroFecha] = useState('')
  const [filtroJuzgado, setFiltroJuzgado] = useState('')
  const [filtroMonto, setFiltroMonto] = useState('')

  useEffect(() => {
    async function cargar() {
      const { session } = await obtenerSesion()
      if (!session) { router.push('/login'); return }

      const { data: u } = await supabase
        .from('usuarios')
        .select('id, nombres, nombre_negocio, email, is_admin, rol')
        .eq('auth_user_id', session.user.id)
        .maybeSingle()

      if (!u || u.rol === 'supervisor') { router.push('/login'); return }
      setAbogado(u)
      setToken(session.access_token)

      const res = await fetch('/api/prospectos', {
        headers: { authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (data.prospectos) setProspectos(data.prospectos)
      setLoading(false)
    }
    cargar()
  }, [router])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F7FA' }}>
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: azul }} />
    </div>
  )

  const interesados = prospectos.filter(p => p.estado === 'interesado').length
  const agendados   = prospectos.filter(p => p.estado === 'agendado').length

  const juzgadosUnicos = [...new Set(prospectos.map(p => p.juzgado).filter(Boolean))].sort() as string[]
  const mesesUnicos = [...new Set(prospectos.map(p => p.fecha_requerimiento?.slice(0, 7)).filter(Boolean))].sort() as string[]
  const filtrados = (() => {
    let list = filtroEstado ? prospectos.filter(p => p.estado === filtroEstado) : prospectos
    if (filtroFecha) list = list.filter(p => p.fecha_requerimiento?.slice(0, 7) === filtroFecha)
    if (filtroJuzgado) list = list.filter(p => p.juzgado === filtroJuzgado)
    if (filtroMonto) list = list.filter(p => {
      const m = Number(p.monto_deuda) || 0
      if (filtroMonto === 'menos1m') return m < 1_000_000
      if (filtroMonto === '1m5m') return m >= 1_000_000 && m < 5_000_000
      if (filtroMonto === '5m20m') return m >= 5_000_000 && m < 20_000_000
      if (filtroMonto === 'mas20m') return m >= 20_000_000
      return true
    })
    return list
  })()

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F7FA', fontFamily: 'var(--font-inter), sans-serif' }}>

      {/* Navbar */}
      <nav className="border-b" style={{ backgroundColor: azulProfundo, borderColor: '#243B55' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-14 sm:h-16 flex items-center justify-between gap-4">
            <img src="/logo_claro.png" alt="Toro Pacheco & Asociados" className="h-9 sm:h-12 w-auto" />
            <div className="flex items-center gap-2 sm:gap-3">
              <a href="/dashboard"
                className="text-xs sm:text-sm px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
                style={{ color: 'rgba(255,255,255,0.55)' }}>
                ← Dashboard
              </a>
              <button onClick={async () => { await cerrarSesion(); router.push('/login') }}
                className="text-xs sm:text-sm px-3 py-1.5 rounded-lg border transition-colors"
                style={{ borderColor: dorado + '55', color: dorado }}>
                Salir
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">

        {/* Banner */}
        <div className="rounded-2xl p-5 sm:p-6 text-white" style={{ backgroundColor: azulProfundo }}>
          <p className="text-xs font-bold tracking-widest mb-1" style={{ color: dorado }}>PROSPECTOS</p>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            Prospectos Interesados
          </h1>
          <div className="flex flex-wrap gap-5 mt-3">
            {[
              { label: 'Total', n: prospectos.length },
              { label: 'Interesados', n: interesados },
              { label: 'Agendados', n: agendados },
            ].map(s => (
              <div key={s.label}>
                <p className="text-xs opacity-50">{s.label}</p>
                <p className="text-xl font-bold" style={{ color: dorado }}>{s.n}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FILTROS */}
        {prospectos.length > 0 && (
          <div className="flex flex-wrap gap-3 items-center bg-white rounded-2xl border px-4 py-3" style={{ borderColor: '#EDE8DC' }}>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">Todos los estados</option>
              <option value="interesado">Interesado</option>
              <option value="agendado">Agendado</option>
              <option value="cotizacion_enviada">Cotización enviada</option>
              <option value="acepto_cotizacion">Aceptó cotización</option>
              <option value="venta">Venta ✅</option>
            </select>
            <select value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">Cualquier fecha</option>
              {mesesUnicos.map(m => {
                const [y, mo] = m.split('-')
                const label = new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })
                return <option key={m} value={m}>{label}</option>
              })}
            </select>
            <select value={filtroJuzgado} onChange={e => setFiltroJuzgado(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">Cualquier juzgado</option>
              {juzgadosUnicos.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
            <select value={filtroMonto} onChange={e => setFiltroMonto(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">Cualquier monto</option>
              <option value="menos1m">Menos de $1M</option>
              <option value="1m5m">$1M – $5M</option>
              <option value="5m20m">$5M – $20M</option>
              <option value="mas20m">Más de $20M</option>
            </select>
            {(filtroEstado || filtroFecha || filtroJuzgado || filtroMonto) && (
              <button onClick={() => { setFiltroEstado(''); setFiltroFecha(''); setFiltroJuzgado(''); setFiltroMonto('') }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg bg-white transition-colors">
                ✕ Limpiar
              </button>
            )}
          </div>
        )}

        {filtrados.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center" style={{ borderColor: '#EDE8DC' }}>
            <p className="text-3xl mb-3">📋</p>
            <p className="text-sm text-gray-400">
              {prospectos.length === 0
                ? 'No hay prospectos interesados o agendados por el momento.'
                : 'Ningún prospecto coincide con los filtros seleccionados.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#EDE8DC' }}>

            {/* Tabla desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs font-bold tracking-wide"
                    style={{ borderColor: '#EDE8DC', backgroundColor: '#FDFBF5', color: azul }}>
                    <th className="text-left px-4 py-3">Nombre</th>
                    <th className="text-left px-4 py-3">ROL</th>
                    <th className="text-left px-4 py-3">Tribunal</th>
                    <th className="text-left px-4 py-3">Deuda</th>
                    <th className="text-left px-4 py-3">Plazo Fatal</th>
                    <th className="text-left px-4 py-3">Teléfono</th>
                    <th className="text-left px-4 py-3">Estado</th>
                    <th className="text-left px-4 py-3">Llamar</th>
                    <th className="text-left px-4 py-3">Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(p => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors"
                      style={{ borderColor: '#F3F4F6' }}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800">{p.nombre}</p>
                        {p.rut && <p className="text-xs text-gray-400">RUT: {p.rut}</p>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{p.requerimiento || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{p.juzgado || '—'}</td>
                      <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">{fmtMonto(p.monto_deuda)}</td>
                      <td className={`px-4 py-3 text-xs whitespace-nowrap ${plazoColor(p.plazo_fatal)}`}>
                        {fmtFecha(p.plazo_fatal)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.telefono || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${ESTADO_BADGE[p.estado as Estado] ?? 'bg-gray-100 text-gray-600'}`}>
                          {p.estado === 'interesado' ? 'Interesado' : p.estado === 'agendado' ? 'Agendado' : p.estado === 'cotizacion_enviada' ? 'Cotización enviada' : p.estado === 'acepto_cotizacion' ? 'Aceptó cotización' : 'Venta ✅'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtFecha(p.fecha_llamar)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px]">
                        <p className="truncate">{p.observacion || '—'}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards mobile */}
            <div className="lg:hidden divide-y" style={{ borderColor: '#F3F4F6' }}>
              {filtrados.map(p => (
                <div key={p.id} className="p-4 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-semibold text-gray-800">{p.nombre}</p>
                      {p.rut && <p className="text-xs text-gray-400">RUT: {p.rut}</p>}
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${ESTADO_BADGE[p.estado as Estado] ?? 'bg-gray-100 text-gray-600'}`}>
                      {p.estado === 'interesado' ? 'Interesado' : p.estado === 'agendado' ? 'Agendado' : p.estado === 'cotizacion_enviada' ? 'Cotización enviada' : p.estado === 'acepto_cotizacion' ? 'Aceptó cotización' : 'Venta ✅'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    {p.requerimiento && <p>📄 ROL: {p.requerimiento}</p>}
                    {p.juzgado       && <p>🏛 {p.juzgado}</p>}
                    {p.monto_deuda   && <p>💰 {fmtMonto(p.monto_deuda)}</p>}
                    {p.plazo_fatal   && <p className={plazoColor(p.plazo_fatal)}>⚖️ Plazo: {fmtFecha(p.plazo_fatal)}</p>}
                    {p.telefono      && <p>📞 {p.telefono}</p>}
                    {p.fecha_llamar  && <p>📅 Llamar: {fmtFecha(p.fecha_llamar)}</p>}
                    {p.observacion   && <p>📝 {p.observacion}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
