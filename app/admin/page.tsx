'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  verificarAdmin, obtenerEstadisticas, obtenerTodosAbogados, obtenerTodasConsultas,
  crearAbogado, editarAbogado, eliminarAbogado, toggleEstadoAbogadoAdmin, cambiarPasswordAbogado,
  crearConsulta, editarConsulta, eliminarConsulta,
  obtenerTodosClientes, eliminarCliente,
  obtenerContratosCliente, crearContrato, editarContrato, eliminarContrato,
  obtenerCuotasContrato, crearCuota, editarCuota, eliminarCuota,
  obtenerTimelineContrato, crearEvento, editarEvento, eliminarEvento,
  type Abogado,
} from '@/lib/admin'
import { cerrarSesion } from '@/lib/auth'

type Vista = 'inicio' | 'abogados' | 'consultas' | 'clientes'

const DOMINIO = 'toropachecoasociados.cl'

function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '')
}

function generarNombreUsuario(nombres: string, apellidoPaterno: string, apellidoMaterno: string): string {
  const primerNombre = norm(nombres.split(/\s+/)[0] || '')
  const inicialPat = norm(apellidoPaterno)[0] || ''
  const inicialMat = norm(apellidoMaterno)[0] || ''
  return primerNombre + inicialPat + inicialMat
}

const EMPTY_ABOGADO = {
  nombres: '', apellido_paterno: '', apellido_materno: '',
  rut: '', dv: '', nombre_usuario: '', email: '', password: '', telefono: '', is_admin: false,
}
const EMPTY_CONSULTA = { abogado_id: '', nombre_cliente: '', email_cliente: '', telefono_cliente: '', asunto: '', mensaje: '', estado: 'nueva' }
const EMPTY_EDITAR_CONSULTA = { nombre_cliente: '', email_cliente: '', telefono_cliente: '', asunto: '', mensaje: '', estado: 'nueva', respuesta: '' }
const EMPTY_CONTRATO = { tipo_servicio: '', descripcion: '', fecha_inicio: new Date().toISOString().split('T')[0], monto_total: '', monto_pie: '', saldo: '' }
const EMPTY_CUOTA = { numero: '', monto: '', fecha_vencimiento: '' }
const EMPTY_EVENTO = { titulo: '', descripcion: '', fecha: new Date().toISOString().split('T')[0], completado: false }

function fmt(n: number) { return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }) }
function fmtFecha(iso: string) { return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }) }

export default function AdminPage() {
  const router = useRouter()
  const [vista, setVista] = useState<Vista>('inicio')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalAbogados: 0, abogadosActivos: 0, totalConsultas: 0, consultasNuevas: 0, consultasRespondidas: 0 })
  const [abogados, setAbogados] = useState<Abogado[]>([])
  const [consultas, setConsultas] = useState<any[]>([])
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)

  // Abogados CRUD
  const [modalCrearAbogado, setModalCrearAbogado] = useState(false)
  const [formCrearAbogado, setFormCrearAbogado] = useState(EMPTY_ABOGADO)
  const [creandoAbogado, setCreandoAbogado] = useState(false)
  const [abogadoEditando, setAbogadoEditando] = useState<Abogado | null>(null)
  const [formEditarAbogado, setFormEditarAbogado] = useState({
    email: '', nombres: '', apellido_paterno: '', apellido_materno: '',
    rut: '', dv: '', nombre_usuario: '', telefono: '', is_admin: false, estado: true,
  })
  const [editandoAbogado, setEditandoAbogado] = useState(false)
  const [modalPassword, setModalPassword] = useState<Abogado | null>(null)
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [guardandoPassword, setGuardandoPassword] = useState(false)
  const [togglandoEstado, setTogglandoEstado] = useState<number | null>(null)

  // Consultas CRUD
  const [modalCrearConsulta, setModalCrearConsulta] = useState(false)
  const [formCrearConsulta, setFormCrearConsulta] = useState(EMPTY_CONSULTA)
  const [creandoConsulta, setCreandoConsulta] = useState(false)
  const [consultaEditando, setConsultaEditando] = useState<any | null>(null)
  const [formEditarConsulta, setFormEditarConsulta] = useState(EMPTY_EDITAR_CONSULTA)
  const [editandoConsulta, setEditandoConsulta] = useState(false)

  // Clientes
  const [clientes, setClientes] = useState<any[]>([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any | null>(null)
  const [contratos, setContratos] = useState<any[]>([])
  const [contratoSeleccionado, setContratoSeleccionado] = useState<any | null>(null)
  const [cuotas, setCuotas] = useState<any[]>([])
  const [timeline, setTimeline] = useState<any[]>([])
  const [tabContrato, setTabContrato] = useState<'cuotas' | 'timeline'>('cuotas')

  // Modales clientes
  const [modalContrato, setModalContrato] = useState<'crear' | 'editar' | null>(null)
  const [formContrato, setFormContrato] = useState(EMPTY_CONTRATO)
  const [guardandoContrato, setGuardandoContrato] = useState(false)
  const [modalCuota, setModalCuota] = useState<'crear' | 'editar' | null>(null)
  const [formCuota, setFormCuota] = useState<any>(EMPTY_CUOTA)
  const [cuotaEditando, setCuotaEditando] = useState<any>(null)
  const [guardandoCuota, setGuardandoCuota] = useState(false)
  const [modalEvento, setModalEvento] = useState<'crear' | 'editar' | null>(null)
  const [formEvento, setFormEvento] = useState<any>(EMPTY_EVENTO)
  const [eventoEditando, setEventoEditando] = useState<any>(null)
  const [guardandoEvento, setGuardandoEvento] = useState(false)

  // Eliminar genérico
  const [confirmarEliminar, setConfirmarEliminar] = useState<{ tipo: string; id: number; auth_user_id?: string } | null>(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => {
    async function cargar() {
      const esAdmin = await verificarAdmin()
      if (!esAdmin) { router.push('/dashboard'); return }
      await recargarBase()
      setLoading(false)
    }
    cargar()
  }, [router])

  async function recargarBase() {
    const [statsData, abogadosData, consultasData, clientesData] = await Promise.all([
      obtenerEstadisticas(),
      obtenerTodosAbogados(),
      obtenerTodasConsultas(),
      obtenerTodosClientes(),
    ])
    setStats(statsData)
    if (abogadosData.abogados) setAbogados(abogadosData.abogados)
    if (consultasData.consultas) setConsultas(consultasData.consultas)
    if (clientesData.clientes) setClientes(clientesData.clientes)
  }

  function mostrarMensaje(tipo: 'exito' | 'error', texto: string) {
    setMensaje({ tipo, texto })
    setTimeout(() => setMensaje(null), 4000)
  }

  async function seleccionarCliente(cliente: any) {
    setClienteSeleccionado(cliente)
    setContratoSeleccionado(null)
    const { contratos: cs } = await obtenerContratosCliente(cliente.id)
    setContratos(cs || [])
  }

  async function seleccionarContrato(contrato: any) {
    setContratoSeleccionado(contrato)
    const [cuotasRes, timelineRes] = await Promise.all([
      obtenerCuotasContrato(contrato.id),
      obtenerTimelineContrato(contrato.id),
    ])
    setCuotas(cuotasRes.cuotas || [])
    setTimeline(timelineRes.eventos || [])
  }

  // --- ABOGADOS ---
  async function handleCrearAbogado(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setCreandoAbogado(true)
    const result = await crearAbogado({
      nombres: formCrearAbogado.nombres,
      apellido_paterno: formCrearAbogado.apellido_paterno,
      apellido_materno: formCrearAbogado.apellido_materno,
      rut: formCrearAbogado.rut,
      dv: formCrearAbogado.dv,
      nombre_usuario: formCrearAbogado.nombre_usuario,
      email: formCrearAbogado.email,
      password: formCrearAbogado.password,
      telefono: formCrearAbogado.telefono,
      is_admin: formCrearAbogado.is_admin,
    })
    if (result.success) { mostrarMensaje('exito', 'Abogado creado.'); setModalCrearAbogado(false); setFormCrearAbogado(EMPTY_ABOGADO); await recargarBase() }
    else mostrarMensaje('error', result.error || 'Error.')
    setCreandoAbogado(false)
  }

  function abrirEditarAbogado(abogado: Abogado) {
    setAbogadoEditando(abogado)
    setFormEditarAbogado({
      email: abogado.email,
      nombres: abogado.nombres || '',
      apellido_paterno: abogado.apellido_paterno || '',
      apellido_materno: abogado.apellido_materno || '',
      rut: abogado.rut || '',
      dv: abogado.dv || '',
      nombre_usuario: abogado.nombre_usuario || '',
      telefono: abogado.telefono || '',
      is_admin: abogado.is_admin,
      estado: abogado.estado,
    })
  }

  async function handleEditarAbogado(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!abogadoEditando) return
    setEditandoAbogado(true)
    const result = await editarAbogado({
      id: abogadoEditando.id,
      auth_user_id: abogadoEditando.auth_user_id,
      ...formEditarAbogado,
    })
    if (result.success) { mostrarMensaje('exito', 'Abogado actualizado.'); setAbogadoEditando(null); await recargarBase() }
    else mostrarMensaje('error', result.error || 'Error.')
    setEditandoAbogado(false)
  }

  async function handleToggleEstado(a: Abogado) {
    setTogglandoEstado(a.id)
    const result = await toggleEstadoAbogadoAdmin(a.id, a.auth_user_id, !a.estado)
    if (result.success) await recargarBase()
    else mostrarMensaje('error', result.error || 'Error al cambiar estado.')
    setTogglandoEstado(null)
  }

  async function handleCambiarPassword(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!modalPassword) return
    setGuardandoPassword(true)
    const result = await cambiarPasswordAbogado(modalPassword.auth_user_id, nuevaPassword)
    if (result.success) { mostrarMensaje('exito', 'Contraseña actualizada.'); setModalPassword(null); setNuevaPassword('') }
    else mostrarMensaje('error', result.error || 'Error al cambiar contraseña.')
    setGuardandoPassword(false)
  }

  // --- CONSULTAS ---
  async function handleCrearConsulta(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setCreandoConsulta(true)
    const result = await crearConsulta({ ...formCrearConsulta, abogado_id: Number(formCrearConsulta.abogado_id) })
    if (result.success) { mostrarMensaje('exito', 'Consulta creada.'); setModalCrearConsulta(false); setFormCrearConsulta(EMPTY_CONSULTA); await recargarBase() }
    else mostrarMensaje('error', result.error || 'Error.')
    setCreandoConsulta(false)
  }

  function abrirEditarConsulta(consulta: any) {
    setConsultaEditando(consulta)
    setFormEditarConsulta({ nombre_cliente: consulta.nombre_cliente, email_cliente: consulta.email_cliente, telefono_cliente: consulta.telefono_cliente || '', asunto: consulta.asunto, mensaje: consulta.mensaje, estado: consulta.estado, respuesta: consulta.respuesta || '' })
  }

  async function handleEditarConsulta(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!consultaEditando) return
    setEditandoConsulta(true)
    const result = await editarConsulta({ id: consultaEditando.id, ...formEditarConsulta })
    if (result.success) { mostrarMensaje('exito', 'Consulta actualizada.'); setConsultaEditando(null); await recargarBase() }
    else mostrarMensaje('error', result.error || 'Error.')
    setEditandoConsulta(false)
  }

  // --- CONTRATOS ---
  async function handleGuardarContrato(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!clienteSeleccionado) return
    setGuardandoContrato(true)
    const datos = { ...formContrato, monto_total: Number(formContrato.monto_total), monto_pie: Number(formContrato.monto_pie), saldo: Number(formContrato.saldo) }
    const result = modalContrato === 'crear'
      ? await crearContrato({ ...datos, cliente_id: clienteSeleccionado.id, abogado_id: abogados[0]?.id })
      : await editarContrato({ id: contratoSeleccionado.id, ...datos, estado: contratoSeleccionado.estado })
    if (result.success) {
      mostrarMensaje('exito', modalContrato === 'crear' ? 'Contrato creado.' : 'Contrato actualizado.')
      setModalContrato(null)
      const { contratos: cs } = await obtenerContratosCliente(clienteSeleccionado.id)
      setContratos(cs || [])
      if (modalContrato === 'editar') await seleccionarContrato({ ...contratoSeleccionado, ...datos })
    } else mostrarMensaje('error', result.error || 'Error.')
    setGuardandoContrato(false)
  }

  // --- CUOTAS ---
  async function handleGuardarCuota(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!contratoSeleccionado) return
    setGuardandoCuota(true)
    const result = modalCuota === 'crear'
      ? await crearCuota({ contrato_id: contratoSeleccionado.id, numero: Number(formCuota.numero), monto: Number(formCuota.monto), fecha_vencimiento: formCuota.fecha_vencimiento })
      : await editarCuota({ id: cuotaEditando.id, monto: Number(formCuota.monto), fecha_vencimiento: formCuota.fecha_vencimiento, fecha_pago: formCuota.fecha_pago || undefined, estado: formCuota.estado })
    if (result.success) {
      mostrarMensaje('exito', 'Cuota guardada.')
      setModalCuota(null)
      const { cuotas: cs } = await obtenerCuotasContrato(contratoSeleccionado.id)
      setCuotas(cs || [])
    } else mostrarMensaje('error', result.error || 'Error.')
    setGuardandoCuota(false)
  }

  // --- TIMELINE ---
  async function handleGuardarEvento(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!contratoSeleccionado) return
    setGuardandoEvento(true)
    const result = modalEvento === 'crear'
      ? await crearEvento({ contrato_id: contratoSeleccionado.id, ...formEvento })
      : await editarEvento({ id: eventoEditando.id, ...formEvento })
    if (result.success) {
      mostrarMensaje('exito', 'Evento guardado.')
      setModalEvento(null)
      const { eventos } = await obtenerTimelineContrato(contratoSeleccionado.id)
      setTimeline(eventos || [])
    } else mostrarMensaje('error', result.error || 'Error.')
    setGuardandoEvento(false)
  }

  // --- ELIMINAR ---
  async function handleEliminar() {
    if (!confirmarEliminar) return
    setEliminando(true)
    let result: any
    if (confirmarEliminar.tipo === 'abogado') result = await eliminarAbogado(confirmarEliminar.id, confirmarEliminar.auth_user_id!)
    else if (confirmarEliminar.tipo === 'consulta') result = await eliminarConsulta(confirmarEliminar.id)
    else if (confirmarEliminar.tipo === 'cliente') result = await eliminarCliente(confirmarEliminar.id, confirmarEliminar.auth_user_id!)
    else if (confirmarEliminar.tipo === 'contrato') result = await eliminarContrato(confirmarEliminar.id)
    else if (confirmarEliminar.tipo === 'cuota') result = await eliminarCuota(confirmarEliminar.id)
    else if (confirmarEliminar.tipo === 'evento') result = await eliminarEvento(confirmarEliminar.id)

    if (result?.success) {
      mostrarMensaje('exito', 'Eliminado correctamente.')
      setConfirmarEliminar(null)
      if (confirmarEliminar.tipo === 'cliente') { setClienteSeleccionado(null); setContratos([]); await recargarBase() }
      else if (confirmarEliminar.tipo === 'contrato') { setContratoSeleccionado(null); const { contratos: cs } = await obtenerContratosCliente(clienteSeleccionado.id); setContratos(cs || []) }
      else if (confirmarEliminar.tipo === 'cuota') { const { cuotas: cs } = await obtenerCuotasContrato(contratoSeleccionado.id); setCuotas(cs || []) }
      else if (confirmarEliminar.tipo === 'evento') { const { eventos } = await obtenerTimelineContrato(contratoSeleccionado.id); setTimeline(eventos || []) }
      else await recargarBase()
    } else mostrarMensaje('error', result?.error || 'Error al eliminar.')
    setEliminando(false)
  }

  const consultasFiltradas = filtroEstado === 'todos' ? consultas : consultas.filter(c => c.estado === filtroEstado)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F7FA' }}>
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: '#1F3A5F' }} />
        <p className="text-sm text-gray-400">Cargando...</p>
      </div>
    </div>
  )

  const azul = '#1F3A5F'
  const dorado = '#C7B88A'
  const azulProfundo = '#162B46'

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const btnPrimary = 'flex-1 font-medium py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 text-white'
  const btnSecondary = 'flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm transition-colors'

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F7FA', fontFamily: 'var(--font-inter), sans-serif' }}>

      {/* Navbar */}
      <nav className="border-b" style={{ backgroundColor: azulProfundo, borderColor: '#243B55' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-14 sm:h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <img src="/logo_claro.png" alt="Toro Pacheco" className="h-9 sm:h-11 w-auto" />
              <span className="text-xs hidden sm:inline px-2 py-0.5 rounded font-semibold" style={{ backgroundColor: dorado + '33', color: dorado }}>ADMIN</span>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto">
              {(['inicio', 'abogados', 'consultas', 'clientes'] as Vista[]).map(v => (
                <button key={v} onClick={() => setVista(v)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap flex-shrink-0 capitalize"
                  style={vista === v
                    ? { backgroundColor: dorado, color: azulProfundo }
                    : { color: 'rgba(255,255,255,0.65)' }}>
                  {v}
                </button>
              ))}
              <button onClick={async () => { await cerrarSesion(); router.push('/login') }}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg border whitespace-nowrap flex-shrink-0 transition-all ml-1"
                style={{ borderColor: '#EF444455', color: '#FCA5A5' }}>
                Salir
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {mensaje && (
          <div className={`mb-6 p-4 rounded-xl text-sm font-medium border ${mensaje.tipo === 'exito' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
            {mensaje.texto}
          </div>
        )}

        {/* INICIO */}
        {vista === 'inicio' && (
          <div>
            {/* Hero */}
            <div className="rounded-2xl p-6 mb-6 text-white" style={{ backgroundColor: azulProfundo }}>
              <p className="text-xs font-bold tracking-widest mb-1" style={{ color: dorado }}>PANEL DE ADMINISTRACIÓN</p>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair), serif' }}>Toro Pacheco &amp; Asociados</h1>
              <p className="text-sm mt-1 opacity-50">Sistema de gestión interno</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              {[
                { label: 'Abogados', valor: stats.totalAbogados, color: azul },
                { label: 'Activos', valor: stats.abogadosActivos, color: '#10B981' },
                { label: 'Consultas', valor: stats.totalConsultas, color: azul },
                { label: 'Nuevas', valor: stats.consultasNuevas, color: dorado },
                { label: 'Clientes', valor: clientes.length, color: azulProfundo },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                  <p className="text-xs text-gray-400 font-medium mb-1">{s.label}</p>
                  <p className="text-3xl font-bold" style={{ color: s.color }}>{s.valor}</p>
                </div>
              ))}
            </div>

            {/* Accesos rápidos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { titulo: 'Abogados', desc: `${stats.abogadosActivos} activos`, vista: 'abogados' as Vista, bg: azul },
                { titulo: 'Consultas', desc: `${stats.consultasNuevas} pendientes`, vista: 'consultas' as Vista, bg: dorado },
                { titulo: 'Clientes', desc: `${clientes.length} registrados`, vista: 'clientes' as Vista, bg: azulProfundo },
              ].map(card => (
                <button key={card.titulo} onClick={() => setVista(card.vista)}
                  className="rounded-xl p-6 text-left text-white transition-all hover:opacity-90 hover:shadow-lg"
                  style={{ backgroundColor: card.bg }}>
                  <h3 className="font-bold text-lg mb-1" style={{ fontFamily: 'var(--font-playfair), serif' }}>{card.titulo}</h3>
                  <p className="text-sm opacity-70">{card.desc}</p>
                  <p className="text-xs mt-3 opacity-50">Ver sección →</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ABOGADOS */}
        {vista === 'abogados' && (
          <div>
            <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Abogados ({abogados.length})</h1>
              <button onClick={() => setModalCrearAbogado(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">+ Nuevo abogado</button>
            </div>

            {abogados.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-400">No hay abogados registrados.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {abogados.map(a => {
                  const nombreCompleto = [a.nombres, a.apellido_paterno, a.apellido_materno].filter(Boolean).join(' ') || a.nombre_negocio
                  const rut = a.rut && a.dv ? `${a.rut}-${a.dv}` : a.rut || '—'
                  const fechaCreacion = new Date(a.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
                  return (
                    <div key={a.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${a.estado ? 'border-gray-200' : 'border-red-200 opacity-75'}`}>
                      {/* Header */}
                      <div className="flex flex-wrap justify-between items-start gap-4 px-5 pt-5 pb-4 border-b border-gray-100">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-bold text-gray-900 text-lg">{nombreCompleto}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.is_admin ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                              {a.is_admin ? 'Admin' : 'Abogado'}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.estado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {a.estado ? 'Activo' : 'Deshabilitado'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400">Creado el {fechaCreacion}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => abrirEditarAbogado(a)}
                            className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-medium">
                            Editar
                          </button>
                          <button onClick={() => { setModalPassword(a); setNuevaPassword('') }}
                            className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium">
                            Contraseña
                          </button>
                          <button
                            onClick={() => handleToggleEstado(a)}
                            disabled={togglandoEstado === a.id || a.is_admin}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${a.estado ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                            {togglandoEstado === a.id ? '...' : a.estado ? 'Deshabilitar' : 'Habilitar'}
                          </button>
                          {!a.is_admin && (
                            <button onClick={() => setConfirmarEliminar({ tipo: 'abogado', id: a.id, auth_user_id: a.auth_user_id })}
                              className="text-xs px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium">
                              Eliminar
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Datos */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3 px-5 py-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Nombres</p>
                          <p className="font-medium text-gray-800">{a.nombres || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Apellido paterno</p>
                          <p className="font-medium text-gray-800">{a.apellido_paterno || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Apellido materno</p>
                          <p className="font-medium text-gray-800">{a.apellido_materno || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">RUT</p>
                          <p className="font-medium text-gray-800 font-mono">{rut}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Usuario</p>
                          <p className="font-medium text-gray-800 font-mono">{a.nombre_usuario ? `${a.nombre_usuario}@${DOMINIO}` : '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Correo electrónico</p>
                          <p className="font-medium text-gray-800 break-all">{a.email}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Teléfono</p>
                          <p className="font-medium text-gray-800">{a.telefono || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Contraseña</p>
                          <p className="text-gray-400 text-xs italic">Usar botón "Contraseña"</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* CONSULTAS */}
        {vista === 'consultas' && (
          <div>
            <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Consultas</h1>
              <div className="flex gap-3">
                <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="todos">Todas ({consultas.length})</option>
                  <option value="nueva">Nuevas ({consultas.filter(c => c.estado === 'nueva').length})</option>
                  <option value="respondida">Respondidas ({consultas.filter(c => c.estado === 'respondida').length})</option>
                  <option value="rechazada">Rechazadas ({consultas.filter(c => c.estado === 'rechazada').length})</option>
                </select>
                <button onClick={() => setModalCrearConsulta(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">+ Nueva</button>
              </div>
            </div>
            <div className="space-y-4">
              {consultasFiltradas.map(consulta => (
                <div key={consulta.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{consulta.asunto}</h3>
                      <p className="text-sm text-gray-500 mt-0.5 truncate">{consulta.nombre_cliente} · {consulta.email_cliente}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(consulta.created_at).toLocaleDateString('es-CL')}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${consulta.estado === 'nueva' ? 'bg-blue-100 text-blue-700' : consulta.estado === 'respondida' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{consulta.estado.toUpperCase()}</span>
                      <button onClick={() => abrirEditarConsulta(consulta)} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-medium">Editar</button>
                      <button onClick={() => setConfirmarEliminar({ tipo: 'consulta', id: consulta.id })} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium">Eliminar</button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{consulta.mensaje}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CLIENTES */}
        {vista === 'clientes' && (
          <div className="flex flex-col lg:flex-row gap-6">

            {/* Lista de clientes */}
            <div className="w-full lg:w-72 lg:flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900 mb-4">Clientes ({clientes.length})</h1>
              <div className="space-y-2">
                {clientes.length === 0 && <p className="text-sm text-gray-400">Sin clientes registrados.</p>}
                {clientes.map(c => (
                  <button key={c.id} onClick={() => seleccionarCliente(c)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${clienteSeleccionado?.id === c.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                    <p className="text-sm font-semibold text-gray-900">{c.nombre}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{c.email}</p>
                    {c.rut && <p className="text-xs text-gray-400">{c.rut}</p>}
                  </button>
                ))}
              </div>
            </div>

            {/* Panel derecho */}
            <div className="flex-1 min-w-0">
              {!clienteSeleccionado ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <p className="text-4xl mb-3">👥</p>
                  <p className="text-gray-500">Selecciona un cliente para ver sus contratos</p>
                </div>
              ) : (
                <div>
                  {/* Header cliente */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 flex flex-wrap justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-bold text-gray-900">{clienteSeleccionado.nombre}</h2>
                      <p className="text-sm text-gray-500 truncate">{clienteSeleccionado.email} {clienteSeleccionado.telefono && `· ${clienteSeleccionado.telefono}`}</p>
                      {clienteSeleccionado.rut && <p className="text-xs text-gray-400 mt-0.5">RUT: {clienteSeleccionado.rut}</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => { setFormContrato(EMPTY_CONTRATO); setModalContrato('crear') }}
                        className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">+ Contrato</button>
                      <button onClick={() => setConfirmarEliminar({ tipo: 'cliente', id: clienteSeleccionado.id, auth_user_id: clienteSeleccionado.auth_user_id })}
                        className="text-sm bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-lg font-medium">Eliminar</button>
                    </div>
                  </div>

                  {/* Lista de contratos */}
                  {contratos.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                      <p className="text-gray-400 text-sm">Sin contratos. Crea uno con el botón de arriba.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 mb-4">
                      {contratos.map(contrato => (
                        <button key={contrato.id} onClick={() => seleccionarContrato(contrato)}
                          className={`w-full text-left p-4 rounded-xl border transition-all ${contratoSeleccionado?.id === contrato.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{contrato.tipo_servicio}</p>
                              <p className="text-xs text-gray-500 mt-0.5">Desde {fmtFecha(contrato.fecha_inicio)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-gray-900">{fmt(contrato.monto_total)}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${contrato.estado === 'activo' ? 'bg-green-100 text-green-700' : contrato.estado === 'completado' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{contrato.estado}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-100 text-xs">
                            <div><span className="text-gray-400">Pie: </span><span className="font-medium">{fmt(contrato.monto_pie)}</span></div>
                            <div><span className="text-gray-400">Saldo: </span><span className="font-medium text-red-600">{fmt(contrato.saldo)}</span></div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Detalle contrato seleccionado */}
                  {contratoSeleccionado && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
                        <div className="flex gap-2">
                          {(['cuotas', 'timeline'] as const).map(t => (
                            <button key={t} onClick={() => setTabContrato(t)}
                              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tabContrato === t ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                              {t === 'cuotas' ? 'Cuotas' : 'Timeline'}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setFormContrato({ tipo_servicio: contratoSeleccionado.tipo_servicio, descripcion: contratoSeleccionado.descripcion || '', fecha_inicio: contratoSeleccionado.fecha_inicio, monto_total: contratoSeleccionado.monto_total, monto_pie: contratoSeleccionado.monto_pie, saldo: contratoSeleccionado.saldo }); setModalContrato('editar') }}
                            className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-medium">Editar contrato</button>
                          <button onClick={() => setConfirmarEliminar({ tipo: 'contrato', id: contratoSeleccionado.id })}
                            className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg font-medium">Eliminar</button>
                          <button onClick={() => { tabContrato === 'cuotas' ? (setFormCuota({ ...EMPTY_CUOTA, numero: cuotas.length + 1 }), setModalCuota('crear')) : (setFormEvento(EMPTY_EVENTO), setModalEvento('crear')) }}
                            className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg font-medium">
                            + {tabContrato === 'cuotas' ? 'Cuota' : 'Etapa'}
                          </button>
                        </div>
                      </div>

                      {/* CUOTAS */}
                      {tabContrato === 'cuotas' && (
                        <div>
                          {cuotas.length === 0 ? (
                            <p className="text-center text-sm text-gray-400 py-8">Sin cuotas. Agrega la primera.</p>
                          ) : cuotas.map(cuota => (
                            <div key={cuota.id} className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50">
                              <div className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${cuota.estado === 'pagada' ? 'bg-green-500' : cuota.estado === 'vencida' ? 'bg-red-500' : 'bg-blue-500'}`}>{cuota.numero}</div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{fmt(cuota.monto)}</p>
                                  <p className="text-xs text-gray-400">Vence: {fmtFecha(cuota.fecha_vencimiento)}{cuota.fecha_pago && ` · Pagado: ${fmtFecha(cuota.fecha_pago)}`}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${cuota.estado === 'pagada' ? 'bg-green-100 text-green-700' : cuota.estado === 'vencida' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{cuota.estado}</span>
                                <button onClick={() => { setCuotaEditando(cuota); setFormCuota({ monto: cuota.monto, fecha_vencimiento: cuota.fecha_vencimiento, fecha_pago: cuota.fecha_pago || '', estado: cuota.estado }); setModalCuota('editar') }}
                                  className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-lg">Editar</button>
                                <button onClick={() => setConfirmarEliminar({ tipo: 'cuota', id: cuota.id })}
                                  className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded-lg">✕</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* TIMELINE */}
                      {tabContrato === 'timeline' && (
                        <div className="p-5">
                          {timeline.length === 0 ? (
                            <p className="text-center text-sm text-gray-400 py-4">Sin etapas. Agrega la primera.</p>
                          ) : (
                            <div className="space-y-3">
                              {timeline.map(evento => (
                                <div key={evento.id} className={`flex gap-3 p-3 rounded-xl border ${evento.completado ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${evento.completado ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>{evento.completado ? '✓' : '○'}</div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900">{evento.titulo}</p>
                                    {evento.descripcion && <p className="text-xs text-gray-500 mt-0.5">{evento.descripcion}</p>}
                                    <p className="text-xs text-gray-400 mt-0.5">{fmtFecha(evento.fecha)}</p>
                                  </div>
                                  <div className="flex gap-1 flex-shrink-0">
                                    <button onClick={() => { setEventoEditando(evento); setFormEvento({ titulo: evento.titulo, descripcion: evento.descripcion || '', fecha: evento.fecha, completado: evento.completado }); setModalEvento('editar') }}
                                      className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-lg">Editar</button>
                                    <button onClick={() => setConfirmarEliminar({ tipo: 'evento', id: evento.id })}
                                      className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded-lg">✕</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* MODAL: CREAR ABOGADO */}
      {modalCrearAbogado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-5">Nuevo abogado</h2>
            <form onSubmit={handleCrearAbogado} className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Datos personales</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombres *</label>
                <input required type="text" placeholder="Ej: Juan Carlos"
                  value={formCrearAbogado.nombres}
                  onChange={e => {
                    const nombres = e.target.value
                    const usuario = generarNombreUsuario(nombres, formCrearAbogado.apellido_paterno, formCrearAbogado.apellido_materno)
                    setFormCrearAbogado({ ...formCrearAbogado, nombres, nombre_usuario: usuario, email: usuario ? `${usuario}@${DOMINIO}` : formCrearAbogado.email })
                  }}
                  className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido paterno *</label>
                  <input required type="text" placeholder="Pérez"
                    value={formCrearAbogado.apellido_paterno}
                    onChange={e => {
                      const ap = e.target.value
                      const usuario = generarNombreUsuario(formCrearAbogado.nombres, ap, formCrearAbogado.apellido_materno)
                      setFormCrearAbogado({ ...formCrearAbogado, apellido_paterno: ap, nombre_usuario: usuario, email: usuario ? `${usuario}@${DOMINIO}` : formCrearAbogado.email })
                    }}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido materno *</label>
                  <input required type="text" placeholder="García"
                    value={formCrearAbogado.apellido_materno}
                    onChange={e => {
                      const am = e.target.value
                      const usuario = generarNombreUsuario(formCrearAbogado.nombres, formCrearAbogado.apellido_paterno, am)
                      setFormCrearAbogado({ ...formCrearAbogado, apellido_materno: am, nombre_usuario: usuario, email: usuario ? `${usuario}@${DOMINIO}` : formCrearAbogado.email })
                    }}
                    className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
                  <input type="text" placeholder="12345678"
                    value={formCrearAbogado.rut}
                    onChange={e => setFormCrearAbogado({ ...formCrearAbogado, rut: e.target.value })}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DV</label>
                  <input type="text" maxLength={1} placeholder="9"
                    value={formCrearAbogado.dv}
                    onChange={e => setFormCrearAbogado({ ...formCrearAbogado, dv: e.target.value })}
                    className={inputCls} />
                </div>
              </div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Acceso al sistema</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario generado</label>
                <div className="flex items-center gap-0 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  <span className="px-3 py-2.5 text-sm font-mono text-gray-800 flex-1">{formCrearAbogado.nombre_usuario || '—'}</span>
                  <span className="px-3 py-2.5 text-xs text-gray-400 bg-gray-100 border-l border-gray-200">@{DOMINIO}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (editable)</label>
                <input required type="email" value={formCrearAbogado.email}
                  onChange={e => setFormCrearAbogado({ ...formCrearAbogado, email: e.target.value })}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                <input required type="password" value={formCrearAbogado.password}
                  onChange={e => setFormCrearAbogado({ ...formCrearAbogado, password: e.target.value })}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input type="tel" value={formCrearAbogado.telefono}
                  onChange={e => setFormCrearAbogado({ ...formCrearAbogado, telefono: e.target.value })}
                  className={inputCls} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={creandoAbogado} className={btnPrimary} style={{ backgroundColor: azul }}>{creandoAbogado ? 'Creando...' : 'Crear abogado'}</button>
                <button type="button" onClick={() => { setModalCrearAbogado(false); setFormCrearAbogado(EMPTY_ABOGADO) }} className={btnSecondary}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR ABOGADO */}
      {abogadoEditando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-5">Editar abogado</h2>
            <form onSubmit={handleEditarAbogado} className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Datos personales</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombres</label>
                <input type="text" placeholder="Ej: Juan Carlos"
                  value={formEditarAbogado.nombres}
                  onChange={e => {
                    const nombres = e.target.value
                    const usuario = generarNombreUsuario(nombres, formEditarAbogado.apellido_paterno, formEditarAbogado.apellido_materno)
                    setFormEditarAbogado({ ...formEditarAbogado, nombres, nombre_usuario: usuario })
                  }}
                  className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido paterno</label>
                  <input type="text"
                    value={formEditarAbogado.apellido_paterno}
                    onChange={e => {
                      const ap = e.target.value
                      const usuario = generarNombreUsuario(formEditarAbogado.nombres, ap, formEditarAbogado.apellido_materno)
                      setFormEditarAbogado({ ...formEditarAbogado, apellido_paterno: ap, nombre_usuario: usuario })
                    }}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido materno</label>
                  <input type="text"
                    value={formEditarAbogado.apellido_materno}
                    onChange={e => {
                      const am = e.target.value
                      const usuario = generarNombreUsuario(formEditarAbogado.nombres, formEditarAbogado.apellido_paterno, am)
                      setFormEditarAbogado({ ...formEditarAbogado, apellido_materno: am, nombre_usuario: usuario })
                    }}
                    className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
                  <input type="text" value={formEditarAbogado.rut}
                    onChange={e => setFormEditarAbogado({ ...formEditarAbogado, rut: e.target.value })}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DV</label>
                  <input type="text" maxLength={1} value={formEditarAbogado.dv}
                    onChange={e => setFormEditarAbogado({ ...formEditarAbogado, dv: e.target.value })}
                    className={inputCls} />
                </div>
              </div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Acceso al sistema</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                <div className="flex items-center gap-0 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  <span className="px-3 py-2.5 text-sm font-mono text-gray-800 flex-1">{formEditarAbogado.nombre_usuario || '—'}</span>
                  <span className="px-3 py-2.5 text-xs text-gray-400 bg-gray-100 border-l border-gray-200">@{DOMINIO}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={formEditarAbogado.email}
                  onChange={e => setFormEditarAbogado({ ...formEditarAbogado, email: e.target.value })}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input type="tel" value={formEditarAbogado.telefono}
                  onChange={e => setFormEditarAbogado({ ...formEditarAbogado, telefono: e.target.value })}
                  className={inputCls} />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2"><input type="checkbox" checked={formEditarAbogado.estado} onChange={e => setFormEditarAbogado({ ...formEditarAbogado, estado: e.target.checked })} /><span className="text-sm">Activo</span></label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={editandoAbogado} className={btnPrimary} style={{ backgroundColor: azul }}>{editandoAbogado ? 'Guardando...' : 'Guardar'}</button>
                <button type="button" onClick={() => setAbogadoEditando(null)} className={btnSecondary}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREAR CONSULTA */}
      {modalCrearConsulta && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-5">Nueva consulta</h2>
            <form onSubmit={handleCrearConsulta} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Abogado *</label>
                <select value={formCrearConsulta.abogado_id} onChange={e => setFormCrearConsulta({ ...formCrearConsulta, abogado_id: e.target.value })} className={inputCls}>
                  <option value="">-- Selecciona --</option>
                  {abogados.filter(a => a.estado).map(a => <option key={a.id} value={a.id}>{a.nombre_negocio}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label><input type="text" value={formCrearConsulta.nombre_cliente} onChange={e => setFormCrearConsulta({ ...formCrearConsulta, nombre_cliente: e.target.value })} className={inputCls} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input type="email" value={formCrearConsulta.email_cliente} onChange={e => setFormCrearConsulta({ ...formCrearConsulta, email_cliente: e.target.value })} className={inputCls} /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Asunto *</label><input type="text" value={formCrearConsulta.asunto} onChange={e => setFormCrearConsulta({ ...formCrearConsulta, asunto: e.target.value })} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Mensaje *</label><textarea rows={3} value={formCrearConsulta.mensaje} onChange={e => setFormCrearConsulta({ ...formCrearConsulta, mensaje: e.target.value })} className={`${inputCls} resize-none`} /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={creandoConsulta} className={btnPrimary} style={{ backgroundColor: azul }}>{creandoConsulta ? 'Creando...' : 'Crear'}</button>
                <button type="button" onClick={() => setModalCrearConsulta(false)} className={btnSecondary}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {consultaEditando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-5">Editar consulta #{consultaEditando.id}</h2>
            <form onSubmit={handleEditarConsulta} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label><input type="text" value={formEditarConsulta.nombre_cliente} onChange={e => setFormEditarConsulta({ ...formEditarConsulta, nombre_cliente: e.target.value })} className={inputCls} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={formEditarConsulta.email_cliente} onChange={e => setFormEditarConsulta({ ...formEditarConsulta, email_cliente: e.target.value })} className={inputCls} /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select value={formEditarConsulta.estado} onChange={e => setFormEditarConsulta({ ...formEditarConsulta, estado: e.target.value })} className={inputCls}>
                  <option value="nueva">Nueva</option><option value="respondida">Respondida</option><option value="rechazada">Rechazada</option>
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Asunto</label><input type="text" value={formEditarConsulta.asunto} onChange={e => setFormEditarConsulta({ ...formEditarConsulta, asunto: e.target.value })} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label><textarea rows={3} value={formEditarConsulta.mensaje} onChange={e => setFormEditarConsulta({ ...formEditarConsulta, mensaje: e.target.value })} className={`${inputCls} resize-none`} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Respuesta</label><textarea rows={3} value={formEditarConsulta.respuesta} onChange={e => setFormEditarConsulta({ ...formEditarConsulta, respuesta: e.target.value })} className={`${inputCls} resize-none`} /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={editandoConsulta} className={btnPrimary} style={{ backgroundColor: azul }}>{editandoConsulta ? 'Guardando...' : 'Guardar'}</button>
                <button type="button" onClick={() => setConsultaEditando(null)} className={btnSecondary}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONTRATO */}
      {modalContrato && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-5">{modalContrato === 'crear' ? 'Nuevo contrato' : 'Editar contrato'}</h2>
            <form onSubmit={handleGuardarContrato} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo de servicio *</label><input type="text" value={formContrato.tipo_servicio} onChange={e => setFormContrato({ ...formContrato, tipo_servicio: e.target.value })} placeholder="Ej: Juicio laboral" className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label><textarea rows={2} value={formContrato.descripcion} onChange={e => setFormContrato({ ...formContrato, descripcion: e.target.value })} className={`${inputCls} resize-none`} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label><input type="date" value={formContrato.fecha_inicio} onChange={e => setFormContrato({ ...formContrato, fecha_inicio: e.target.value })} className={inputCls} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Monto total *</label><input type="number" value={formContrato.monto_total} onChange={e => setFormContrato({ ...formContrato, monto_total: e.target.value })} placeholder="0" className={inputCls} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Pie pagado</label><input type="number" value={formContrato.monto_pie} onChange={e => setFormContrato({ ...formContrato, monto_pie: e.target.value })} placeholder="0" className={inputCls} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Saldo</label><input type="number" value={formContrato.saldo} onChange={e => setFormContrato({ ...formContrato, saldo: e.target.value })} placeholder="0" className={inputCls} /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={guardandoContrato} className={btnPrimary} style={{ backgroundColor: azul }}>{guardandoContrato ? 'Guardando...' : 'Guardar'}</button>
                <button type="button" onClick={() => setModalContrato(null)} className={btnSecondary}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CUOTA */}
      {modalCuota && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-5">{modalCuota === 'crear' ? 'Nueva cuota' : 'Editar cuota'}</h2>
            <form onSubmit={handleGuardarCuota} className="space-y-4">
              {modalCuota === 'crear' && <div><label className="block text-sm font-medium text-gray-700 mb-1">N° cuota</label><input type="number" value={formCuota.numero} onChange={e => setFormCuota({ ...formCuota, numero: e.target.value })} className={inputCls} /></div>}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label><input type="number" value={formCuota.monto} onChange={e => setFormCuota({ ...formCuota, monto: e.target.value })} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha vencimiento *</label><input type="date" value={formCuota.fecha_vencimiento} onChange={e => setFormCuota({ ...formCuota, fecha_vencimiento: e.target.value })} className={inputCls} /></div>
              {modalCuota === 'editar' && (
                <>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha pago</label><input type="date" value={formCuota.fecha_pago} onChange={e => setFormCuota({ ...formCuota, fecha_pago: e.target.value })} className={inputCls} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <select value={formCuota.estado} onChange={e => setFormCuota({ ...formCuota, estado: e.target.value })} className={inputCls}>
                      <option value="pendiente">Pendiente</option><option value="pagada">Pagada</option><option value="vencida">Vencida</option>
                    </select>
                  </div>
                </>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={guardandoCuota} className={btnPrimary} style={{ backgroundColor: azul }}>{guardandoCuota ? 'Guardando...' : 'Guardar'}</button>
                <button type="button" onClick={() => setModalCuota(null)} className={btnSecondary}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EVENTO TIMELINE */}
      {modalEvento && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-5">{modalEvento === 'crear' ? 'Nueva etapa' : 'Editar etapa'}</h2>
            <form onSubmit={handleGuardarEvento} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Título *</label><input type="text" value={formEvento.titulo} onChange={e => setFormEvento({ ...formEvento, titulo: e.target.value })} placeholder="Ej: Presentación de demanda" className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label><textarea rows={2} value={formEvento.descripcion} onChange={e => setFormEvento({ ...formEvento, descripcion: e.target.value })} className={`${inputCls} resize-none`} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label><input type="date" value={formEvento.fecha} onChange={e => setFormEvento({ ...formEvento, fecha: e.target.value })} className={inputCls} /></div>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formEvento.completado} onChange={e => setFormEvento({ ...formEvento, completado: e.target.checked })} className="w-4 h-4 accent-green-600" /><span className="text-sm text-gray-700">Completado</span></label>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={guardandoEvento} className={btnPrimary} style={{ backgroundColor: azul }}>{guardandoEvento ? 'Guardando...' : 'Guardar'}</button>
                <button type="button" onClick={() => setModalEvento(null)} className={btnSecondary}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CAMBIAR CONTRASEÑA */}
      {modalPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Cambiar contraseña</h2>
            <p className="text-sm text-gray-500 mb-4">
              {[modalPassword.nombres, modalPassword.apellido_paterno].filter(Boolean).join(' ') || modalPassword.email}
            </p>
            <form onSubmit={handleCambiarPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña *</label>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={nuevaPassword}
                  onChange={e => setNuevaPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={inputCls}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={guardandoPassword} className={btnPrimary}>
                  {guardandoPassword ? 'Guardando...' : 'Guardar'}
                </button>
                <button type="button" onClick={() => { setModalPassword(null); setNuevaPassword('') }} className={btnSecondary}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINAR */}
      {confirmarEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">¿Confirmar eliminación?</h2>
            <p className="text-sm text-gray-500 mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={handleEliminar} disabled={eliminando} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-xl text-sm disabled:opacity-50">{eliminando ? 'Eliminando...' : 'Sí, eliminar'}</button>
              <button onClick={() => setConfirmarEliminar(null)} className={btnSecondary}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
