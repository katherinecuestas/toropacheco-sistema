'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { TRIBUNALES } from '@/lib/tribunales'
import { supabase } from '@/lib/supabase'
import { cerrarSesion } from '@/lib/auth'
import { useInactivityLogout } from '@/lib/useInactivityLogout'
import { DatePickerField } from '@/components/DatePickerField'
import { TIPO_LABEL } from '@/components/ProspectoModal'

const azul = '#1F3A5F'
const dorado = '#C7B88A'
const azulProfundo = '#162B46'

type Estado = 'sin_contacto' | 'no_contesta' | 'wsp_enviado' | 'interesado' | 'ya_tiene_abogado' | 'agendado'

const ESTADOS: { value: Estado; label: string }[] = [
  { value: 'sin_contacto',    label: 'Sin contacto' },
  { value: 'no_contesta',     label: 'No contesta' },
  { value: 'wsp_enviado',     label: 'WSP enviado' },
  { value: 'interesado',      label: 'Interesado' },
  { value: 'ya_tiene_abogado',label: 'Ya tiene abogado' },
  { value: 'agendado',        label: 'Agendado' },
]

const ESTADO_LABEL: Record<Estado, string> = Object.fromEntries(ESTADOS.map(e => [e.value, e.label])) as Record<Estado, string>

const ESTADO_COLOR: Record<Estado, { row: string; text: string; badge: string }> = {
  sin_contacto:     { row: 'bg-gray-50',   text: 'text-gray-700',   badge: 'bg-gray-100 text-gray-600' },
  no_contesta:      { row: 'bg-yellow-50', text: 'text-yellow-800', badge: 'bg-yellow-100 text-yellow-700' },
  wsp_enviado:      { row: 'bg-yellow-50', text: 'text-yellow-800', badge: 'bg-yellow-200 text-yellow-800' },
  interesado:       { row: 'bg-green-50',  text: 'text-green-800',  badge: 'bg-green-100 text-green-700' },
  ya_tiene_abogado: { row: 'bg-red-50',    text: 'text-red-800',    badge: 'bg-red-100 text-red-700' },
  agendado:         { row: 'bg-green-50',  text: 'text-green-900',  badge: 'bg-green-200 text-green-800' },
}

const FORM_VACÍO = {
  nombre: '', rut: '', telefono: '', email: '',
  requerimiento: '', fecha_requerimiento: '', plazo_fatal: '', corte: '', juzgado: '', monto_deuda: '',
  estado: 'sin_contacto' as Estado, observacion: '', fecha_llamar: '',
}

const ROL_RE = /^[A-Z]-\d{1,6}-\d{4}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function formatearRUT(raw: string): string {
  const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase().slice(0, 9)
  if (!clean) return ''
  if (clean.length < 8) {
    // Aún ingresando el cuerpo — solo puntos, sin guión verificador
    const parts: string[] = []
    let r = clean
    while (r.length > 3) { parts.unshift(r.slice(-3)); r = r.slice(0, -3) }
    parts.unshift(r)
    return parts.join('.')
  }
  // 8-9 chars: el último es el dígito verificador
  const verif = clean.slice(-1)
  const body  = clean.slice(0, -1)
  const parts: string[] = []
  let r = body
  while (r.length > 3) { parts.unshift(r.slice(-3)); r = r.slice(0, -3) }
  parts.unshift(r)
  return `${parts.join('.')}-${verif}`
}



function redondear10k(n: number) { return Math.round(n / 10000) * 10000 }

function calcularPresupuesto(montoDeuda: number, esFogape: boolean) {
  const PIE = 240000
  let presupuesto = montoDeuda * (esFogape ? 0.10 : 0.05)
  if (presupuesto < 640000) presupuesto = 640000
  presupuesto = redondear10k(presupuesto)
  const saldo = presupuesto - PIE
  let nCuotas = Math.round(saldo / 80000)
  if (nCuotas < 1) nCuotas = 1
  if (nCuotas > 24) nCuotas = 24
  let montoCuota = redondear10k(saldo / nCuotas)
  if (montoCuota < 70000) { nCuotas = Math.max(1, nCuotas - 1); montoCuota = redondear10k(saldo / nCuotas) }
  if (montoCuota > 90000) { nCuotas = Math.min(24, nCuotas + 1); montoCuota = redondear10k(saldo / nCuotas) }
  return { presupuesto, pie: PIE, saldo, nCuotas, montoCuota }
}

const FESTIVOS_CHILE = new Set([
  // 2025
  '2025-01-01', '2025-04-18', '2025-04-19', '2025-05-01', '2025-05-21',
  '2025-06-20', '2025-06-23', '2025-06-29', '2025-06-30',
  '2025-07-16', '2025-08-15', '2025-09-18', '2025-09-19',
  '2025-10-12', '2025-10-13', '2025-10-31', '2025-11-01', '2025-11-03',
  '2025-12-08', '2025-12-25',
  // 2026
  '2026-01-01', '2026-04-03', '2026-04-04', '2026-05-01', '2026-05-21',
  '2026-06-21', '2026-06-22', '2026-06-29',
  '2026-07-16', '2026-08-15', '2026-09-18', '2026-09-19',
  '2026-10-12', '2026-10-31', '2026-11-01', '2026-11-02',
  '2026-12-08', '2026-12-25',
  // 2027
  '2027-01-01', '2027-03-26', '2027-03-27', '2027-05-01', '2027-05-21',
  '2027-06-21', '2027-06-28', '2027-06-29',
  '2027-07-16', '2027-08-15', '2027-09-18', '2027-09-19',
  '2027-10-11', '2027-10-12', '2027-11-01',
  '2027-12-08', '2027-12-25',
  // 2028
  '2028-01-01', '2028-04-14', '2028-04-15', '2028-05-01', '2028-05-21',
  '2028-06-19', '2028-06-21', '2028-06-26', '2028-06-29',
  '2028-07-16', '2028-08-15', '2028-09-18', '2028-09-19',
  '2028-10-09', '2028-10-12', '2028-10-30', '2028-10-31', '2028-11-01',
  '2028-12-08', '2028-12-25',
])

function calcularPlazoFatal(fecha: string): string {
  if (!fecha) return ''
  const date = new Date(fecha + 'T12:00:00')
  if (isNaN(date.getTime())) return ''
  let diasHabiles = 0
  while (diasHabiles < 8) {
    date.setDate(date.getDate() + 1)
    const iso = date.toISOString().slice(0, 10)
    // Cuenta lun–sáb; excluye domingos (0) y festivos chilenos
    if (date.getDay() !== 0 && !FESTIVOS_CHILE.has(iso)) diasHabiles++
  }
  return date.toISOString().slice(0, 10)
}

function plazoInfo(plazo: string | null | undefined): { texto: string; cls: string } | null {
  if (!plazo) return null
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const fecha = new Date(plazo.slice(0, 10) + 'T12:00:00')
  if (isNaN(fecha.getTime())) return null
  const diff = Math.round((fecha.getTime() - hoy.getTime()) / 86400000)
  if (diff < 0) return { texto: 'VENCIDO', cls: 'bg-red-100 text-red-700 font-bold' }
  if (diff === 0) return { texto: 'HOY', cls: 'bg-red-100 text-red-700 font-bold' }
  if (diff <= 2) return { texto: fmtFecha(plazo), cls: 'bg-orange-100 text-orange-700 font-bold' }
  if (diff <= 5) return { texto: fmtFecha(plazo), cls: 'bg-yellow-100 text-yellow-700 font-semibold' }
  return { texto: fmtFecha(plazo), cls: 'bg-green-50 text-green-700' }
}

function fmtMonto(n: number | null) {
  if (!n) return '—'
  return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
}
function fmtFecha(valor: string | null | undefined): string {
  if (!valor) return '—'
  const limpio = String(valor).slice(0, 10)
  const d = new Date(limpio + 'T12:00:00')
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SupervisorDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [supervisor, setSupervisor] = useState<any>(null)
  const [token, setToken] = useState('')
  const [prospectos, setProspectos] = useState<any[]>([])
  const [form, setForm] = useState(FORM_VACÍO)
  const [guardando, setGuardando] = useState(false)
  const [editando, setEditando] = useState<any | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [filtro, setFiltro] = useState<Estado | 'todos'>('todos')
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)

  const [tipificandoId, setTipificandoId] = useState<number | null>(null)
  const [tipMap, setTipMap] = useState<Record<number, any[]>>({})
  const [tipTipo, setTipTipo] = useState('')
  const [tipNota, setTipNota] = useState('')
  const [guardandoTip, setGuardandoTip] = useState(false)

  const [modalPassword, setModalPassword] = useState(false)
  const [formPassword, setFormPassword] = useState({ actual: '', nueva: '', confirmar: '' })
  const [guardandoPassword, setGuardandoPassword] = useState(false)
  const [errPassword, setErrPassword] = useState('')
  const [erroresForm, setErroresForm] = useState<Record<string, string>>({})
  const [rolLetra] = useState('C')
  const [rolNumero, setRolNumero] = useState('')
  const [anioRol, setAnioRol] = useState(String(new Date().getFullYear()))
  const [editandoAnio, setEditandoAnio] = useState(false)
  const [telefonoDigitos, setTelefonoDigitos] = useState('')
  const [fogape, setFogape] = useState(false)
  const [notificaciones, setNotificaciones] = useState<any[]>([])
  const [dropdownNoti, setDropdownNoti] = useState(false)
  const notiRef = useRef<HTMLDivElement>(null)

  useInactivityLogout(() => router.push('/login'))

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setToken(session.access_token)
      const { data: u } = await supabase.from('usuarios').select('id, nombre_negocio, rol').eq('auth_user_id', session.user.id).maybeSingle()
      if (!u || u.rol !== 'supervisor') { router.push('/login'); return }
      setSupervisor(u)
      await cargarProspectos(session.access_token)
      setLoading(false)
    }
    cargar()
  }, [router])

  async function cargarProspectos(tk: string) {
    const res = await fetch('/api/supervisor/prospectos', { headers: { authorization: `Bearer ${tk}` } })
    const data = await res.json()
    if (data.prospectos) setProspectos(data.prospectos)
  }

  function mostrarMensaje(tipo: 'exito' | 'error', texto: string) {
    setMensaje({ tipo, texto })
    setTimeout(() => setMensaje(null), 4000)
  }

  async function handleGuardar(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (Object.values(erroresForm).some(Boolean)) return
    setGuardando(true)
    const body = editando ? { id: editando.id, ...form } : form
    const res = await fetch('/api/supervisor/prospectos', {
      method: editando ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.success || data.prospecto) {
      setForm(FORM_VACÍO); setEditando(null); setMostrarForm(false); setErroresForm({})
      setRolNumero(''); setAnioRol(String(new Date().getFullYear())); setEditandoAnio(false); setTelefonoDigitos(''); setFogape(false)
      await cargarProspectos(token)
      mostrarMensaje('exito', editando ? 'Prospecto actualizado.' : 'Prospecto guardado.')
    } else {
      mostrarMensaje('error', data.error || 'Error al guardar.')
    }
    setGuardando(false)
  }

  async function handleEliminar(id: number) {
    if (!confirm('¿Eliminar este prospecto? Esta acción no se puede deshacer.')) return
    const res = await fetch('/api/supervisor/prospectos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    })
    const data = await res.json()
    if (data.success) { await cargarProspectos(token); mostrarMensaje('exito', 'Prospecto eliminado.') }
    else mostrarMensaje('error', data.error || 'Error al eliminar.')
  }

  function handleEditar(p: any) {
    setEditando(p)
    const fechaReq = (p.fecha_requerimiento ?? '').slice(0, 10)
    const fechaLlamar = (p.fecha_llamar ?? '').slice(0, 10)
    const plazoFatal = (p.plazo_fatal ?? '').slice(0, 10) || calcularPlazoFatal(fechaReq)
    const matchRol = (p.requerimiento ?? '').match(/^([A-Z])-(\d+)-(\d{4})$/)
    setRolNumero(matchRol?.[2] ?? '')
    setAnioRol(matchRol?.[3] ?? String(new Date().getFullYear()))
    setEditandoAnio(false)
    setTelefonoDigitos((p.telefono ?? '').replace(/\D/g, '').replace(/^56/, '').slice(0, 9))
    setForm({
      nombre: p.nombre ?? '', rut: p.rut ?? '', telefono: p.telefono ?? '',
      email: p.email ?? '', requerimiento: p.requerimiento ?? '',
      fecha_requerimiento: fechaReq,
      plazo_fatal: plazoFatal,
      corte: p.corte ?? '', juzgado: p.juzgado ?? '',
      monto_deuda: p.monto_deuda ?? '', estado: p.estado ?? 'sin_contacto',
      observacion: p.observacion ?? '', fecha_llamar: fechaLlamar,
    })
    setErroresForm({})
    setMostrarForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function abrirTipificacion(id: number) {
    if (tipificandoId === id) { setTipificandoId(null); return }
    setTipificandoId(id)
    setTipTipo('')
    setTipNota('')
    if (!tipMap[id]) {
      const res = await fetch(`/api/tipificaciones?prospecto_id=${id}`, {
        headers: { authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.tipificaciones) setTipMap(prev => ({ ...prev, [id]: data.tipificaciones }))
    }
  }

  async function handleCrearTipificacion(prospectoId: number) {
    if (!tipTipo) return
    setGuardandoTip(true)
    const res = await fetch('/api/tipificaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ prospecto_id: prospectoId, tipo: tipTipo, nota: tipTipo === 'otro' ? tipNota : '' }),
    })
    const data = await res.json()
    if (data.success) {
      // Recargar tipificaciones del prospecto
      const res2 = await fetch(`/api/tipificaciones?prospecto_id=${prospectoId}`, {
        headers: { authorization: `Bearer ${token}` },
      })
      const data2 = await res2.json()
      if (data2.tipificaciones) setTipMap(prev => ({ ...prev, [prospectoId]: data2.tipificaciones }))
      setTipTipo('')
      setTipNota('')
      mostrarMensaje('exito', 'Tipificación registrada.')
    } else {
      mostrarMensaje('error', data.error || 'Error al tipificar.')
    }
    setGuardandoTip(false)
  }

  async function handleCambiarPassword(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrPassword('')
    if (formPassword.nueva !== formPassword.confirmar) { setErrPassword('Las contraseñas nuevas no coinciden.'); return }
    if (formPassword.nueva.length < 6) { setErrPassword('La nueva contraseña debe tener al menos 6 caracteres.'); return }
    setGuardandoPassword(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user?.email ?? '', password: formPassword.actual })
    if (signInErr) { setErrPassword('La contraseña actual es incorrecta.'); setGuardandoPassword(false); return }
    const { error } = await supabase.auth.updateUser({ password: formPassword.nueva })
    if (error) { setErrPassword(error.message); setGuardandoPassword(false); return }
    setModalPassword(false)
    setFormPassword({ actual: '', nueva: '', confirmar: '' })
    mostrarMensaje('exito', 'Contraseña actualizada correctamente.')
    setGuardandoPassword(false)
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

  async function cargarNotificaciones(tk: string) {
    const res = await fetch('/api/notificaciones', { headers: { authorization: `Bearer ${tk}` } })
    const data = await res.json()
    if (data.notificaciones) setNotificaciones(data.notificaciones)
  }

  async function marcarLeida(notiId: number) {
    await fetch('/api/notificaciones', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: notiId }),
    })
    setNotificaciones(prev => prev.map(n => n.id === notiId ? { ...n, leida: true } : n))
  }

  async function marcarTodasLeidas() {
    await fetch('/api/notificaciones', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    })
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
  }

  useEffect(() => {
    if (!token) return
    cargarNotificaciones(token)
    const intervalo = setInterval(() => cargarNotificaciones(token), 30000)
    return () => clearInterval(intervalo)
  }, [token])

  useEffect(() => {
    if (!dropdownNoti) return
    function handleClickFuera(e: MouseEvent) {
      if (notiRef.current && !notiRef.current.contains(e.target as Node)) setDropdownNoti(false)
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [dropdownNoti])

  // Calculador automático de presupuesto
  const presupuestoCalc = useMemo(() => {
    const monto = Number(form.monto_deuda)
    if (!monto || monto <= 0) return null
    return calcularPresupuesto(monto, fogape)
  }, [form.monto_deuda, fogape])

  const filtrados = filtro === 'todos' ? prospectos : prospectos.filter(p => p.estado === filtro)
  const conteo = (v: Estado) => prospectos.filter(p => p.estado === v).length

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'
  const noLeidas = notificaciones.filter(n => !n.leida).length

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FDFBF5' }}>
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: azul }} />
    </div>
  )

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F7FA', fontFamily: 'var(--font-inter), sans-serif' }}>

      {/* NAVBAR */}
      <nav className="border-b px-4 sm:px-6 py-3 flex justify-between items-center gap-3"
        style={{ backgroundColor: azulProfundo, borderColor: '#243B55' }}>
        <img src="/logo_claro.png" alt="Toro Pacheco & Asociados" className="h-10 w-auto" />
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden sm:flex items-center gap-2">
            <span className="text-sm text-white opacity-70">{supervisor?.nombre_negocio?.split(' ')[0]}</span>
            <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: dorado + '33', color: dorado }}>SUPERVISOR</span>
          </span>
          <div className="relative" ref={notiRef}>
            <button onClick={() => setDropdownNoti(v => !v)}
              className="relative p-2 rounded-lg hover:opacity-80 transition-opacity"
              style={{ color: 'rgba(255,255,255,0.7)' }}>
              🔔
              {noLeidas > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full bg-red-500 text-white px-1 leading-none">
                  {noLeidas > 9 ? '9+' : noLeidas}
                </span>
              )}
            </button>
            {dropdownNoti && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-bold text-gray-900">Notificaciones</p>
                  {noLeidas > 0 && (
                    <button onClick={marcarTodasLeidas} className="text-xs text-blue-600 hover:underline">
                      Marcar todas como leídas
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {notificaciones.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Sin notificaciones</p>
                  ) : (
                    notificaciones.map(n => (
                      <button key={n.id} onClick={() => marcarLeida(n.id)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${!n.leida ? 'bg-blue-50' : ''}`}>
                        <div className="flex justify-between items-start gap-2">
                          <p className={`text-sm font-semibold leading-tight ${!n.leida ? 'text-gray-900' : 'text-gray-500'}`}>
                            {n.titulo}
                          </p>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0 mt-0.5">
                            {tiempoRelativo(n.created_at)}
                          </span>
                        </div>
                        {n.mensaje && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.mensaje}</p>}
                        {!n.leida && <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-1.5" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <button onClick={() => { setFormPassword({ actual: '', nueva: '', confirmar: '' }); setErrPassword(''); setModalPassword(true) }}
            className="text-xs px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
            style={{ color: 'rgba(255,255,255,0.55)' }}>Contraseña</button>
          <a href="/" className="text-xs px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
            style={{ color: 'rgba(255,255,255,0.55)' }}>← Sitio</a>
          <button onClick={async () => { await cerrarSesion(); router.push('/login') }}
            className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: dorado + '88', color: dorado }}>Cerrar sesión</button>
        </div>
      </nav>

      <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-5">

        {/* Banner */}
        <div className="rounded-2xl p-5 sm:p-6 text-white" style={{ backgroundColor: azulProfundo }}>
          <p className="text-xs font-bold tracking-widest mb-1" style={{ color: dorado }}>PANEL SUPERVISOR</p>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            Hola, {supervisor?.nombre_negocio?.split(' ')[0]} 👋
          </h1>
          <div className="flex flex-wrap gap-5 mt-3">
            {[
              { label: 'Total', n: prospectos.length },
              { label: 'Interesados', n: conteo('interesado') },
              { label: 'Agendados', n: conteo('agendado') },
              { label: 'Sin contactar', n: conteo('sin_contacto') },
            ].map(s => (
              <div key={s.label}>
                <p className="text-xs opacity-50">{s.label}</p>
                <p className="text-xl font-bold" style={{ color: dorado }}>{s.n}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mensaje global */}
        {mensaje && (
          <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${mensaje.tipo === 'exito' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
            {mensaje.texto}
          </div>
        )}

        {/* Cabecera */}
        <div className="flex justify-between items-center">
          <h2 className="text-base font-bold" style={{ color: azul }}>Prospectos</h2>
          <button
            onClick={() => { setMostrarForm(v => !v); if (mostrarForm) { setEditando(null); setForm(FORM_VACÍO) } }}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-colors text-white"
            style={{ backgroundColor: mostrarForm ? '#6B7280' : azul }}>
            {mostrarForm ? '✕ Cerrar' : '+ Nuevo prospecto'}
          </button>
        </div>

        {/* FORMULARIO */}
        {mostrarForm && (
          <div className="bg-white rounded-2xl border p-5 sm:p-7 shadow-sm" style={{ borderColor: '#EDE8DC' }}>
            <h3 className="text-sm font-bold mb-5" style={{ color: azul }}>
              {editando ? `Editando: ${editando.nombre}` : 'Nuevo prospecto'}
            </h3>
            <form onSubmit={handleGuardar}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Nombre completo *</label>
                  <input
                    value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value.toUpperCase() }))}
                    required placeholder="JUAN PÉREZ GONZÁLEZ"
                    className={inputCls}
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>RUT</label>
                  <input
                    value={form.rut}
                    onChange={e => setForm(f => ({ ...f, rut: formatearRUT(e.target.value) }))}
                    placeholder="12.345.678-9" className={inputCls} />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Teléfono</label>
                  <div className="flex items-center w-full border border-gray-200 rounded-lg text-sm focus-within:ring-2 focus-within:ring-blue-400 overflow-hidden bg-white">
                    <span className="px-2 py-2 text-gray-400 bg-gray-50 border-r border-gray-200 select-none whitespace-nowrap">+56</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={9}
                      value={telefonoDigitos}
                      onChange={e => {
                        const d = e.target.value.replace(/\D/g, '').slice(0, 9)
                        setTelefonoDigitos(d)
                        setForm(f => ({ ...f, telefono: d ? `+56 ${d}` : '' }))
                        setErroresForm(prev => ({
                          ...prev,
                          telefono: d.length > 0 && d.length < 9 ? 'Ingresa 9 dígitos' : '',
                        }))
                      }}
                      placeholder="912345678"
                      className="flex-1 px-3 py-2 focus:outline-none min-w-0"
                    />
                  </div>
                  {erroresForm.telefono && <p className="mt-1 text-xs text-red-600">{erroresForm.telefono}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Email</label>
                  <input
                    type="text"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    onBlur={e => setErroresForm(prev => ({
                      ...prev,
                      email: e.target.value && !EMAIL_RE.test(e.target.value) ? 'Formato de email inválido' : '',
                    }))}
                    placeholder="correo@ejemplo.cl" className={inputCls} />
                  {erroresForm.email && <p className="mt-1 text-xs text-red-600">{erroresForm.email}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>ROL</label>
                  <div className="flex items-center w-full border border-gray-200 rounded-lg text-sm focus-within:ring-2 focus-within:ring-blue-400 overflow-hidden bg-white">
                    {/* Letra C — fija */}
                    <span className="px-2.5 py-2 font-medium text-gray-700 bg-gray-50 border-r border-gray-200 select-none">C</span>
                    <span className="px-1.5 py-2 text-gray-400 bg-gray-50 select-none">-</span>
                    {/* Número editable */}
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={rolNumero}
                      onChange={e => {
                        const num = e.target.value.replace(/\D/g, '').slice(0, 6)
                        setRolNumero(num)
                        setForm(f => ({ ...f, requerimiento: num ? `${rolLetra}-${num}-${anioRol}` : '' }))
                        setErroresForm(prev => ({ ...prev, rol: '' }))
                      }}
                      placeholder="1031"
                      className="flex-1 px-3 py-2 focus:outline-none min-w-0 text-center"
                    />
                    {/* Año — fijo por defecto, editable con doble click */}
                    <span className="text-gray-400 bg-gray-50 border-l border-gray-200 select-none whitespace-nowrap px-1.5 py-2">-</span>
                    {editandoAnio ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        autoFocus
                        value={anioRol}
                        onChange={e => {
                          const a = e.target.value.replace(/\D/g, '').slice(0, 4)
                          setAnioRol(a)
                          setForm(f => ({ ...f, requerimiento: rolNumero ? `${rolLetra}-${rolNumero}-${a}` : '' }))
                        }}
                        onBlur={() => setEditandoAnio(false)}
                        className="w-14 py-2 px-1 text-center focus:outline-none bg-gray-50 font-medium text-gray-700"
                      />
                    ) : (
                      <span
                        onDoubleClick={() => setEditandoAnio(true)}
                        title="Doble click para editar el año"
                        className="px-2 py-2 text-gray-400 bg-gray-50 select-none cursor-default"
                      >
                        {anioRol}
                      </span>
                    )}
                  </div>
                  {erroresForm.rol && <p className="mt-1 text-xs text-red-600">{erroresForm.rol}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Fecha requerimiento</label>
                  <DatePickerField
                    value={form.fecha_requerimiento}
                    onChange={fecha => setForm(f => ({
                      ...f,
                      fecha_requerimiento: fecha,
                      plazo_fatal: fecha ? calcularPlazoFatal(fecha) : '',
                    }))}
                    placeholder="Seleccionar fecha"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>
                    Plazo fatal <span className="font-normal opacity-55">(8 días hábiles)</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={form.plazo_fatal ? fmtFecha(form.plazo_fatal) : ''}
                    placeholder="Se calcula al ingresar fecha"
                    className={inputCls + ' cursor-default'}
                    style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontWeight: 600 }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Corte de Apelaciones</label>
                  <select
                    value={form.corte}
                    onChange={e => setForm(f => ({ ...f, corte: e.target.value, juzgado: '' }))}
                    className={inputCls}
                    style={{ color: form.corte ? '#1F2937' : '#9CA3AF' }}>
                    <option value="">— Selecciona corte —</option>
                    {TRIBUNALES.map(g => (
                      <option key={g.corte} value={g.corte}>{g.corte}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Tribunal</label>
                  <select
                    value={form.juzgado}
                    onChange={e => setForm(f => ({ ...f, juzgado: e.target.value }))}
                    disabled={!form.corte}
                    className={inputCls}
                    style={{ color: form.juzgado ? '#1F2937' : '#9CA3AF', opacity: form.corte ? 1 : 0.5 }}>
                    <option value="">{form.corte ? '— Selecciona tribunal —' : 'Selecciona primero una corte'}</option>
                    {TRIBUNALES.find(g => g.corte === form.corte)?.tribunales.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Monto deuda + calculador */}
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Monto deuda ($)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.monto_deuda ? Number(form.monto_deuda).toLocaleString('es-CL') : ''}
                    onChange={e => {
                      const raw = e.target.value.replace(/\./g, '').replace(/[^\d]/g, '')
                      setForm(f => ({ ...f, monto_deuda: raw }))
                    }}
                    placeholder="Ej: 5.000.000"
                    className={inputCls}
                  />
                  <label className="flex items-center gap-2 mt-2 cursor-pointer select-none w-fit">
                    <input
                      type="checkbox"
                      checked={fogape}
                      onChange={e => setFogape(e.target.checked)}
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                    <span className="text-xs font-semibold" style={{ color: azul }}>¿Es crédito FOGAPE?</span>
                  </label>

                  {/* Calculador automático */}
                  {presupuestoCalc && (
                    <div className="mt-2 rounded-xl border p-3 space-y-2" style={{ backgroundColor: '#F0F4FF', borderColor: '#C7D2FE' }}>
                      <p className="text-xs font-bold tracking-wide" style={{ color: azul }}>💡 PRESUPUESTO ESTIMADO</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <div>
                          <span style={{ color: '#6B7280' }}>Honorarios:</span>
                          <span className="font-bold ml-1" style={{ color: azul }}>{fmtMonto(presupuestoCalc.presupuesto)}</span>
                        </div>
                        <div>
                          <span style={{ color: '#6B7280' }}>Pie inicial:</span>
                          <span className="font-bold ml-1" style={{ color: dorado }}>{fmtMonto(presupuestoCalc.pie)}</span>
                        </div>
                        <div>
                          <span style={{ color: '#6B7280' }}>Saldo cuotas:</span>
                          <span className="font-bold ml-1" style={{ color: azul }}>{fmtMonto(presupuestoCalc.saldo)}</span>
                        </div>
                        <div>
                          <span style={{ color: '#6B7280' }}>Cuotas:</span>
                          <span className="font-bold ml-1" style={{ color: azul }}>
                            {presupuestoCalc.nCuotas} × {fmtMonto(presupuestoCalc.montoCuota)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Estado *</label>
                  <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value as Estado }))}
                    className={inputCls}>
                    {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Fecha para llamar</label>
                  <DatePickerField
                    value={form.fecha_llamar}
                    onChange={fecha => setForm(f => ({ ...f, fecha_llamar: fecha }))}
                    placeholder="Seleccionar fecha"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Observación</label>
                  <textarea value={form.observacion} onChange={e => setForm(f => ({ ...f, observacion: e.target.value }))}
                    rows={2} placeholder="Notas del contacto..." className={inputCls + ' resize-none'} />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={guardando}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors text-white"
                  style={{ backgroundColor: azul }}>
                  {guardando ? 'Guardando...' : editando ? 'Actualizar' : 'Guardar prospecto'}
                </button>
                <button type="button"
                  onClick={() => { setMostrarForm(false); setEditando(null); setForm(FORM_VACÍO); setErroresForm({}); setRolNumero(''); setAnioRol(String(new Date().getFullYear())); setEditandoAnio(false); setTelefonoDigitos('') }}
                  className="px-6 py-2.5 rounded-xl text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* FILTROS */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFiltro('todos')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${filtro === 'todos' ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600'}`}
            style={filtro === 'todos' ? { backgroundColor: azul } : {}}>
            Todos ({prospectos.length})
          </button>
          {ESTADOS.map(e => (
            <button key={e.value} onClick={() => setFiltro(e.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${filtro === e.value ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600'}`}
              style={filtro === e.value ? { backgroundColor: azul } : {}}>
              {e.label} ({conteo(e.value)})
            </button>
          ))}
        </div>

        {/* TABLA */}
        {filtrados.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center" style={{ borderColor: '#EDE8DC' }}>
            <p className="text-3xl mb-3">📋</p>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              {filtro === 'todos' ? 'No hay prospectos cargados aún.' : `Sin prospectos con estado "${ESTADO_LABEL[filtro as Estado]}".`}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#EDE8DC' }}>

            {/* Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs font-bold tracking-wide" style={{ borderColor: '#EDE8DC', backgroundColor: '#FDFBF5', color: azul }}>
                    <th className="text-left px-4 py-3">Nombre / Contacto</th>
                    <th className="text-left px-4 py-3">ROL</th>
                    <th className="text-left px-4 py-3">Monto deuda</th>
                    <th className="text-left px-4 py-3">Estado</th>
                    <th className="text-left px-4 py-3">Llamar</th>
                    <th className="text-left px-4 py-3">Observación</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(p => {
                    const col = ESTADO_COLOR[p.estado as Estado] ?? ESTADO_COLOR.sin_contacto
                    return (
                      <React.Fragment key={p.id}>
                      <tr className={`border-b last:border-0 ${col.row}`} style={{ borderColor: '#F3F4F6' }}>
                        <td className="px-4 py-3">
                          <p className={`font-semibold ${col.text}`}>{p.nombre}</p>
                          {p.rut && <p className="text-xs text-gray-400">RUT: {p.rut}</p>}
                          {p.telefono && <p className="text-xs text-gray-500">{p.telefono}</p>}
                          {p.email && <p className="text-xs text-gray-400">{p.email}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-gray-700 font-mono text-xs">{p.requerimiento || '—'}</p>
                          {p.juzgado && <p className="text-xs text-gray-400 mt-0.5">{p.juzgado}</p>}
                          {p.fecha_requerimiento && <p className="text-xs text-gray-400">{fmtFecha(p.fecha_requerimiento)}</p>}
                          {(() => {
                            const pi = plazoInfo(p.plazo_fatal)
                            return pi ? (
                              <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full ${pi.cls}`}>
                                ⚖️ {pi.texto}
                              </span>
                            ) : null
                          })()}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">{fmtMonto(p.monto_deuda)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${col.badge}`}>
                            {ESTADO_LABEL[p.estado as Estado] ?? p.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtFecha(p.fecha_llamar)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px]">
                          <p className="truncate">{p.observacion || '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <button onClick={() => handleEditar(p)}
                              className="text-xs px-2.5 py-1 rounded-lg font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                              Editar
                            </button>
                            <button onClick={() => abrirTipificacion(p.id)}
                              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${tipificandoId === p.id ? 'bg-amber-100 text-amber-700' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}>
                              📋 Tipificar
                            </button>
                          </div>
                        </td>
                      </tr>
                      {tipificandoId === p.id && (
                        <tr key={`tip-${p.id}`}>
                          <td colSpan={8} className="px-4 pb-4 bg-amber-50">
                            <div className="rounded-xl border border-amber-200 bg-white p-4 space-y-3">
                              <p className="text-xs font-bold tracking-wide" style={{ color: azul }}>📋 TIPIFICAR: {p.nombre}</p>
                              <div className="flex flex-wrap gap-2">
                                <select
                                  value={tipTipo}
                                  onChange={e => { setTipTipo(e.target.value); setTipNota('') }}
                                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                  style={{ color: tipTipo ? '#1F2937' : '#9CA3AF', minWidth: 220 }}>
                                  <option value="">— Selecciona tipo —</option>
                                  {Object.entries(TIPO_LABEL).map(([v, l]) => (
                                    <option key={v} value={v}>{l}</option>
                                  ))}
                                </select>
                                {tipTipo === 'otro' && (
                                  <input type="text" maxLength={20} value={tipNota}
                                    onChange={e => setTipNota(e.target.value)}
                                    placeholder="Nota (máx 20 caracteres)"
                                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                  />
                                )}
                                <button onClick={() => handleCrearTipificacion(p.id)}
                                  disabled={guardandoTip || !tipTipo}
                                  className="px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 text-white"
                                  style={{ backgroundColor: azul }}>
                                  {guardandoTip ? '...' : 'Registrar'}
                                </button>
                              </div>
                              {(tipMap[p.id] ?? []).length > 0 && (
                                <div className="space-y-1.5 pt-2 border-t border-amber-100">
                                  <p className="text-xs text-gray-400 font-medium">Historial</p>
                                  {(tipMap[p.id] ?? []).map((t: any) => (
                                    <div key={t.id} className="text-xs flex items-center gap-2 text-gray-600">
                                      <span>📋 {TIPO_LABEL[t.tipo] ?? t.tipo}</span>
                                      {t.nota && <span className="italic text-gray-400">"{t.nota}"</span>}
                                      <span className="text-gray-400">· {new Date(t.created_at).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y" style={{ borderColor: '#F3F4F6' }}>
              {filtrados.map(p => {
                const col = ESTADO_COLOR[p.estado as Estado] ?? ESTADO_COLOR.sin_contacto
                return (
                  <div key={p.id}>
                    <div className={`p-4 space-y-2 ${col.row}`}>
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <p className={`font-semibold truncate ${col.text}`}>{p.nombre}</p>
                          {p.rut && <p className="text-xs text-gray-400">RUT: {p.rut}</p>}
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${col.badge}`}>
                          {ESTADO_LABEL[p.estado as Estado] ?? p.estado}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 space-y-0.5">
                        {p.telefono && <p>📞 {p.telefono}</p>}
                        {p.email && <p>✉️ {p.email}</p>}
                        {p.requerimiento && <p>📄 {p.requerimiento}</p>}
                        {p.juzgado && <p>🏛 {p.juzgado}</p>}
                        {p.monto_deuda && <p>💰 {fmtMonto(p.monto_deuda)}</p>}
                        {p.fecha_llamar && <p>📅 Llamar: {fmtFecha(p.fecha_llamar)}</p>}
                        {(() => {
                          const pi = plazoInfo(p.plazo_fatal)
                          return pi ? <p className={`inline-block px-2 py-0.5 rounded-full text-xs ${pi.cls}`}>⚖️ Plazo: {pi.texto}</p> : null
                        })()}
                        {p.observacion && <p>📝 {p.observacion}</p>}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => handleEditar(p)} className="text-xs px-3 py-1.5 rounded-lg font-medium bg-blue-50 text-blue-600">Editar</button>
                        <button onClick={() => abrirTipificacion(p.id)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${tipificandoId === p.id ? 'bg-amber-200 text-amber-800' : 'bg-amber-50 text-amber-600'}`}>
                          📋 Tipificar
                        </button>
                      </div>
                    </div>
                    {tipificandoId === p.id && (
                      <div className="px-4 pb-4 pt-2 bg-amber-50">
                        <div className="rounded-xl border border-amber-200 bg-white p-4 space-y-3">
                          <p className="text-xs font-bold tracking-wide" style={{ color: azul }}>📋 TIPIFICAR: {p.nombre}</p>
                          <div className="space-y-2">
                            <select
                              value={tipTipo}
                              onChange={e => { setTipTipo(e.target.value); setTipNota('') }}
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                              style={{ color: tipTipo ? '#1F2937' : '#9CA3AF' }}>
                              <option value="">— Selecciona tipo —</option>
                              {Object.entries(TIPO_LABEL).map(([v, l]) => (
                                <option key={v} value={v}>{l}</option>
                              ))}
                            </select>
                            {tipTipo === 'otro' && (
                              <input type="text" maxLength={20} value={tipNota}
                                onChange={e => setTipNota(e.target.value)}
                                placeholder="Nota (máx 20 caracteres)"
                                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                              />
                            )}
                            <button onClick={() => handleCrearTipificacion(p.id)}
                              disabled={guardandoTip || !tipTipo}
                              className="w-full px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 text-white transition-colors"
                              style={{ backgroundColor: azul }}>
                              {guardandoTip ? '...' : 'Registrar'}
                            </button>
                          </div>
                          {(tipMap[p.id] ?? []).length > 0 && (
                            <div className="space-y-1.5 pt-2 border-t border-amber-100">
                              <p className="text-xs text-gray-400 font-medium">Historial</p>
                              {(tipMap[p.id] ?? []).map((t: any) => (
                                <div key={t.id} className="text-xs flex flex-wrap items-start gap-1.5 text-gray-600">
                                  <span>📋 {TIPO_LABEL[t.tipo] ?? t.tipo}</span>
                                  {t.nota && <span className="italic text-gray-400">"{t.nota}"</span>}
                                  <span className="text-gray-400">· {new Date(t.created_at).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Cambiar contraseña */}
      {modalPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900">Cambiar contraseña</h2>
              <button onClick={() => setModalPassword(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            {errPassword && (
              <div className="mb-4 px-4 py-3 rounded-xl text-sm border bg-red-50 text-red-700 border-red-200">{errPassword}</div>
            )}
            <form onSubmit={handleCambiarPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Contraseña actual *</label>
                <input type="password" required value={formPassword.actual}
                  onChange={e => setFormPassword(f => ({ ...f, actual: e.target.value }))}
                  placeholder="Tu contraseña actual" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Nueva contraseña *</label>
                <input type="password" required minLength={6} value={formPassword.nueva}
                  onChange={e => setFormPassword(f => ({ ...f, nueva: e.target.value }))}
                  placeholder="Mínimo 6 caracteres" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Confirmar nueva contraseña *</label>
                <input type="password" required value={formPassword.confirmar}
                  onChange={e => setFormPassword(f => ({ ...f, confirmar: e.target.value }))}
                  placeholder="Repite la nueva contraseña" className={inputCls} />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={guardandoPassword}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 text-white"
                  style={{ backgroundColor: azul }}>
                  {guardandoPassword ? 'Guardando...' : 'Guardar contraseña'}
                </button>
                <button type="button" onClick={() => setModalPassword(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
