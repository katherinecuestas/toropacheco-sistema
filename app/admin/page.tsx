'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  verificarAdmin, obtenerEstadisticas, obtenerTodosAbogados, obtenerTodasConsultas,
  crearAbogado, editarAbogado, eliminarAbogado, crearConsulta, editarConsulta, eliminarConsulta,
  obtenerTodosClientes, eliminarCliente,
  obtenerContratosCliente, crearContrato, editarContrato, eliminarContrato,
  obtenerCuotasContrato, crearCuota, editarCuota, eliminarCuota,
  obtenerTimelineContrato, crearEvento, editarEvento, eliminarEvento,
  type Abogado,
} from '@/lib/admin'
import { cerrarSesion } from '@/lib/auth'

type Vista = 'inicio' | 'abogados' | 'consultas' | 'clientes'

const EMPTY_ABOGADO = { email: '', password: '', nombre_negocio: '', telefono: '', is_admin: false }
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
  const [formEditarAbogado, setFormEditarAbogado] = useState({ email: '', nombre_negocio: '', telefono: '', is_admin: false, estado: true })
  const [editandoAbogado, setEditandoAbogado] = useState(false)

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
    const result = await crearAbogado(formCrearAbogado)
    if (result.success) { mostrarMensaje('exito', 'Abogado creado.'); setModalCrearAbogado(false); setFormCrearAbogado(EMPTY_ABOGADO); await recargarBase() }
    else mostrarMensaje('error', result.error || 'Error.')
    setCreandoAbogado(false)
  }

  function abrirEditarAbogado(abogado: Abogado) {
    setAbogadoEditando(abogado)
    setFormEditarAbogado({ email: abogado.email, nombre_negocio: abogado.nombre_negocio, telefono: abogado.telefono || '', is_admin: abogado.is_admin, estado: abogado.estado })
  }

  async function handleEditarAbogado(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!abogadoEditando) return
    setEditandoAbogado(true)
    const result = await editarAbogado({ id: abogadoEditando.id, auth_user_id: abogadoEditando.auth_user_id, ...formEditarAbogado })
    if (result.success) { mostrarMensaje('exito', 'Abogado actualizado.'); setAbogadoEditando(null); await recargarBase() }
    else mostrarMensaje('error', result.error || 'Error.')
    setEditandoAbogado(false)
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Cargando...</p></div>

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const btnPrimary = 'flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50'
  const btnSecondary = 'flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm transition-colors'

  return (
    <div className="min-h-screen bg-gray-50">

      <nav className="bg-gray-900 text-white px-6 h-16 flex items-center justify-between">
        <div><span className="font-bold text-lg">Toropacheco</span><span className="text-gray-400 text-sm ml-2">/ Admin</span></div>
        <div className="flex items-center gap-4">
          {(['inicio', 'abogados', 'consultas', 'clientes'] as Vista[]).map(v => (
            <button key={v} onClick={() => setVista(v)}
              className={`text-sm capitalize ${vista === v ? 'text-white font-medium' : 'text-gray-400 hover:text-white'}`}>
              {v}
            </button>
          ))}
          <button onClick={async () => { await cerrarSesion(); router.push('/login') }}
            className="text-sm bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg">Cerrar sesión</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {mensaje && (
          <div className={`mb-6 p-4 rounded-lg text-sm font-medium ${mensaje.tipo === 'exito' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {mensaje.texto}
          </div>
        )}

        {/* INICIO */}
        {vista === 'inicio' && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Panel de Administración</h1>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {[
                { label: 'Abogados', valor: stats.totalAbogados },
                { label: 'Activos', valor: stats.abogadosActivos },
                { label: 'Consultas', valor: stats.totalConsultas },
                { label: 'Nuevas', valor: stats.consultasNuevas },
                { label: 'Clientes', valor: clientes.length },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{s.valor}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: '👨‍⚖️', titulo: 'Abogados', desc: `${stats.abogadosActivos} activos`, vista: 'abogados' as Vista },
                { icon: '📋', titulo: 'Consultas', desc: `${stats.consultasNuevas} pendientes`, vista: 'consultas' as Vista },
                { icon: '👥', titulo: 'Clientes', desc: `${clientes.length} registrados`, vista: 'clientes' as Vista },
              ].map(card => (
                <button key={card.titulo} onClick={() => setVista(card.vista)}
                  className="bg-white border border-gray-200 rounded-xl p-6 text-left hover:border-blue-300 hover:shadow-md transition-all">
                  <p className="text-2xl mb-2">{card.icon}</p>
                  <h3 className="font-semibold text-gray-900">{card.titulo}</h3>
                  <p className="text-sm text-gray-500 mt-1">{card.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ABOGADOS */}
        {vista === 'abogados' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Abogados</h1>
              <button onClick={() => setModalCrearAbogado(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">+ Nuevo abogado</button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>{['Nombre', 'Email', 'Teléfono', 'Rol', 'Estado', 'Acciones'].map(h => <th key={h} className="text-left px-6 py-3 text-gray-500 font-medium">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {abogados.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{a.nombre_negocio}</td>
                      <td className="px-6 py-4 text-gray-600">{a.email}</td>
                      <td className="px-6 py-4 text-gray-600">{a.telefono || '—'}</td>
                      <td className="px-6 py-4"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.is_admin ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{a.is_admin ? 'Admin' : 'Abogado'}</span></td>
                      <td className="px-6 py-4"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.estado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{a.estado ? 'Activo' : 'Inactivo'}</span></td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => abrirEditarAbogado(a)} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-medium">Editar</button>
                          {!a.is_admin && <button onClick={() => setConfirmarEliminar({ tipo: 'abogado', id: a.id, auth_user_id: a.auth_user_id })} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium">Eliminar</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONSULTAS */}
        {vista === 'consultas' && (
          <div>
            <div className="flex justify-between items-center mb-6">
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
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{consulta.asunto}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{consulta.nombre_cliente} · {consulta.email_cliente}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(consulta.created_at).toLocaleDateString('es-CL')}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
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
          <div className="flex gap-6">

            {/* Lista de clientes */}
            <div className="w-72 flex-shrink-0">
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
                  <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{clienteSeleccionado.nombre}</h2>
                      <p className="text-sm text-gray-500">{clienteSeleccionado.email} {clienteSeleccionado.telefono && `· ${clienteSeleccionado.telefono}`}</p>
                      {clienteSeleccionado.rut && <p className="text-xs text-gray-400 mt-0.5">RUT: {clienteSeleccionado.rut}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setFormContrato(EMPTY_CONTRATO); setModalContrato('crear') }}
                        className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">+ Contrato</button>
                      <button onClick={() => setConfirmarEliminar({ tipo: 'cliente', id: clienteSeleccionado.id, auth_user_id: clienteSeleccionado.auth_user_id })}
                        className="text-sm bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-lg font-medium">Eliminar cliente</button>
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

      {/* MODAL: CREAR/EDITAR ABOGADO */}
      {modalCrearAbogado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-5">Nuevo abogado</h2>
            <form onSubmit={handleCrearAbogado} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label><input type="text" value={formCrearAbogado.nombre_negocio} onChange={e => setFormCrearAbogado({ ...formCrearAbogado, nombre_negocio: e.target.value })} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input type="email" value={formCrearAbogado.email} onChange={e => setFormCrearAbogado({ ...formCrearAbogado, email: e.target.value })} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label><input type="password" value={formCrearAbogado.password} onChange={e => setFormCrearAbogado({ ...formCrearAbogado, password: e.target.value })} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label><input type="tel" value={formCrearAbogado.telefono} onChange={e => setFormCrearAbogado({ ...formCrearAbogado, telefono: e.target.value })} className={inputCls} /></div>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formCrearAbogado.is_admin} onChange={e => setFormCrearAbogado({ ...formCrearAbogado, is_admin: e.target.checked })} className="w-4 h-4" /><span className="text-sm text-gray-700">Es administrador</span></label>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={creandoAbogado} className={btnPrimary}>{creandoAbogado ? 'Creando...' : 'Crear'}</button>
                <button type="button" onClick={() => setModalCrearAbogado(false)} className={btnSecondary}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {abogadoEditando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-5">Editar abogado</h2>
            <form onSubmit={handleEditarAbogado} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input type="email" value={formEditarAbogado.email} onChange={e => setFormEditarAbogado({ ...formEditarAbogado, email: e.target.value })} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label><input type="text" value={formEditarAbogado.nombre_negocio} onChange={e => setFormEditarAbogado({ ...formEditarAbogado, nombre_negocio: e.target.value })} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label><input type="tel" value={formEditarAbogado.telefono} onChange={e => setFormEditarAbogado({ ...formEditarAbogado, telefono: e.target.value })} className={inputCls} /></div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2"><input type="checkbox" checked={formEditarAbogado.is_admin} onChange={e => setFormEditarAbogado({ ...formEditarAbogado, is_admin: e.target.checked })} /><span className="text-sm">Admin</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={formEditarAbogado.estado} onChange={e => setFormEditarAbogado({ ...formEditarAbogado, estado: e.target.checked })} /><span className="text-sm">Activo</span></label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={editandoAbogado} className={btnPrimary}>{editandoAbogado ? 'Guardando...' : 'Guardar'}</button>
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
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label><input type="text" value={formCrearConsulta.nombre_cliente} onChange={e => setFormCrearConsulta({ ...formCrearConsulta, nombre_cliente: e.target.value })} className={inputCls} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input type="email" value={formCrearConsulta.email_cliente} onChange={e => setFormCrearConsulta({ ...formCrearConsulta, email_cliente: e.target.value })} className={inputCls} /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Asunto *</label><input type="text" value={formCrearConsulta.asunto} onChange={e => setFormCrearConsulta({ ...formCrearConsulta, asunto: e.target.value })} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Mensaje *</label><textarea rows={3} value={formCrearConsulta.mensaje} onChange={e => setFormCrearConsulta({ ...formCrearConsulta, mensaje: e.target.value })} className={`${inputCls} resize-none`} /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={creandoConsulta} className={btnPrimary}>{creandoConsulta ? 'Creando...' : 'Crear'}</button>
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
              <div className="grid grid-cols-2 gap-4">
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
                <button type="submit" disabled={editandoConsulta} className={btnPrimary}>{editandoConsulta ? 'Guardando...' : 'Guardar'}</button>
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
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Monto total *</label><input type="number" value={formContrato.monto_total} onChange={e => setFormContrato({ ...formContrato, monto_total: e.target.value })} placeholder="0" className={inputCls} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Pie pagado</label><input type="number" value={formContrato.monto_pie} onChange={e => setFormContrato({ ...formContrato, monto_pie: e.target.value })} placeholder="0" className={inputCls} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Saldo</label><input type="number" value={formContrato.saldo} onChange={e => setFormContrato({ ...formContrato, saldo: e.target.value })} placeholder="0" className={inputCls} /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={guardandoContrato} className={btnPrimary}>{guardandoContrato ? 'Guardando...' : 'Guardar'}</button>
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
                <button type="submit" disabled={guardandoCuota} className={btnPrimary}>{guardandoCuota ? 'Guardando...' : 'Guardar'}</button>
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
                <button type="submit" disabled={guardandoEvento} className={btnPrimary}>{guardandoEvento ? 'Guardando...' : 'Guardar'}</button>
                <button type="button" onClick={() => setModalEvento(null)} className={btnSecondary}>Cancelar</button>
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
