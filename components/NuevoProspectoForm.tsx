'use client'

import { useState, useMemo } from 'react'
import { DatePickerField } from '@/components/DatePickerField'
import { TRIBUNALES } from '@/lib/tribunales'

const azul = '#1F3A5F'
const dorado = '#C7B88A'

type Estado = 'sin_contacto' | 'no_contesta' | 'wsp_enviado' | 'interesado' | 'ya_tiene_abogado' | 'agendado'

const ESTADOS: { value: Estado; label: string }[] = [
  { value: 'sin_contacto',     label: 'Sin contacto' },
  { value: 'no_contesta',      label: 'No contesta' },
  { value: 'wsp_enviado',      label: 'WSP enviado' },
  { value: 'interesado',       label: 'Interesado' },
  { value: 'ya_tiene_abogado', label: 'Ya tiene abogado' },
  { value: 'agendado',         label: 'Agendado' },
]

const FORM_VACÍO = {
  nombre: '', rut: '', telefono: '', email: '',
  requerimiento: '', fecha_requerimiento: '', plazo_fatal: '',
  corte: '', juzgado: '', monto_deuda: '',
  estado: 'sin_contacto' as Estado, observacion: '', fecha_llamar: '',
}

// ── Festivos y plazo fatal ───────────────────────────────────────────
const FESTIVOS_CHILE = new Set([
  '2025-01-01','2025-04-18','2025-04-19','2025-05-01','2025-05-21',
  '2025-06-20','2025-06-23','2025-06-29','2025-06-30',
  '2025-07-16','2025-08-15','2025-09-18','2025-09-19',
  '2025-10-12','2025-10-13','2025-10-31','2025-11-01','2025-11-03',
  '2025-12-08','2025-12-25',
  '2026-01-01','2026-04-03','2026-04-04','2026-05-01','2026-05-21',
  '2026-06-21','2026-06-22','2026-06-29',
  '2026-07-16','2026-08-15','2026-09-18','2026-09-19',
  '2026-10-12','2026-10-31','2026-11-01','2026-11-02',
  '2026-12-08','2026-12-25',
  '2027-01-01','2027-03-26','2027-03-27','2027-05-01','2027-05-21',
  '2027-06-21','2027-06-28','2027-06-29',
  '2027-07-16','2027-08-15','2027-09-18','2027-09-19',
  '2027-10-11','2027-10-12','2027-11-01',
  '2027-12-08','2027-12-25',
])

function calcularPlazoFatal(fecha: string): string {
  if (!fecha) return ''
  const date = new Date(fecha + 'T12:00:00')
  if (isNaN(date.getTime())) return ''
  let diasHabiles = 0
  while (diasHabiles < 8) {
    date.setDate(date.getDate() + 1)
    const iso = date.toISOString().slice(0, 10)
    if (date.getDay() !== 0 && !FESTIVOS_CHILE.has(iso)) diasHabiles++
  }
  return date.toISOString().slice(0, 10)
}

function fmtFecha(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso.slice(0, 10) + 'T12:00:00')
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Formatters ───────────────────────────────────────────────────────
function formatearRUT(raw: string): string {
  const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase().slice(0, 9)
  if (!clean) return ''
  if (clean.length < 8) {
    const parts: string[] = []; let r = clean
    while (r.length > 3) { parts.unshift(r.slice(-3)); r = r.slice(0, -3) }
    parts.unshift(r); return parts.join('.')
  }
  const verif = clean.slice(-1); const body = clean.slice(0, -1)
  const parts: string[] = []; let r = body
  while (r.length > 3) { parts.unshift(r.slice(-3)); r = r.slice(0, -3) }
  parts.unshift(r); return `${parts.join('.')}-${verif}`
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ROL_RE   = /^[A-Z]-\d{1,6}-\d{4}$/

function redondear10k(n: number) { return Math.round(n / 10000) * 10000 }

function calcularPresupuesto(montoDeuda: number) {
  const PIE = 240000
  let presupuesto = montoDeuda * 0.05
  if (presupuesto < 700000) presupuesto = 640000
  presupuesto = redondear10k(presupuesto)
  const saldo = presupuesto - PIE
  let nCuotas = Math.round(saldo / 80000)
  if (nCuotas < 1) nCuotas = 1
  let montoCuota = redondear10k(saldo / nCuotas)
  if (montoCuota < 70000) { nCuotas = Math.max(1, nCuotas - 1); montoCuota = redondear10k(saldo / nCuotas) }
  if (montoCuota > 90000) { nCuotas++; montoCuota = redondear10k(saldo / nCuotas) }
  return { presupuesto, pie: PIE, saldo, nCuotas, montoCuota }
}

function fmtMonto(n: number | null) {
  if (!n) return '—'
  return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
}

// ── Tipos para el ROL ────────────────────────────────────────────────
interface NuevoProspectoFormProps {
  token: string
  onSuccess: () => void
  onCancel: () => void
}

export function NuevoProspectoForm({ token, onSuccess, onCancel }: NuevoProspectoFormProps) {
  const [form, setForm] = useState(FORM_VACÍO)
  const [rolNumero, setRolNumero] = useState('')
  const [anioRol, setAnioRol] = useState(String(new Date().getFullYear()))
  const [editandoAnio, setEditandoAnio] = useState(false)
  const [telefonoDigitos, setTelefonoDigitos] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'

  const presupuestoCalc = useMemo(() => {
    const monto = Number(form.monto_deuda)
    if (!monto || monto <= 0) return null
    return calcularPresupuesto(monto)
  }, [form.monto_deuda])

  async function handleGuardar(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (Object.values(errores).some(Boolean)) return
    setGuardando(true)
    setError('')
    const res = await fetch('/api/prospectos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (data.success) {
      onSuccess()
    } else {
      setError(data.error || 'Error al guardar.')
    }
    setGuardando(false)
  }

  return (
    <div className="bg-white rounded-2xl border p-5 sm:p-7 shadow-sm" style={{ borderColor: '#EDE8DC' }}>
      <h3 className="text-sm font-bold mb-5" style={{ color: azul }}>Nuevo prospecto</h3>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm border bg-red-50 text-red-700 border-red-200">{error}</div>
      )}

      <form onSubmit={handleGuardar}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">

          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Nombre completo *</label>
            <input
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value.toUpperCase() }))}
              required placeholder="JUAN PÉREZ GONZÁLEZ"
              className={inputCls} style={{ textTransform: 'uppercase' }}
            />
          </div>

          {/* RUT */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>RUT</label>
            <input
              value={form.rut}
              onChange={e => setForm(f => ({ ...f, rut: formatearRUT(e.target.value) }))}
              placeholder="12.345.678-9" className={inputCls}
            />
          </div>

          {/* Teléfono — compound +56 */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Teléfono</label>
            <div className="flex items-center w-full border border-gray-200 rounded-lg text-sm focus-within:ring-2 focus-within:ring-blue-400 overflow-hidden bg-white">
              <span className="px-2 py-2 text-gray-400 bg-gray-50 border-r border-gray-200 select-none">+56</span>
              <input
                type="text" inputMode="numeric" maxLength={9}
                value={telefonoDigitos}
                onChange={e => {
                  const d = e.target.value.replace(/\D/g, '').slice(0, 9)
                  setTelefonoDigitos(d)
                  setForm(f => ({ ...f, telefono: d ? `+56 ${d}` : '' }))
                  setErrores(prev => ({ ...prev, telefono: d.length > 0 && d.length < 9 ? 'Ingresa 9 dígitos' : '' }))
                }}
                placeholder="912345678"
                className="flex-1 px-3 py-2 focus:outline-none min-w-0"
              />
            </div>
            {errores.telefono && <p className="mt-1 text-xs text-red-600">{errores.telefono}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Email</label>
            <input
              type="text" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              onBlur={e => setErrores(prev => ({ ...prev, email: e.target.value && !EMAIL_RE.test(e.target.value) ? 'Email inválido' : '' }))}
              placeholder="correo@ejemplo.cl" className={inputCls}
            />
            {errores.email && <p className="mt-1 text-xs text-red-600">{errores.email}</p>}
          </div>

          {/* ROL — compound C-[num]-[año] */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>ROL</label>
            <div className="flex items-center w-full border border-gray-200 rounded-lg text-sm focus-within:ring-2 focus-within:ring-blue-400 overflow-hidden bg-white">
              <span className="px-2.5 py-2 font-medium text-gray-700 bg-gray-50 border-r border-gray-200 select-none">C</span>
              <span className="px-1.5 py-2 text-gray-400 bg-gray-50 select-none">-</span>
              <input
                type="text" inputMode="numeric" maxLength={6}
                value={rolNumero}
                onChange={e => {
                  const num = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setRolNumero(num)
                  setForm(f => ({ ...f, requerimiento: num ? `C-${num}-${anioRol}` : '' }))
                  setErrores(prev => ({ ...prev, rol: '' }))
                }}
                placeholder="1031"
                className="flex-1 px-3 py-2 focus:outline-none min-w-0 text-center"
              />
              <span className="text-gray-400 bg-gray-50 border-l border-gray-200 select-none px-1.5 py-2">-</span>
              {editandoAnio ? (
                <input
                  type="text" inputMode="numeric" maxLength={4} autoFocus
                  value={anioRol}
                  onChange={e => {
                    const a = e.target.value.replace(/\D/g, '').slice(0, 4)
                    setAnioRol(a)
                    setForm(f => ({ ...f, requerimiento: rolNumero ? `C-${rolNumero}-${a}` : '' }))
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
            {errores.rol && <p className="mt-1 text-xs text-red-600">{errores.rol}</p>}
          </div>

          {/* Fecha requerimiento */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Fecha requerimiento</label>
            <DatePickerField
              value={form.fecha_requerimiento}
              onChange={fecha => setForm(f => ({
                ...f,
                fecha_requerimiento: fecha,
                plazo_fatal: fecha ? calcularPlazoFatal(fecha) : '',
              }))}
              placeholder="dd/mm/aaaa"
            />
          </div>

          {/* Plazo fatal — read-only */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>
              Plazo fatal <span className="font-normal opacity-55">(8 días hábiles)</span>
            </label>
            <input
              type="text" readOnly
              value={form.plazo_fatal ? fmtFecha(form.plazo_fatal) : ''}
              placeholder="Se calcula al ingresar fecha"
              className={inputCls + ' cursor-default'}
              style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontWeight: 600 }}
            />
          </div>

          {/* Corte */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Corte de Apelaciones</label>
            <select
              value={form.corte}
              onChange={e => setForm(f => ({ ...f, corte: e.target.value, juzgado: '' }))}
              className={inputCls}
              style={{ color: form.corte ? '#1F2937' : '#9CA3AF' }}
            >
              <option value="">— Selecciona corte —</option>
              {TRIBUNALES.map(g => <option key={g.corte} value={g.corte}>{g.corte}</option>)}
            </select>
          </div>

          {/* Tribunal */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Tribunal</label>
            <select
              value={form.juzgado}
              onChange={e => setForm(f => ({ ...f, juzgado: e.target.value }))}
              disabled={!form.corte}
              className={inputCls}
              style={{ color: form.juzgado ? '#1F2937' : '#9CA3AF', opacity: form.corte ? 1 : 0.5 }}
            >
              <option value="">{form.corte ? '— Selecciona tribunal —' : 'Selecciona primero una corte'}</option>
              {TRIBUNALES.find(g => g.corte === form.corte)?.tribunales.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Monto deuda + presupuesto */}
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Monto deuda ($)</label>
            <input
              type="text" inputMode="numeric"
              value={form.monto_deuda ? Number(form.monto_deuda).toLocaleString('es-CL') : ''}
              onChange={e => {
                const raw = e.target.value.replace(/\./g, '').replace(/[^\d]/g, '')
                setForm(f => ({ ...f, monto_deuda: raw }))
              }}
              placeholder="Ej: 5.000.000" className={inputCls}
            />
            {presupuestoCalc && (
              <div className="mt-2 rounded-xl border p-3 space-y-2" style={{ backgroundColor: '#F0F4FF', borderColor: '#C7D2FE' }}>
                <p className="text-xs font-bold tracking-wide" style={{ color: azul }}>💡 PRESUPUESTO ESTIMADO</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div><span style={{ color: '#6B7280' }}>Honorarios:</span><span className="font-bold ml-1" style={{ color: azul }}>{fmtMonto(presupuestoCalc.presupuesto)}</span></div>
                  <div><span style={{ color: '#6B7280' }}>Pie inicial:</span><span className="font-bold ml-1" style={{ color: dorado }}>{fmtMonto(presupuestoCalc.pie)}</span></div>
                  <div><span style={{ color: '#6B7280' }}>Saldo cuotas:</span><span className="font-bold ml-1" style={{ color: azul }}>{fmtMonto(presupuestoCalc.saldo)}</span></div>
                  <div><span style={{ color: '#6B7280' }}>Cuotas:</span><span className="font-bold ml-1" style={{ color: azul }}>{presupuestoCalc.nCuotas} × {fmtMonto(presupuestoCalc.montoCuota)}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Estado */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Estado *</label>
            <select
              value={form.estado}
              onChange={e => setForm(f => ({ ...f, estado: e.target.value as Estado }))}
              className={inputCls}
            >
              {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>

          {/* Fecha para llamar */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Fecha para llamar</label>
            <DatePickerField
              value={form.fecha_llamar}
              onChange={fecha => setForm(f => ({ ...f, fecha_llamar: fecha }))}
              placeholder="dd/mm/aaaa"
            />
          </div>

          {/* Observación */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Observación</label>
            <textarea
              value={form.observacion}
              onChange={e => setForm(f => ({ ...f, observacion: e.target.value }))}
              rows={2} placeholder="Notas del contacto..."
              className={inputCls + ' resize-none'}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={guardando}
            className="px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors text-white"
            style={{ backgroundColor: azul }}>
            {guardando ? 'Guardando...' : 'Guardar prospecto'}
          </button>
          <button type="button" onClick={onCancel}
            className="px-6 py-2.5 rounded-xl text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
