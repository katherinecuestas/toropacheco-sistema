'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { obtenerSesion, obtenerDatosAbogado, cerrarSesion } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { obtenerMisConsultas, responderConsulta, rechazarConsulta, type Consulta } from '@/lib/consultas'
import {
  obtenerDisponibilidad,
  guardarDisponibilidad,
  obtenerMisCitas,
  obtenerSlotsDisponibles,
  obtenerFechasBloqueadas,
  toggleFechaBloqueada,
  confirmarCita,
  editarCita,
  cancelarCita,
  DIAS,
  type Cita,
} from '@/lib/citas'

type Vista = 'consultas' | 'citas' | 'horarios' | 'clientes'

export default function DashboardPage() {
  const router = useRouter()
  const [vista, setVista] = useState<Vista>('consultas')
  const [loading, setLoading] = useState(true)
  const [abogado, setAbogado] = useState<any>(null)
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)

  // Consultas
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [consultaActiva, setConsultaActiva] = useState<number | null>(null)
  const [textoRespuesta, setTextoRespuesta] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Citas
  const [citas, setCitas] = useState<Cita[]>([])
  const [filtroCitas, setFiltroCitas] = useState<'proximas' | 'todas'>('proximas')
  const [citaEditando, setCitaEditando] = useState<Cita | null>(null)
  const [formEditarCita, setFormEditarCita] = useState({ fecha: '', slot: '', notas: '', estado: 'confirmada', meeting_url: '' })
  const [slotsEditar, setSlotsEditar] = useState<string[]>([])
  const [cargandoSlotsEditar, setCargandoSlotsEditar] = useState(false)
  const [guardandoCita, setGuardandoCita] = useState(false)
  const [confirmarCancelar, setConfirmarCancelar] = useState<Cita | null>(null)
  const [cancelando, setCancelando] = useState(false)

  // Nueva cita
  const [modalNuevaCita, setModalNuevaCita] = useState(false)
  const [formNuevaCita, setFormNuevaCita] = useState({ nombre: '', email: '', fecha: '', slot: '', meeting_url: '' })
  const [slotsNueva, setSlotsNueva] = useState<string[]>([])
  const [cargandoSlotsNueva, setCargandoSlotsNueva] = useState(false)
  const [agendando, setAgendando] = useState(false)

  // Clientes
  const [misClientes, setMisClientes] = useState<any[]>([])
  const [clienteExpandido, setClienteExpandido] = useState<number | null>(null)
  const [cuotasMap, setCuotasMap] = useState<Record<number, any[]>>({})
  const [modalNuevoCliente, setModalNuevoCliente] = useState(false)
  const [modalEditarCliente, setModalEditarCliente] = useState<any | null>(null)
  const [guardandoCliente, setGuardandoCliente] = useState(false)
  const [formCliente, setFormCliente] = useState({ nombre: '', rut: '', email: '', telefono: '', tipo_servicio: '', descripcion: '', fecha_inicio: '', monto_total: '', monto_pie: '' })
  const [modalNuevaCuota, setModalNuevaCuota] = useState<any | null>(null)
  const [formCuota, setFormCuota] = useState({ numero: '', monto: '', fecha_vencimiento: '' })
  const [guardandoCuota, setGuardandoCuota] = useState(false)
  const [modalComprobante, setModalComprobante] = useState<{ cuota: any; contratoId: number } | null>(null)
  const [formComprobante, setFormComprobante] = useState({ comprobante: '', fecha_pago: '' })
  const [archivoPDF, setArchivoPDF] = useState<File | null>(null)
  const [guardandoComprobante, setGuardandoComprobante] = useState(false)
  const [sesionToken, setSesionToken] = useState<string>('')

  // Horarios
  const [guardandoHorarios, setGuardandoHorarios] = useState(false)
  const [horarios, setHorarios] = useState(
    [1,2,3,4,5,6,7].map(dia => ({ dia_semana: dia, hora_inicio: '09:00', hora_fin: '18:00', activo: dia <= 5 }))
  )

  // Calendario mensual
  const [mesActual, setMesActual] = useState(() => { const h = new Date(); h.setDate(1); return h })
  const [fechasBloqueadas, setFechasBloqueadas] = useState<string[]>([])
  const [togglando, setTogglando] = useState<string | null>(null)

  useEffect(() => {
    async function cargarDatos() {
      const { session } = await obtenerSesion()
      if (!session) { router.push('/login'); return }
      const { abogado: datosAbogado } = await obtenerDatosAbogado()
      if (!datosAbogado || datosAbogado.estado === false) { router.push('/login'); return }
      setAbogado(datosAbogado)
      if (datosAbogado) {
        const [consultasRes, citasRes, disponRes] = await Promise.all([
          obtenerMisConsultas(),
          obtenerMisCitas(datosAbogado.id),
          obtenerDisponibilidad(datosAbogado.id),
        ])
        if (consultasRes.consultas) setConsultas(consultasRes.consultas)
        else if (consultasRes.error) setMensaje({ tipo: 'error', texto: `Error cargando consultas: ${consultasRes.error}` })
        if (citasRes.citas) setCitas(citasRes.citas)
        const bloqueosRes = await obtenerFechasBloqueadas(datosAbogado.id)
        setFechasBloqueadas(bloqueosRes.fechas)

        setSesionToken(session.access_token)
        const clientesRes = await fetch('/api/mis-clientes', {
          headers: { authorization: `Bearer ${session.access_token}` }
        })
        const clientesData = await clientesRes.json()
        if (clientesData.clientes) setMisClientes(clientesData.clientes)

        if (disponRes.disponibilidad && disponRes.disponibilidad.length > 0) {
          setHorarios([1,2,3,4,5,6,7].map(dia => {
            const d = disponRes.disponibilidad!.find(x => x.dia_semana === dia)
            return { dia_semana: dia, hora_inicio: d?.hora_inicio ?? '09:00', hora_fin: d?.hora_fin ?? '18:00', activo: !!d }
          }))
        }
      }
      setLoading(false)
    }
    cargarDatos()
  }, [router])

  function mostrarMensaje(tipo: 'exito' | 'error', texto: string) {
    setMensaje({ tipo, texto })
    setTimeout(() => setMensaje(null), 4000)
  }

  function getFechasDisponibles() {
    const fechas = []
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    for (let i = 0; i <= 60; i++) {
      const d = new Date(hoy)
      d.setDate(hoy.getDate() + i)
      fechas.push(d.toISOString().split('T')[0])
    }
    return fechas
  }

  // --- CONSULTAS ---
  async function handleResponder(consultaId: number) {
    if (!textoRespuesta.trim()) { mostrarMensaje('error', 'La respuesta no puede estar vacía.'); return }
    setEnviando(true)
    const { success, error } = await responderConsulta(consultaId, textoRespuesta, abogado.id)
    if (!success) { mostrarMensaje('error', error || 'Error al guardar respuesta.'); setEnviando(false); return }
    mostrarMensaje('exito', 'Respuesta enviada.')
    setConsultaActiva(null)
    setTextoRespuesta('')
    const { consultas: actualizadas } = await obtenerMisConsultas()
    if (actualizadas) setConsultas(actualizadas)
    setEnviando(false)
    setTimeout(() => setMensaje(null), 4000)
  }

  async function handleRechazar(consultaId: number) {
    setEnviando(true)
    const { success, error } = await rechazarConsulta(consultaId)
    if (success) {
      mostrarMensaje('exito', 'Consulta rechazada.')
      const { consultas: actualizadas } = await obtenerMisConsultas()
      if (actualizadas) setConsultas(actualizadas)
    } else {
      mostrarMensaje('error', error || 'Error al rechazar.')
    }
    setEnviando(false)
    setTimeout(() => setMensaje(null), 4000)
  }

  // --- CITAS: NUEVA ---
  async function handleFechaNueva(fecha: string) {
    setFormNuevaCita(f => ({ ...f, fecha, slot: '' }))
    if (!fecha) return
    setCargandoSlotsNueva(true)
    const { slots } = await obtenerSlotsDisponibles(abogado.id, fecha)
    setSlotsNueva(slots)
    setCargandoSlotsNueva(false)
  }

  async function handleCrearCita(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!formNuevaCita.nombre || !formNuevaCita.email || !formNuevaCita.fecha || !formNuevaCita.slot) {
      mostrarMensaje('error', 'Completa todos los campos y selecciona un horario.')
      return
    }
    setAgendando(true)
    const res = await fetch('/api/crear-cita', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consultaId: null,
        abogadoId: abogado.id,
        nombreCliente: formNuevaCita.nombre,
        emailCliente: formNuevaCita.email,
        fechaHora: `${formNuevaCita.fecha}T${formNuevaCita.slot}:00`,
        meetingUrl: formNuevaCita.meeting_url || undefined,
      }),
    })
    const resultado = await res.json()
    if (resultado.success) {
      mostrarMensaje('exito', formNuevaCita.meeting_url ? 'Cita agendada y enlace enviado al cliente.' : 'Cita agendada. Recuerda agregar el enlace de la reunión.')
      setModalNuevaCita(false)
      setFormNuevaCita({ nombre: '', email: '', fecha: '', slot: '', meeting_url: '' })
      setSlotsNueva([])
      const { citas: nuevasCitas } = await obtenerMisCitas(abogado.id)
      if (nuevasCitas) setCitas(nuevasCitas)
    } else {
      mostrarMensaje('error', resultado.error || 'Error al agendar.')
    }
    setAgendando(false)
  }

  // --- CITAS: EDITAR ---
  async function handleFechaEditar(fecha: string) {
    setFormEditarCita(f => ({ ...f, fecha, slot: '' }))
    if (!fecha) return
    setCargandoSlotsEditar(true)
    const { slots } = await obtenerSlotsDisponibles(abogado.id, fecha)
    setSlotsEditar(slots)
    setCargandoSlotsEditar(false)
  }

  function abrirEditarCita(cita: Cita) {
    const fecha = cita.fecha_hora.split('T')[0]
    const hora = new Date(cita.fecha_hora)
    const slot = `${String(hora.getHours()).padStart(2, '0')}:${String(hora.getMinutes()).padStart(2, '0')}`
    setCitaEditando(cita)
    setFormEditarCita({ fecha, slot, notas: cita.notas || '', estado: cita.estado, meeting_url: cita.meeting_url || '' })
    setSlotsEditar([slot])
  }

  async function handleEditarCita(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!citaEditando || !formEditarCita.fecha || !formEditarCita.slot) return
    setGuardandoCita(true)
    const result = await editarCita(citaEditando.id, {
      fecha_hora: `${formEditarCita.fecha}T${formEditarCita.slot}:00`,
      notas: formEditarCita.notas,
      estado: formEditarCita.estado,
      meeting_url: formEditarCita.meeting_url || undefined,
    })
    if (result.success) {
      mostrarMensaje('exito', 'Cita actualizada.')
      setCitaEditando(null)
      const { citas: nuevasCitas } = await obtenerMisCitas(abogado.id)
      if (nuevasCitas) setCitas(nuevasCitas)
    } else {
      mostrarMensaje('error', result.error || 'Error al editar.')
    }
    setGuardandoCita(false)
  }

  // --- CITAS: CONFIRMAR ---
  async function handleConfirmarCita(cita: Cita) {
    const result = await confirmarCita(cita.id)
    if (result.success) {
      mostrarMensaje('exito', `Cita confirmada. Se envió correo a ${cita.email_cliente}.`)
      const { citas: nuevasCitas } = await obtenerMisCitas(abogado.id)
      if (nuevasCitas) setCitas(nuevasCitas)
    } else {
      mostrarMensaje('error', result.error || 'Error al confirmar.')
    }
  }

  // --- CITAS: CANCELAR ---
  async function handleCancelarCita() {
    if (!confirmarCancelar) return
    setCancelando(true)
    const result = await cancelarCita(confirmarCancelar.id)
    if (result.success) {
      mostrarMensaje('exito', 'Cita cancelada.')
      setConfirmarCancelar(null)
      const { citas: nuevasCitas } = await obtenerMisCitas(abogado.id)
      if (nuevasCitas) setCitas(nuevasCitas)
    } else {
      mostrarMensaje('error', result.error || 'Error al cancelar.')
    }
    setCancelando(false)
  }

  // --- CALENDARIO ---
  async function handleToggleFecha(fechaISO: string) {
    setTogglando(fechaISO)
    const bloqueada = fechasBloqueadas.includes(fechaISO)
    const result = await toggleFechaBloqueada(abogado.id, fechaISO, bloqueada)
    if (result.success) {
      setFechasBloqueadas(prev =>
        bloqueada ? prev.filter(f => f !== fechaISO) : [...prev, fechaISO]
      )
    }
    setTogglando(null)
  }

  function getDiasMes(mes: Date) {
    const año = mes.getFullYear()
    const m = mes.getMonth()
    const primerDia = new Date(año, m, 1)
    const ultimoDia = new Date(año, m + 1, 0)
    // Offset para que empiece en lunes (0=dom→6, 1=lun→0)
    const offset = (primerDia.getDay() + 6) % 7
    const dias: (Date | null)[] = Array(offset).fill(null)
    for (let d = 1; d <= ultimoDia.getDate(); d++) {
      dias.push(new Date(año, m, d))
    }
    return dias
  }

  // --- CLIENTES ---
  async function recargarClientes() {
    const res = await fetch('/api/mis-clientes', { headers: { authorization: `Bearer ${sesionToken}` } })
    const data = await res.json()
    if (data.clientes) setMisClientes(data.clientes)
  }

  async function cargarCuotas(contratoId: number) {
    const res = await fetch(`/api/mis-cuotas?contrato_id=${contratoId}`)
    const data = await res.json()
    setCuotasMap(prev => ({ ...prev, [contratoId]: data.cuotas ?? [] }))
  }

  async function handleExpandir(contratoId: number) {
    if (clienteExpandido === contratoId) { setClienteExpandido(null); return }
    setClienteExpandido(contratoId)
    await cargarCuotas(contratoId)
  }

  async function handleCrearCliente(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setGuardandoCliente(true)
    const res = await fetch('/api/mis-clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${sesionToken}` },
      body: JSON.stringify({ ...formCliente, monto_total: Number(formCliente.monto_total), monto_pie: Number(formCliente.monto_pie) }),
    })
    const data = await res.json()
    if (data.success) {
      setModalNuevoCliente(false)
      setFormCliente({ nombre: '', rut: '', email: '', telefono: '', tipo_servicio: '', descripcion: '', fecha_inicio: '', monto_total: '', monto_pie: '' })
      await recargarClientes()
      mostrarMensaje('exito', 'Cliente creado correctamente.')
    } else {
      mostrarMensaje('error', data.error || 'Error al crear cliente.')
    }
    setGuardandoCliente(false)
  }

  async function handleEditarCliente(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!modalEditarCliente) return
    setGuardandoCliente(true)
    const res = await fetch('/api/mis-clientes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${sesionToken}` },
      body: JSON.stringify({
        contrato_id: modalEditarCliente.id,
        cliente_id: modalEditarCliente.clientes.id,
        ...formCliente,
        monto_total: Number(formCliente.monto_total),
        monto_pie: Number(formCliente.monto_pie),
      }),
    })
    const data = await res.json()
    if (data.success) {
      setModalEditarCliente(null)
      await recargarClientes()
      mostrarMensaje('exito', 'Cliente actualizado.')
    } else {
      mostrarMensaje('error', data.error || 'Error al actualizar.')
    }
    setGuardandoCliente(false)
  }

  async function handleEliminarCliente(contratoId: number, clienteId: number) {
    if (!confirm('¿Eliminar este cliente y su contrato?')) return
    await fetch('/api/mis-clientes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${sesionToken}` },
      body: JSON.stringify({ contrato_id: contratoId, cliente_id: clienteId }),
    })
    await recargarClientes()
    mostrarMensaje('exito', 'Cliente eliminado.')
  }

  async function handleCrearCuota(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!modalNuevaCuota) return
    setGuardandoCuota(true)
    const contratoId = modalNuevaCuota.id
    const res = await fetch('/api/mis-cuotas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contrato_id: contratoId, numero: Number(formCuota.numero), monto: Number(formCuota.monto), fecha_vencimiento: formCuota.fecha_vencimiento }),
    })
    const data = await res.json()
    if (data.success) {
      setModalNuevaCuota(null)
      setFormCuota({ numero: '', monto: '', fecha_vencimiento: '' })
      await cargarCuotas(contratoId)
      await recargarClientes()
      mostrarMensaje('exito', 'Cuota agregada.')
    } else {
      mostrarMensaje('error', data.error || 'Error al agregar cuota.')
    }
    setGuardandoCuota(false)
  }

  async function handlePagarCuota(cuota: any, contratoId: number) {
    if (cuota.estado === 'pagada') {
      // Desmarcar como pagada directamente
      await fetch('/api/mis-cuotas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cuota.id, contrato_id: contratoId, estado: 'pendiente', fecha_pago: null, comprobante: null, monto: cuota.monto }),
      })
      await cargarCuotas(contratoId)
      await recargarClientes()
    } else {
      setFormComprobante({ comprobante: '', fecha_pago: new Date().toISOString().split('T')[0] })
      setModalComprobante({ cuota, contratoId })
    }
  }

  async function handleConfirmarPago(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!modalComprobante) return
    setGuardandoComprobante(true)

    let comprobanteUrl: string | null = null
    if (archivoPDF) {
      const ext = archivoPDF.name.split('.').pop()
      const path = `cuota-${modalComprobante.cuota.id}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('comprobantes')
        .upload(path, archivoPDF, { upsert: true })
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(path)
        comprobanteUrl = urlData.publicUrl
      }
    }

    await fetch('/api/mis-cuotas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: modalComprobante.cuota.id,
        contrato_id: modalComprobante.contratoId,
        estado: 'pagada',
        fecha_pago: formComprobante.fecha_pago,
        comprobante: formComprobante.comprobante,
        comprobante_url: comprobanteUrl,
        monto: modalComprobante.cuota.monto,
      }),
    })
    await cargarCuotas(modalComprobante.contratoId)
    await recargarClientes()
    setModalComprobante(null)
    setArchivoPDF(null)
    setGuardandoComprobante(false)
    mostrarMensaje('exito', 'Cuota marcada como pagada.')
  }


  async function handleEliminarCuota(cuotaId: number, contratoId: number) {
    await fetch('/api/mis-cuotas', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cuotaId }),
    })
    await cargarCuotas(contratoId)
  }

  // --- HORARIOS ---
  async function handleGuardarHorarios() {
    setGuardandoHorarios(true)
    const { success, error } = await guardarDisponibilidad(abogado.id, horarios)
    mostrarMensaje(success ? 'exito' : 'error', success ? 'Horarios guardados.' : error || 'Error al guardar.')
    setGuardandoHorarios(false)
    setTimeout(() => setMensaje(null), 4000)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-lg text-gray-600">Cargando...</p></div>

  const consultasNuevas = consultas.filter(c => c.estado === 'nueva')
  const consultasRespondidas = consultas.filter(c => c.estado === 'respondida')
  const ahora = new Date()
  const citasFiltradas = filtroCitas === 'proximas'
    ? citas.filter(c => new Date(c.fecha_hora) >= ahora && c.estado !== 'cancelada')
    : citas

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  const azul = '#1F3A5F'
  const dorado = '#C7B88A'
  const azulProfundo = '#162B46'

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F7FA', fontFamily: 'var(--font-inter), sans-serif' }}>

      {/* Navbar */}
      <nav className="border-b" style={{ backgroundColor: azulProfundo, borderColor: '#243B55' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-14 sm:h-16 flex items-center justify-between gap-4">
            <div className="flex-shrink-0">
              <img src="/logo_claro.png" alt="Toro Pacheco & Asociados" className="h-9 sm:h-12 w-auto" />
            </div>
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
              {(['consultas', 'citas', 'clientes', 'horarios'] as Vista[]).map(v => (
                <button key={v} onClick={() => setVista(v)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap flex-shrink-0"
                  style={vista === v
                    ? { backgroundColor: dorado, color: azulProfundo }
                    : { color: 'rgba(255,255,255,0.65)' }}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
              {abogado?.is_admin && (
                <a href="/admin"
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap flex-shrink-0 transition-all"
                  style={{ color: 'rgba(255,255,255,0.65)' }}>
                  Admin
                </a>
              )}
              <button onClick={async () => { await cerrarSesion(); router.push('/login') }}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg border whitespace-nowrap flex-shrink-0 transition-all"
                style={{ borderColor: dorado + '55', color: dorado }}>
                Salir
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">

        {mensaje && (
          <div className={`mb-6 p-4 rounded-xl text-sm font-medium border ${mensaje.tipo === 'exito' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
            {mensaje.texto}
          </div>
        )}

        {/* Bienvenida */}
        <div className="rounded-2xl p-5 sm:p-6 mb-6 text-white" style={{ backgroundColor: azulProfundo }}>
          <p className="text-xs font-bold tracking-widest mb-1" style={{ color: dorado }}>PANEL DEL ABOGADO</p>
          <h2 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            Bienvenido, {abogado?.nombres?.split(' ')[0] ?? abogado?.nombre?.split(' ')[0] ?? abogado?.nombre_negocio?.split(' ')[0]}
          </h2>
          <p className="text-sm mt-1 opacity-60">{abogado?.email}</p>
        </div>

        {/* VISTA: CONSULTAS */}
        {vista === 'consultas' && (<>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl p-6 text-white" style={{ backgroundColor: azul }}>
              <p className="text-xs font-bold tracking-widest opacity-70 mb-1">NUEVAS</p>
              <p className="text-4xl font-bold">{consultasNuevas.length}</p>
              <p className="text-sm opacity-60 mt-1">Consultas por revisar</p>
            </div>
            <div className="rounded-xl p-6" style={{ backgroundColor: dorado }}>
              <p className="text-xs font-bold tracking-widest mb-1" style={{ color: azulProfundo, opacity: 0.7 }}>RESPONDIDAS</p>
              <p className="text-4xl font-bold" style={{ color: azulProfundo }}>{consultasRespondidas.length}</p>
              <p className="text-sm mt-1" style={{ color: azulProfundo, opacity: 0.6 }}>Atendidas</p>
            </div>
            <div className="rounded-xl p-6 text-white border" style={{ backgroundColor: azulProfundo, borderColor: '#243B55' }}>
              <p className="text-xs font-bold tracking-widest opacity-70 mb-1">TOTAL</p>
              <p className="text-4xl font-bold">{consultas.length}</p>
              <p className="text-sm opacity-60 mt-1">Consultas recibidas</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-6" style={{ borderColor: '#EDE8DC' }}>
            <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-playfair), serif', color: azul }}>Consultas Recibidas</h3>
            <div className="w-10 h-0.5 mb-6" style={{ backgroundColor: dorado }} />
            {consultas.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No hay consultas todavía.</p>
            ) : (
              <div className="space-y-4">
                {consultas.map(consulta => (
                  <div key={consulta.id} className="border rounded-xl p-5 transition-all"
                    style={consulta.estado === 'nueva'
                      ? { borderColor: '#C7B88A55', backgroundColor: '#FDFBF5' }
                      : consulta.estado === 'respondida'
                        ? { borderColor: '#D1FAE5', backgroundColor: '#F0FDF4' }
                        : { borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}>
                    <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-lg">{consulta.asunto}</h4>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {consulta.nombre_cliente} · {consulta.email_cliente}
                          {consulta.telefono_cliente && ` · ${consulta.telefono_cliente}`}
                        </p>
                      </div>
                      <span className="shrink-0 px-3 py-1 rounded-full text-xs font-bold"
                        style={consulta.estado === 'nueva'
                          ? { backgroundColor: '#C7B88A22', color: '#8B6914' }
                          : consulta.estado === 'respondida'
                            ? { backgroundColor: '#D1FAE5', color: '#065F46' }
                            : { backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                        {consulta.estado.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-3">{consulta.mensaje}</p>
                    <p className="text-xs text-gray-400">Recibida: {new Date(consulta.created_at).toLocaleString('es-CL')}</p>
                    {consulta.respuesta && (
                      <div className="mt-4 pt-4 border-t border-green-200">
                        <p className="text-sm font-semibold text-green-800 mb-1">Tu respuesta:</p>
                        <p className="text-gray-700 text-sm">{consulta.respuesta}</p>
                      </div>
                    )}
                    {consulta.estado === 'nueva' && (
                      <div className="mt-4">
                        {consultaActiva === consulta.id ? (
                          <div className="space-y-3">
                            <textarea className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={4}
                              placeholder="Escribe tu respuesta aquí..." value={textoRespuesta} onChange={e => setTextoRespuesta(e.target.value)} />
                            <div className="flex gap-2">
                              <button onClick={() => handleResponder(consulta.id)} disabled={enviando}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                                {enviando ? 'Enviando...' : 'Enviar respuesta'}
                              </button>
                              <button onClick={() => { setConsultaActiva(null); setTextoRespuesta('') }}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-lg transition-colors">
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => setConsultaActiva(consulta.id)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                              Responder
                            </button>
                            <button onClick={() => handleRechazar(consulta.id)} disabled={enviando}
                              className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                              Rechazar
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>)}

        {/* VISTA: CITAS */}
        {vista === 'citas' && (
          <div>
            <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-gray-900">Videollamadas</h3>
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                  {(['proximas', 'todas'] as const).map(f => (
                    <button key={f} onClick={() => setFiltroCitas(f)}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${filtroCitas === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                      {f === 'proximas' ? 'Próximas' : 'Todas'}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setModalNuevaCita(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                + Nueva videollamada
              </button>
            </div>

            {citasFiltradas.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-400 text-lg mb-1">📅</p>
                <p className="text-gray-500">No hay videollamadas {filtroCitas === 'proximas' ? 'próximas' : ''}.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {citasFiltradas.map(cita => {
                  const fecha = new Date(cita.fecha_hora)
                  const pasada = fecha < ahora
                  const esPendiente = cita.estado === 'pendiente'
                  const fechaStr = fecha.toLocaleString('es-CL', {
                    weekday: 'long', day: 'numeric', month: 'long',
                    hour: '2-digit', minute: '2-digit',
                    timeZone: 'America/Santiago',
                  })
                  return (
                    <div key={cita.id} className={`bg-white rounded-xl border p-5 shadow-sm ${cita.estado === 'cancelada' ? 'border-red-100 opacity-60' : esPendiente ? 'border-yellow-300' : pasada ? 'border-gray-200' : 'border-blue-200'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{cita.nombre_cliente}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cita.estado === 'confirmada' ? 'bg-green-100 text-green-700' : cita.estado === 'cancelada' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {cita.estado}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">{cita.email_cliente}</p>
                          <p className="text-sm font-medium text-gray-700 mt-2">📅 {fechaStr}</p>
                          {cita.notas && <p className="text-sm text-gray-500 mt-1">📝 {cita.notas}</p>}
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          {cita.meeting_url && cita.estado !== 'cancelada' && (
                            <a href={cita.meeting_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors text-center">
                              Ingresar →
                            </a>
                          )}
                          {esPendiente && (
                            <button onClick={() => handleConfirmarCita(cita)}
                              className="text-xs px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 rounded-lg font-medium transition-colors">
                              Confirmar
                            </button>
                          )}
                          {cita.estado !== 'cancelada' && (
                            <>
                              <button onClick={() => abrirEditarCita(cita)}
                                className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors">
                                Editar
                              </button>
                              <button onClick={() => setConfirmarCancelar(cita)}
                                className="text-xs px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition-colors">
                                Cancelar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* VISTA: CLIENTES */}
        {vista === 'clientes' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Mis Clientes</h2>
              <button onClick={() => { setFormCliente({ nombre: '', rut: '', email: '', telefono: '', tipo_servicio: '', descripcion: '', fecha_inicio: new Date().toISOString().split('T')[0], monto_total: '', monto_pie: '' }); setModalNuevoCliente(true) }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                + Nuevo Cliente
              </button>
            </div>

            {misClientes.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-500">No tienes clientes con contratos aún.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {misClientes.map((contrato: any) => {
                  const cliente = contrato.clientes
                  const estadoColor: Record<string, string> = { activo: 'bg-green-100 text-green-700', completado: 'bg-blue-100 text-blue-700', cancelado: 'bg-red-100 text-red-700', pendiente: 'bg-yellow-100 text-yellow-700' }
                  const cuotas = cuotasMap[contrato.id] ?? []
                  const expandido = clienteExpandido === contrato.id
                  return (
                    <div key={contrato.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      {/* Header */}
                      <div className="p-5 flex justify-between items-start gap-4">
                        <div className="flex-1 cursor-pointer" onClick={() => handleExpandir(contrato.id)}>
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-semibold text-gray-900">{cliente?.nombre}</p>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${estadoColor[contrato.estado] ?? 'bg-gray-100 text-gray-600'}`}>{contrato.estado}</span>
                          </div>
                          <p className="text-sm text-gray-500">{cliente?.email} {cliente?.telefono && `· ${cliente.telefono}`}</p>
                          {cliente?.rut && <p className="text-xs text-gray-400">RUT: {cliente.rut}</p>}
                          <p className="text-sm font-medium text-gray-700 mt-2">{contrato.tipo_servicio}</p>
                          {contrato.descripcion && <p className="text-xs text-gray-400">{contrato.descripcion}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setFormCliente({ nombre: cliente?.nombre, rut: cliente?.rut || '', email: cliente?.email, telefono: cliente?.telefono || '', tipo_servicio: contrato.tipo_servicio, descripcion: contrato.descripcion || '', fecha_inicio: contrato.fecha_inicio, monto_total: contrato.monto_total, monto_pie: contrato.monto_pie }); setModalEditarCliente(contrato) }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm">Editar</button>
                          <button onClick={() => handleEliminarCliente(contrato.id, cliente?.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm">Eliminar</button>
                          <button onClick={() => handleExpandir(contrato.id)}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors text-sm">
                            {expandido ? '▲' : '▼'}
                          </button>
                        </div>
                      </div>

                      {/* Montos */}
                      <div className="px-5 pb-4 grid grid-cols-3 gap-3 text-center text-xs">
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-gray-400">Total</p>
                          <p className="font-semibold text-gray-900">${contrato.monto_total?.toLocaleString('es-CL')}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-gray-400">Pie</p>
                          <p className="font-semibold text-gray-900">${contrato.monto_pie?.toLocaleString('es-CL')}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-gray-400">Saldo</p>
                          <p className={`font-semibold ${contrato.saldo > 0 ? 'text-red-600' : 'text-green-600'}`}>${contrato.saldo?.toLocaleString('es-CL')}</p>
                        </div>
                      </div>

                      {/* Cuotas expandidas */}
                      {expandido && (
                        <div className="border-t border-gray-100 p-5 space-y-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-semibold text-gray-700">Cuotas</p>
                              {cuotas.length > 0 && (() => {
                                const totalCuotas = cuotas.reduce((s: number, c: any) => s + c.monto, 0)
                                const sinAsignar = contrato.monto_total - contrato.monto_pie - totalCuotas
                                return sinAsignar !== 0
                                  ? <p className="text-xs text-orange-500 mt-0.5">Sin asignar: <span className="font-semibold">${sinAsignar.toLocaleString('es-CL')}</span></p>
                                  : <p className="text-xs text-green-600 font-medium mt-0.5">Saldo completamente asignado</p>
                              })()}
                            </div>
                            <button onClick={() => { const asignado = cuotas.reduce((s: number, c: any) => s + c.monto, 0); const restante = contrato.monto_total - contrato.monto_pie - asignado; setFormCuota({ numero: String(cuotas.length + 1), monto: String(restante > 0 ? restante : ''), fecha_vencimiento: '' }); setModalNuevaCuota(contrato) }}
                              className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                              + Agregar cuota
                            </button>
                          </div>
                          {cuotas.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-3">Sin cuotas registradas.</p>
                          ) : (
                            <div className="space-y-2">
                              {cuotas.map((cuota: any) => (
                                <div key={cuota.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-medium text-gray-500">#{cuota.numero}</span>
                                    <span className="text-sm font-semibold text-gray-900">${cuota.monto?.toLocaleString('es-CL')}</span>
                                    <span className="text-xs text-gray-400">Vence: {new Date(cuota.fecha_vencimiento + 'T12:00:00').toLocaleDateString('es-CL')}</span>
                                    {cuota.fecha_pago && <span className="text-xs text-green-600">Pagada: {new Date(cuota.fecha_pago + 'T12:00:00').toLocaleDateString('es-CL')}</span>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => handlePagarCuota(cuota, contrato.id)}
                                      className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${cuota.estado === 'pagada' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}>
                                      {cuota.estado === 'pagada' ? 'Pagada ✓' : 'Pendiente'}
                                    </button>
                                    <button onClick={() => handleEliminarCuota(cuota.id, contrato.id)}
                                      className="text-xs text-gray-400 hover:text-red-500 transition-colors">✕</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* VISTA: HORARIOS */}
        {vista === 'horarios' && (
          <div className="space-y-6">

            {/* Horario semanal recurrente */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-1">Horario semanal</h3>
              <p className="text-sm text-gray-500 mb-5">Define los días y horas de atención recurrentes. Los slots se generan cada 30 minutos.</p>
              <div className="space-y-3">
                {horarios.map((h, i) => (
                  <div key={h.dia_semana} className={`flex flex-wrap items-center gap-3 p-4 rounded-xl border ${h.activo ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                    <input type="checkbox" checked={h.activo} onChange={e => { const n = [...horarios]; n[i] = { ...n[i], activo: e.target.checked }; setHorarios(n) }} className="w-5 h-5 accent-blue-600 flex-shrink-0" />
                    <span className="w-20 font-medium text-gray-700 flex-shrink-0">{DIAS[h.dia_semana]}</span>
                    {h.activo ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <input type="time" value={h.hora_inicio} onChange={e => { const n = [...horarios]; n[i] = { ...n[i], hora_inicio: e.target.value }; setHorarios(n) }}
                          className="border border-gray-300 rounded-lg px-2 sm:px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <span className="text-gray-400">→</span>
                        <input type="time" value={h.hora_fin} onChange={e => { const n = [...horarios]; n[i] = { ...n[i], hora_fin: e.target.value }; setHorarios(n) }}
                          className="border border-gray-300 rounded-lg px-2 sm:px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No disponible</span>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={handleGuardarHorarios} disabled={guardandoHorarios}
                className="mt-5 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50">
                {guardandoHorarios ? 'Guardando...' : 'Guardar horarios'}
              </button>
            </div>

            {/* Calendario mensual — bloquear fechas específicas */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xl font-bold text-gray-900">Calendario del mes</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setMesActual(m => { const n = new Date(m); n.setMonth(n.getMonth() - 1); return n })}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">‹</button>
                  <span className="text-sm font-semibold text-gray-700 w-36 text-center capitalize">
                    {mesActual.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
                  </span>
                  <button onClick={() => setMesActual(m => { const n = new Date(m); n.setMonth(n.getMonth() + 1); return n })}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">›</button>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-5">Haz clic en un día disponible para bloquearlo (vacaciones, feriados, etc.).</p>

              {/* Leyenda */}
              <div className="flex gap-4 mb-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-300 inline-block"/> Disponible</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-100 border border-red-300 inline-block"/> Bloqueado</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200 inline-block"/> No laborable</span>
              </div>

              {/* Cabecera días */}
              <div className="grid grid-cols-7 mb-1">
                {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
                ))}
              </div>

              {/* Grilla de días */}
              <div className="grid grid-cols-7 gap-1">
                {getDiasMes(mesActual).map((dia, idx) => {
                  if (!dia) return <div key={`empty-${idx}`} />
                  const iso = dia.toISOString().split('T')[0]
                  const hoy = new Date(); hoy.setHours(0,0,0,0)
                  const esHoy = dia.toDateString() === hoy.toDateString()
                  const diaSemana = dia.getDay() === 0 ? 7 : dia.getDay()
                  const horarioDia = horarios.find(h => h.dia_semana === diaSemana)
                  const laborable = !!(horarioDia?.activo)
                  const bloqueada = fechasBloqueadas.includes(iso)
                  const pasado = dia < hoy
                  const cargando = togglando === iso

                  let bg = 'bg-gray-50 border-gray-100 text-gray-300 cursor-default'
                  if (!pasado && laborable && !bloqueada) bg = 'bg-blue-50 border-blue-200 text-blue-800 cursor-pointer hover:bg-blue-100'
                  if (!pasado && laborable && bloqueada) bg = 'bg-red-50 border-red-200 text-red-700 cursor-pointer hover:bg-red-100'

                  return (
                    <button key={iso} type="button"
                      disabled={!laborable || pasado || cargando}
                      onClick={() => laborable && !pasado && handleToggleFecha(iso)}
                      className={`aspect-square flex flex-col items-center justify-center rounded-lg border text-sm font-medium transition-colors ${bg} ${cargando ? 'opacity-50' : ''} ${esHoy ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}>
                      <span className={esHoy ? 'font-bold underline' : ''}>{dia.getDate()}</span>
                      {esHoy && !bloqueada && <span className="text-[9px] leading-none opacity-60">hoy</span>}
                      {bloqueada && <span className="text-xs leading-none">✕</span>}
                    </button>
                  )
                })}
              </div>
            </div>

          </div>
        )}

      </main>

      {/* MODAL: NUEVA VIDEOLLAMADA */}
      {modalNuevaCita && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-5">Nueva videollamada</h2>
            <form onSubmit={handleCrearCita} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del cliente *</label>
                <input type="text" value={formNuevaCita.nombre} onChange={e => setFormNuevaCita(f => ({ ...f, nombre: e.target.value }))} placeholder="Juan Pérez" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email del cliente *</label>
                <input type="email" value={formNuevaCita.email} onChange={e => setFormNuevaCita(f => ({ ...f, email: e.target.value }))} placeholder="cliente@email.com" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                <select value={formNuevaCita.fecha} onChange={e => handleFechaNueva(e.target.value)} className={inputCls}>
                  <option value="">-- Elige una fecha --</option>
                  {getFechasDisponibles().map(f => (
                    <option key={f} value={f}>{new Date(f + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</option>
                  ))}
                </select>
              </div>
              {cargandoSlotsNueva && <p className="text-sm text-gray-400">Cargando horarios...</p>}
              {!cargandoSlotsNueva && formNuevaCita.fecha && slotsNueva.length === 0 && (
                <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">No hay horarios disponibles para ese día.</p>
              )}
              {slotsNueva.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Horario *</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slotsNueva.map(slot => (
                      <button key={slot} type="button" onClick={() => setFormNuevaCita(f => ({ ...f, slot }))}
                        className={`py-2 rounded-lg text-sm font-medium border transition-colors ${formNuevaCita.slot === slot ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}>
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link de reunión (Zoom / Meet) <span className="text-gray-400 font-normal">— opcional</span></label>
                <input type="url" value={formNuevaCita.meeting_url} onChange={e => setFormNuevaCita(f => ({ ...f, meeting_url: e.target.value }))} placeholder="https://zoom.us/j/... o https://meet.google.com/..." className={inputCls} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={agendando} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50">
                  {agendando ? 'Agendando...' : 'Confirmar cita'}
                </button>
                <button type="button" onClick={() => { setModalNuevaCita(false); setFormNuevaCita({ nombre: '', email: '', fecha: '', slot: '', meeting_url: '' }); setSlotsNueva([]) }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR CITA */}
      {citaEditando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Editar videollamada</h2>
            <p className="text-sm text-gray-500 mb-5">{citaEditando.nombre_cliente} — {citaEditando.email_cliente}</p>
            <form onSubmit={handleEditarCita} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <select value={formEditarCita.fecha} onChange={e => handleFechaEditar(e.target.value)} className={inputCls}>
                  <option value="">-- Elige una fecha --</option>
                  {getFechasDisponibles().map(f => (
                    <option key={f} value={f}>{new Date(f + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</option>
                  ))}
                </select>
              </div>
              {cargandoSlotsEditar && <p className="text-sm text-gray-400">Cargando horarios...</p>}
              {slotsEditar.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Horario</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slotsEditar.map(slot => (
                      <button key={slot} type="button" onClick={() => setFormEditarCita(f => ({ ...f, slot }))}
                        className={`py-2 rounded-lg text-sm font-medium border transition-colors ${formEditarCita.slot === slot ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}>
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select value={formEditarCita.estado} onChange={e => setFormEditarCita(f => ({ ...f, estado: e.target.value }))} className={inputCls}>
                  <option value="confirmada">Confirmada</option>
                  <option value="cancelada">Cancelada</option>
                  <option value="completada">Completada</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link de reunión (Zoom / Meet)</label>
                <input type="url" value={formEditarCita.meeting_url} onChange={e => setFormEditarCita(f => ({ ...f, meeting_url: e.target.value }))} placeholder="https://zoom.us/j/... o https://meet.google.com/..." className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas internas</label>
                <textarea rows={3} value={formEditarCita.notas} onChange={e => setFormEditarCita(f => ({ ...f, notas: e.target.value }))}
                  placeholder="Notas privadas sobre la cita..." className={`${inputCls} resize-none`} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={guardandoCita} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50">
                  {guardandoCita ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button type="button" onClick={() => setCitaEditando(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR CANCELAR CITA */}
      {confirmarCancelar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">¿Cancelar videollamada?</h2>
            <p className="text-sm text-gray-500 mb-1">{confirmarCancelar.nombre_cliente}</p>
            <p className="text-sm font-medium text-gray-700 mb-6">
              {new Date(confirmarCancelar.fecha_hora).toLocaleString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' })}
            </p>
            <div className="flex gap-3">
              <button onClick={handleCancelarCita} disabled={cancelando}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50">
                {cancelando ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
              <button onClick={() => setConfirmarCancelar(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm transition-colors">
                Volver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO / EDITAR CLIENTE */}
      {(modalNuevoCliente || modalEditarCliente) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-gray-900">{modalNuevoCliente ? 'Nuevo Cliente' : 'Editar Cliente'}</h2>
            <form onSubmit={modalNuevoCliente ? handleCrearCliente : handleEditarCliente} className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Datos del cliente</p>
              <input required placeholder="Nombre completo" value={formCliente.nombre} onChange={e => setFormCliente(f => ({ ...f, nombre: e.target.value }))} className={inputCls} />
              <input placeholder="RUT" value={formCliente.rut} onChange={e => setFormCliente(f => ({ ...f, rut: e.target.value }))} className={inputCls} />
              <input required type="email" placeholder="Email" value={formCliente.email} onChange={e => setFormCliente(f => ({ ...f, email: e.target.value }))} className={inputCls} />
              <input placeholder="Teléfono" value={formCliente.telefono} onChange={e => setFormCliente(f => ({ ...f, telefono: e.target.value }))} className={inputCls} />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">Contrato</p>
              <input required placeholder="Tipo de servicio" value={formCliente.tipo_servicio} onChange={e => setFormCliente(f => ({ ...f, tipo_servicio: e.target.value }))} className={inputCls} />
              <textarea placeholder="Descripción (opcional)" value={formCliente.descripcion} onChange={e => setFormCliente(f => ({ ...f, descripcion: e.target.value }))} className={inputCls} rows={2} />
              <input required type="date" value={formCliente.fecha_inicio} onChange={e => setFormCliente(f => ({ ...f, fecha_inicio: e.target.value }))} className={inputCls} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Monto total ($)</label>
                  <input required type="number" min="0" placeholder="0" value={formCliente.monto_total} onChange={e => setFormCliente(f => ({ ...f, monto_total: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Pie inicial ($)</label>
                  <input required type="number" min="0" placeholder="0" value={formCliente.monto_pie} onChange={e => setFormCliente(f => ({ ...f, monto_pie: e.target.value }))} className={inputCls} />
                </div>
              </div>
              {formCliente.monto_total && formCliente.monto_pie && (
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                  Saldo a pagar en cuotas: <span className="font-bold text-red-600">${(Number(formCliente.monto_total) - Number(formCliente.monto_pie)).toLocaleString('es-CL')}</span>
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={guardandoCliente} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl text-sm disabled:opacity-50">
                  {guardandoCliente ? 'Guardando...' : 'Guardar'}
                </button>
                <button type="button" onClick={() => { setModalNuevoCliente(false); setModalEditarCliente(null) }} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: COMPROBANTE DE PAGO */}
      {modalComprobante && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Registrar pago</h2>
            <p className="text-sm text-gray-500">
              Cuota #{modalComprobante.cuota.numero} — <span className="font-semibold text-gray-900">${modalComprobante.cuota.monto?.toLocaleString('es-CL')}</span>
            </p>
            <form onSubmit={handleConfirmarPago} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">N° Comprobante / Referencia</label>
                <input required placeholder="Ej: 00123456" value={formComprobante.comprobante}
                  onChange={e => setFormComprobante(f => ({ ...f, comprobante: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Fecha de pago</label>
                <input required type="date" value={formComprobante.fecha_pago}
                  onChange={e => setFormComprobante(f => ({ ...f, fecha_pago: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Adjuntar comprobante (PDF o imagen)</label>
                <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={e => setArchivoPDF(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                {archivoPDF && <p className="text-xs text-green-600 mt-1">✓ {archivoPDF.name}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={guardandoComprobante}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-xl text-sm disabled:opacity-50">
                  {guardandoComprobante ? 'Guardando...' : 'Confirmar pago'}
                </button>
                <button type="button" onClick={() => { setModalComprobante(null); setArchivoPDF(null) }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA CUOTA */}
      {modalNuevaCuota !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Agregar Cuota</h2>
            {(() => {
              const cuotasExistentes = cuotasMap[modalNuevaCuota.id] ?? []
              const totalAsignado = cuotasExistentes.reduce((s: number, c: any) => s + c.monto, 0)
              const sinAsignar = modalNuevaCuota.monto_total - modalNuevaCuota.monto_pie - totalAsignado
              return sinAsignar > 0 ? (
                <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm">
                  <span className="text-orange-600">Saldo restante por asignar: </span>
                  <span className="font-bold text-orange-700">${sinAsignar.toLocaleString('es-CL')}</span>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700 font-medium">
                  Saldo completamente asignado
                </div>
              )
            })()}
            <form onSubmit={handleCrearCuota} className="space-y-3">
              <input required type="number" min="1" placeholder="N° cuota" value={formCuota.numero} onChange={e => setFormCuota(f => ({ ...f, numero: e.target.value }))} className={inputCls} />
              <input required type="number" min="0" placeholder="Monto ($)" value={formCuota.monto} onChange={e => setFormCuota(f => ({ ...f, monto: e.target.value }))} className={inputCls} />
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Fecha de vencimiento</label>
                <input required type="date" value={formCuota.fecha_vencimiento} onChange={e => setFormCuota(f => ({ ...f, fecha_vencimiento: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={guardandoCuota} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl text-sm disabled:opacity-50">
                  {guardandoCuota ? 'Guardando...' : 'Agregar'}
                </button>
                <button type="button" onClick={() => setModalNuevaCuota(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm">
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
