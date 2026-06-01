'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { obtenerSesion, obtenerDatosAbogado, cerrarSesion } from '@/lib/auth'
import { useInactivityLogout } from '@/lib/useInactivityLogout'
import { NuevoProspectoForm } from '@/components/NuevoProspectoForm'
import { ProspectoModal } from '@/components/ProspectoModal'
import { supabase } from '@/lib/supabase'
import { obtenerTimelineContrato, crearEvento, editarEvento, eliminarEvento } from '@/lib/admin'
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

type Seccion = 'consultas' | 'citas' | 'horarios' | 'clientes' | 'prospectos'

export default function DashboardPage() {
  const router = useRouter()
  const [seccionAbierta, setSeccionAbierta] = useState<Seccion | null>(null)
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
  const [modalPassword, setModalPassword] = useState(false)
  const [formPassword, setFormPassword] = useState({ actual: '', nueva: '', confirmar: '' })
  const [guardandoPassword, setGuardandoPassword] = useState(false)
  const [modalContratoExistente, setModalContratoExistente] = useState<any | null>(null)
  const [formContratoExistente, setFormContratoExistente] = useState({ tipo_servicio: '', descripcion: '', fecha_inicio: new Date().toISOString().split('T')[0], monto_total: '', monto_pie: '' })
  const [timelineMap, setTimelineMap] = useState<Record<number, any[]>>({})
  const [mostrarFormTimeline, setMostrarFormTimeline] = useState<number | null>(null)
  const [formTimeline, setFormTimeline] = useState({ titulo: '', descripcion: '', fecha: new Date().toISOString().split('T')[0], completado: false })
  const [guardandoEvento, setGuardandoEvento] = useState(false)
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

  // Notificaciones
  const [notificaciones, setNotificaciones] = useState<any[]>([])
  const [dropdownNoti, setDropdownNoti] = useState(false)
  const notiRef = useRef<HTMLDivElement>(null)
  const [cantidadProspectos, setCantidadProspectos] = useState(0)
  const [prospectosData, setProspectosData] = useState<any[]>([])
  const [mostrarFormProspecto, setMostrarFormProspecto] = useState(false)
  const [prospectoSeleccionado, setProspectoSeleccionado] = useState<any | null>(null)
  const prospectosSectionRef = useRef<HTMLDivElement>(null)

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

  useInactivityLogout(() => router.push('/login'))

  async function cargarNotificaciones(token: string) {
    const res = await fetch('/api/notificaciones', {
      headers: { authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (data.notificaciones) setNotificaciones(data.notificaciones)
  }

  async function cargarCantidadProspectos(token: string) {
    const res = await fetch('/api/prospectos', {
      headers: { authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (data.prospectos) {
      setCantidadProspectos(data.prospectos.length)
      setProspectosData(data.prospectos)
    }
  }

  async function marcarLeida(id: number) {
    await fetch('/api/notificaciones', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${sesionToken}` },
      body: JSON.stringify({ id }),
    })
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
  }

  async function handleClickNotificacion(n: any) {
    await marcarLeida(n.id)
    setDropdownNoti(false)
    if (n.tipo === 'prospecto') {
      setSeccionAbierta('prospectos')
      setTimeout(() => {
        prospectosSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }

  async function marcarRevisado(id: number) {
    await fetch('/api/prospectos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${sesionToken}` },
      body: JSON.stringify({ id }),
    })
    setProspectosData(prev => prev.map(p => p.id === id ? { ...p, revisado: true } : p))
  }

  async function marcarTodasLeidas() {
    await fetch('/api/notificaciones', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${sesionToken}` },
      body: JSON.stringify({}),
    })
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
  }

  useEffect(() => {
    if (!sesionToken) return
    cargarNotificaciones(sesionToken)
    cargarCantidadProspectos(sesionToken)
    const intervalo = setInterval(() => cargarNotificaciones(sesionToken), 30000)
    return () => clearInterval(intervalo)
  }, [sesionToken])

  useEffect(() => {
    if (!dropdownNoti) return
    function handleClickFuera(e: MouseEvent) {
      if (notiRef.current && !notiRef.current.contains(e.target as Node)) {
        setDropdownNoti(false)
      }
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [dropdownNoti])

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
        creadaPorAbogado: true,
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

  async function handleCambiarPassword(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (formPassword.nueva !== formPassword.confirmar) {
      mostrarMensaje('error', 'Las contraseñas nuevas no coinciden.')
      return
    }
    if (formPassword.nueva.length < 6) {
      mostrarMensaje('error', 'La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }
    setGuardandoPassword(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: abogado.email, password: formPassword.actual })
    if (signInError) { mostrarMensaje('error', 'La contraseña actual es incorrecta.'); setGuardandoPassword(false); return }
    const { error } = await supabase.auth.updateUser({ password: formPassword.nueva })
    if (error) { mostrarMensaje('error', error.message); setGuardandoPassword(false); return }
    setModalPassword(false)
    setFormPassword({ actual: '', nueva: '', confirmar: '' })
    mostrarMensaje('exito', 'Contraseña actualizada correctamente.')
    setGuardandoPassword(false)
  }

  async function handleCrearContratoExistente(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!modalContratoExistente) return
    setGuardandoCliente(true)
    const res = await fetch('/api/mis-clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${sesionToken}` },
      body: JSON.stringify({
        clienteExistenteId: modalContratoExistente.id,
        tipo_servicio: formContratoExistente.tipo_servicio,
        descripcion: formContratoExistente.descripcion,
        fecha_inicio: formContratoExistente.fecha_inicio,
        monto_total: Number(formContratoExistente.monto_total),
        monto_pie: Number(formContratoExistente.monto_pie),
      }),
    })
    const data = await res.json()
    if (data.success) {
      setModalContratoExistente(null)
      setFormContratoExistente({ tipo_servicio: '', descripcion: '', fecha_inicio: new Date().toISOString().split('T')[0], monto_total: '', monto_pie: '' })
      await recargarClientes()
      mostrarMensaje('exito', 'Contrato creado correctamente.')
    } else {
      mostrarMensaje('error', data.error || 'Error al crear contrato.')
    }
    setGuardandoCliente(false)
  }

  async function cargarTimeline(contratoId: number) {
    const data = await obtenerTimelineContrato(contratoId)
    if (data.eventos) setTimelineMap(prev => ({ ...prev, [contratoId]: data.eventos }))
  }

  async function handleExpandir(clienteId: number, contratoId: number) {
    if (clienteExpandido === clienteId) { setClienteExpandido(null); return }
    setClienteExpandido(clienteId)
    await Promise.all([cargarCuotas(contratoId), cargarTimeline(contratoId)])
  }

  async function handleCrearEvento(e: React.SyntheticEvent<HTMLFormElement>, contratoId: number) {
    e.preventDefault()
    if (!formTimeline.titulo.trim()) return
    setGuardandoEvento(true)
    const res = await crearEvento({ contrato_id: contratoId, titulo: formTimeline.titulo.trim(), descripcion: formTimeline.descripcion.trim() || undefined, fecha: formTimeline.fecha, completado: formTimeline.completado })
    if (res.success) {
      setFormTimeline({ titulo: '', descripcion: '', fecha: new Date().toISOString().split('T')[0], completado: false })
      setMostrarFormTimeline(null)
      await cargarTimeline(contratoId)
    }
    setGuardandoEvento(false)
  }

  async function handleToggleCompletado(evento: any, contratoId: number) {
    await editarEvento({ id: evento.id, titulo: evento.titulo, descripcion: evento.descripcion, fecha: evento.fecha, completado: !evento.completado })
    await cargarTimeline(contratoId)
  }

  async function handleEliminarEvento(eventoId: number, contratoId: number) {
    await eliminarEvento(eventoId)
    await cargarTimeline(contratoId)
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
      const { data: { session } } = await supabase.auth.getSession()
      const fd = new FormData()
      fd.append('archivo', archivoPDF)
      fd.append('cuota_id', String(modalComprobante.cuota.id))
      const uploadRes = await fetch('/api/comprobantes', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: fd,
      })
      const uploadData = await uploadRes.json()
      if (uploadData.success) comprobanteUrl = uploadData.url
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

  function tiempoRelativo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 1) return 'Ahora'
    if (min < 60) return `Hace ${min}m`
    const h = Math.floor(min / 60)
    if (h < 24) return `Hace ${h}h`
    return `Hace ${Math.floor(h / 24)}d`
  }

  const noLeidas = notificaciones.filter(n => !n.leida).length
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

      {/* Navbar desktop */}
      <nav className="border-b" style={{ backgroundColor: azulProfundo, borderColor: '#243B55' }}>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="h-14 sm:h-16 flex items-center justify-between gap-4">
            <div className="flex-shrink-0">
              <img src="/logo_claro.png" alt="Toro Pacheco & Asociados" className="h-9 sm:h-12 w-auto" />
            </div>
            <div className="hidden sm:flex items-center gap-2">
              {/* Nombre + rol */}
              <span className="flex items-center gap-2 mr-1">
                <span className="text-sm text-white opacity-70">
                  {abogado?.nombres?.split(' ')[0] ?? abogado?.nombre_negocio?.split(' ')[0]}
                </span>
                <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: dorado + '33', color: dorado }}>
                  {abogado?.is_admin ? 'ADMIN' : 'ABOGADO'}
                </span>
              </span>
              {abogado?.is_admin && (
                <a href="/admin" className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all"
                  style={{ color: 'rgba(255,255,255,0.65)' }}>Admin</a>
              )}

              {/* Campana de notificaciones */}
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
                        <button onClick={marcarTodasLeidas}
                          className="text-xs text-blue-600 hover:underline">
                          Marcar todas como leídas
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                      {notificaciones.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">Sin notificaciones</p>
                      ) : (
                        notificaciones.map(n => (
                          <button key={n.id} onClick={() => handleClickNotificacion(n)}
                            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${!n.leida ? 'bg-blue-50' : ''}`}>
                            <div className="flex justify-between items-start gap-2">
                              <p className={`text-sm font-semibold leading-tight ${!n.leida ? 'text-gray-900' : 'text-gray-500'}`}>
                                {n.titulo}
                              </p>
                              <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0 mt-0.5">
                                {tiempoRelativo(n.created_at)}
                              </span>
                            </div>
                            {n.mensaje && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.mensaje}</p>
                            )}
                            {!n.leida && (
                              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button onClick={() => { setFormPassword({ actual: '', nueva: '', confirmar: '' }); setModalPassword(true) }}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all hover:opacity-80"
                style={{ color: 'rgba(255,255,255,0.55)' }}>
                Contraseña
              </button>
              <a href="/" className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all hover:opacity-80"
                style={{ color: 'rgba(255,255,255,0.55)' }}>
                ← Sitio
              </a>
              <button onClick={async () => { await cerrarSesion(); router.push('/login') }}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg border whitespace-nowrap transition-all"
                style={{ borderColor: dorado + '55', color: dorado }}>
                Salir
              </button>
            </div>
            {/* Botón salir en móvil */}
            <div className="sm:hidden flex items-center gap-2">
              <button onClick={() => { setFormPassword({ actual: '', nueva: '', confirmar: '' }); setModalPassword(true) }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all hover:opacity-80"
                style={{ color: 'rgba(255,255,255,0.55)' }}>
                🔑
              </button>
              <button onClick={() => setDropdownNoti(v => !v)}
                className="relative px-2 py-1.5 text-xs font-medium rounded-lg transition-all hover:opacity-80"
                style={{ color: 'rgba(255,255,255,0.7)' }}>
                🔔
                {noLeidas > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-bold rounded-full bg-red-500 text-white px-0.5 leading-none">
                    {noLeidas > 9 ? '9+' : noLeidas}
                  </span>
                )}
              </button>
              <a href="/" className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all hover:opacity-80"
                style={{ color: 'rgba(255,255,255,0.55)' }}>
                ← Sitio
              </a>
              <button onClick={async () => { await cerrarSesion(); router.push('/login') }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border"
                style={{ borderColor: dorado + '55', color: dorado }}>
                Salir
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Bottom nav — solo móvil */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t flex" style={{ backgroundColor: azulProfundo, borderColor: '#243B55' }}>
        <button onClick={() => setSeccionAbierta(null)}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all"
          style={seccionAbierta === null ? { color: dorado } : { color: 'rgba(255,255,255,0.5)' }}>
          <span className="text-lg leading-none">🏠</span>
          <span className="text-[10px] font-semibold">Inicio</span>
        </button>
        {([
          { v: 'consultas' as Seccion, label: 'Consultas', icon: '💬' },
          { v: 'citas'     as Seccion, label: 'Citas',     icon: '📅' },
          { v: 'clientes'  as Seccion, label: 'Clientes',  icon: '👤' },
          { v: 'horarios'  as Seccion, label: 'Horarios',  icon: '🕐' },
        ]).map(({ v, label, icon }) => (
          <button key={v} onClick={() => setSeccionAbierta(s => s === v ? null : v)}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all"
            style={seccionAbierta === v ? { color: dorado } : { color: 'rgba(255,255,255,0.5)' }}>
            <span className="text-lg leading-none">{icon}</span>
            <span className="text-[10px] font-semibold">{label}</span>
          </button>
        ))}
        {abogado?.is_admin && (
          <a href="/admin" className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5"
            style={{ color: 'rgba(255,255,255,0.5)' }}>
            <span className="text-lg leading-none">⚙️</span>
            <span className="text-[10px] font-semibold">Admin</span>
          </a>
        )}
      </nav>

      <main className="py-6 sm:py-8 px-4 sm:px-6 lg:px-8 pb-24 sm:pb-8">

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

        {/* CARDS — siempre visibles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 mb-6">
          {([
            { v: 'consultas' as Seccion, label: 'Consultas', icon: '💬', desc: 'Revisa y responde las consultas de tus clientes', color: azul },
            { v: 'clientes'  as Seccion, label: 'Clientes',  icon: '👤', desc: 'Administra el expediente de cada cliente',        color: azulProfundo },
            { v: 'citas'     as Seccion, label: 'Citas',     icon: '📅', desc: 'Gestiona tus videollamadas y reuniones',           color: azul },
            { v: 'horarios'  as Seccion, label: 'Horarios',  icon: '🕐', desc: 'Configura tu disponibilidad semanal',              color: azulProfundo },
          ]).map(({ v, label, icon, desc, color }) => {
            const activa = seccionAbierta === v
            return (
              <button key={v} onClick={() => setSeccionAbierta(s => s === v ? null : v)}
                className="group text-left rounded-2xl p-6 sm:p-8 text-white transition-all duration-200 hover:scale-105 focus:outline-none"
                style={{
                  backgroundColor: color,
                  boxShadow: activa
                    ? `0 0 0 3px ${dorado}, 0 8px 24px rgba(0,0,0,0.2)`
                    : '0 2px 12px rgba(0,0,0,0.12)',
                  transform: activa ? 'scale(1.03)' : undefined,
                }}>
                <span className="text-4xl sm:text-5xl block mb-4 transition-transform duration-200 group-hover:scale-110">{icon}</span>
                <p className="text-base sm:text-lg font-bold mb-1" style={{ fontFamily: 'var(--font-playfair), serif' }}>{label}</p>
                <p className="text-xs sm:text-sm opacity-60 leading-relaxed">{desc}</p>
              </button>
            )
          })}

          {/* Card Prospectos */}
          {(() => {
            const activa = seccionAbierta === 'prospectos'
            return (
              <button onClick={() => setSeccionAbierta(s => s === 'prospectos' ? null : 'prospectos')}
                className="group text-left rounded-2xl p-6 sm:p-8 transition-all duration-200 hover:scale-105 focus:outline-none"
                style={{
                  backgroundColor: dorado,
                  color: azulProfundo,
                  boxShadow: activa
                    ? `0 0 0 3px ${azulProfundo}, 0 8px 24px rgba(0,0,0,0.2)`
                    : '0 2px 12px rgba(0,0,0,0.12)',
                  transform: activa ? 'scale(1.03)' : undefined,
                }}>
                <span className="text-4xl sm:text-5xl block mb-4 transition-transform duration-200 group-hover:scale-110">⚖️</span>
                <p className="text-base sm:text-lg font-bold mb-1" style={{ fontFamily: 'var(--font-playfair), serif' }}>Prospectos</p>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ opacity: 0.65 }}>
                  {cantidadProspectos > 0
                    ? `${cantidadProspectos} interesado${cantidadProspectos !== 1 ? 's' : ''} o agendado${cantidadProspectos !== 1 ? 's' : ''}`
                    : 'Ver prospectos interesados'}
                </p>
              </button>
            )
          })()}
        </div>

        {/* SECCIÓN: CONSULTAS */}
        {seccionAbierta === 'consultas' && (<>
          <button onClick={() => setSeccionAbierta(null)} className="flex items-center gap-1.5 text-sm font-medium mb-5 transition-opacity hover:opacity-70" style={{ color: azul }}>✕ Cerrar</button>
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

        {/* SECCIÓN: CITAS */}
        {seccionAbierta === 'citas' && (
          <div>
            <button onClick={() => setSeccionAbierta(null)} className="flex items-center gap-1.5 text-sm font-medium mb-5 transition-opacity hover:opacity-70" style={{ color: azul }}>✕ Cerrar</button>
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
                    <div key={cita.id} className={`bg-white rounded-xl border p-4 sm:p-5 shadow-sm ${cita.estado === 'cancelada' ? 'border-red-100 opacity-60' : esPendiente ? 'border-yellow-300' : pasada ? 'border-gray-200' : 'border-blue-200'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{cita.nombre_cliente}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cita.estado === 'confirmada' ? 'bg-green-100 text-green-700' : cita.estado === 'cancelada' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {cita.estado}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 truncate">{cita.email_cliente}</p>
                          <p className="text-sm font-medium text-gray-700 mt-1">📅 {fechaStr}</p>
                          {cita.notas && <p className="text-sm text-gray-500 mt-1">📝 {cita.notas}</p>}
                        </div>
                      </div>
                      {/* Botones siempre en fila al fondo */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {cita.meeting_url && cita.estado !== 'cancelada' && (
                          <a href={cita.meeting_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors">
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
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN: CLIENTES */}
        {seccionAbierta === 'clientes' && (
          <div className="space-y-4">
            <button onClick={() => setSeccionAbierta(null)} className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70" style={{ color: azul }}>✕ Cerrar</button>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Mis Clientes</h2>
              <button onClick={() => { setFormCliente({ nombre: '', rut: '', email: '', telefono: '', tipo_servicio: '', descripcion: '', fecha_inicio: new Date().toISOString().split('T')[0], monto_total: '', monto_pie: '' }); setModalNuevoCliente(true) }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                + Nuevo Cliente
              </button>
            </div>

            {misClientes.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-500">No hay clientes registrados aún.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {misClientes.map((cliente: any) => {
                  const contrato = cliente.contrato ?? null
                  const cuotas = contrato ? cuotasMap[contrato.id] ?? [] : []
                  const expandido = clienteExpandido === cliente.id
                  const estadoColor: Record<string, string> = { activo: 'bg-green-100 text-green-700', completado: 'bg-blue-100 text-blue-700', cancelado: 'bg-red-100 text-red-700', pendiente: 'bg-yellow-100 text-yellow-700' }
                  return (
                    <div key={cliente.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      {/* Header */}
                      <div className="p-5 flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900">{cliente.nombre}</p>
                            {contrato ? (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Con contrato</span>
                            ) : (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Sin contrato</span>
                            )}
                            {contrato && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${estadoColor[contrato.estado] ?? 'bg-gray-100 text-gray-600'}`}>{contrato.estado}</span>}
                          </div>
                          <p className="text-sm text-gray-500">{cliente.email}{cliente.telefono && ` · ${cliente.telefono}`}</p>
                          {cliente.rut && <p className="text-xs text-gray-400">RUT: {cliente.rut}</p>}
                          {contrato && <p className="text-sm font-medium text-gray-700 mt-1">{contrato.tipo_servicio}{contrato.descripcion && ` — ${contrato.descripcion}`}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {contrato ? (
                            <>
                              <button onClick={() => { setFormCliente({ nombre: cliente.nombre, rut: cliente.rut || '', email: cliente.email, telefono: cliente.telefono || '', tipo_servicio: contrato.tipo_servicio, descripcion: contrato.descripcion || '', fecha_inicio: contrato.fecha_inicio, monto_total: contrato.monto_total, monto_pie: contrato.monto_pie }); setModalEditarCliente({ ...contrato, clientes: cliente }) }}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm">Editar</button>
                              <button onClick={() => handleEliminarCliente(contrato.id, cliente.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm">Eliminar</button>
                              <button onClick={() => handleExpandir(cliente.id, contrato.id)}
                                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors text-sm">
                                {expandido ? '▲' : '▼'}
                              </button>
                            </>
                          ) : (
                            <button onClick={() => { setFormContratoExistente({ tipo_servicio: '', descripcion: '', fecha_inicio: new Date().toISOString().split('T')[0], monto_total: '', monto_pie: '' }); setModalContratoExistente(cliente) }}
                              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors text-white"
                              style={{ backgroundColor: azul }}>
                              + Crear contrato
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Montos — solo si tiene contrato */}
                      {contrato && (
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
                      )}

                      {/* Expandido — solo si tiene contrato */}
                      {expandido && contrato && (
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

                          {/* ── TIMELINE ───────────────────────────────── */}
                          <div className="pt-3 border-t border-gray-100">
                            {(() => {
                              const eventos: any[] = timelineMap[contrato.id] ?? []
                              const ultimoCompletadoIdx = eventos.reduce((last: number, ev: any, i: number) => ev.completado ? i : last, -1)
                              function iconoEv(ev: any, i: number) {
                                if (!ev.completado) return '⏳'
                                if (i === ultimoCompletadoIdx) return '🔄'
                                return '✅'
                              }
                              return (
                                <>
                                  <div className="flex justify-between items-center mb-3">
                                    <p className="text-sm font-semibold text-gray-700">Timeline del caso</p>
                                    <button onClick={() => { setFormTimeline({ titulo: '', descripcion: '', fecha: new Date().toISOString().split('T')[0], completado: false }); setMostrarFormTimeline(mostrarFormTimeline === contrato.id ? null : contrato.id) }}
                                      className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                                      style={{ backgroundColor: azul, color: dorado }}>
                                      + Agregar evento
                                    </button>
                                  </div>
                                  {mostrarFormTimeline === contrato.id && (
                                    <form onSubmit={e => handleCrearEvento(e, contrato.id)} className="mb-3 p-4 rounded-xl border space-y-3" style={{ backgroundColor: '#FDFBF5', borderColor: '#EDE8DC' }}>
                                      <div>
                                        <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Título *</label>
                                        <input value={formTimeline.titulo} onChange={e => setFormTimeline(f => ({ ...f, titulo: e.target.value }))} placeholder="Ej: Presentación de demanda" required className={inputCls} />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Descripción (opcional)</label>
                                        <textarea value={formTimeline.descripcion} onChange={e => setFormTimeline(f => ({ ...f, descripcion: e.target.value }))} rows={2} placeholder="Detalle del evento..." className={inputCls + ' resize-none'} />
                                      </div>
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Fecha *</label>
                                          <input type="date" value={formTimeline.fecha} onChange={e => setFormTimeline(f => ({ ...f, fecha: e.target.value }))} required className={inputCls} />
                                        </div>
                                        <div className="flex items-center gap-2 pt-5">
                                          <input type="checkbox" id={`completado-${contrato.id}`} checked={formTimeline.completado} onChange={e => setFormTimeline(f => ({ ...f, completado: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
                                          <label htmlFor={`completado-${contrato.id}`} className="text-sm text-gray-700">Completado</label>
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <button type="submit" disabled={guardandoEvento} className="px-4 py-2 text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors text-white" style={{ backgroundColor: azul }}>{guardandoEvento ? 'Guardando...' : 'Guardar evento'}</button>
                                        <button type="button" onClick={() => setMostrarFormTimeline(null)} className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">Cancelar</button>
                                      </div>
                                    </form>
                                  )}
                                  {eventos.length === 0 ? (
                                    <p className="text-xs text-gray-400 text-center py-3">Sin eventos registrados.</p>
                                  ) : (
                                    <div className="relative">
                                      <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-200" />
                                      <div className="space-y-3">
                                        {eventos.map((ev: any, i: number) => (
                                          <div key={ev.id} className="flex gap-3 relative">
                                            <span className="text-base flex-shrink-0 z-10">{iconoEv(ev, i)}</span>
                                            <div className="flex-1 min-w-0 bg-gray-50 rounded-lg px-3 py-2">
                                              <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                  <p className="text-sm font-medium text-gray-900 truncate">{ev.titulo}</p>
                                                  {ev.descripcion && <p className="text-xs text-gray-500 mt-0.5">{ev.descripcion}</p>}
                                                  <p className="text-xs text-gray-400 mt-0.5">{new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                                </div>
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                  <button onClick={() => handleToggleCompletado(ev, contrato.id)} className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${ev.completado ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>{ev.completado ? '✓ Hecho' : 'Pendiente'}</button>
                                                  <button onClick={() => handleEliminarEvento(ev.id, contrato.id)} className="text-xs text-gray-400 hover:text-red-500 transition-colors">✕</button>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN: HORARIOS */}
        {seccionAbierta === 'horarios' && (
          <div className="space-y-6">
            <button onClick={() => setSeccionAbierta(null)} className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70" style={{ color: azul }}>✕ Cerrar</button>

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

        {/* SECCIÓN: PROSPECTOS */}
        {seccionAbierta === 'prospectos' && (
          <div className="space-y-4" ref={prospectosSectionRef}>
            <div className="flex justify-between items-center">
              <button onClick={() => { setSeccionAbierta(null); setMostrarFormProspecto(false) }} className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70" style={{ color: azul }}>✕ Cerrar</button>
              <button
                onClick={() => setMostrarFormProspecto(v => !v)}
                className="px-4 py-2 rounded-xl text-sm font-bold transition-colors text-white"
                style={{ backgroundColor: mostrarFormProspecto ? '#6B7280' : azul }}>
                {mostrarFormProspecto ? '✕ Cancelar' : '+ Nuevo prospecto'}
              </button>
            </div>

            {mostrarFormProspecto && (
              <NuevoProspectoForm
                token={sesionToken}
                onSuccess={() => {
                  setMostrarFormProspecto(false)
                  cargarCantidadProspectos(sesionToken)
                }}
                onCancel={() => setMostrarFormProspecto(false)}
              />
            )}

            {prospectosData.length === 0 ? (
              <div className="bg-white rounded-2xl border p-12 text-center" style={{ borderColor: '#EDE8DC' }}>
                <p className="text-3xl mb-3">⚖️</p>
                <p className="text-sm text-gray-400">No hay prospectos en seguimiento por el momento.</p>
              </div>
            ) : (() => {
              const BADGE: Record<string, string> = {
                interesado:         'bg-green-100 text-green-700',
                agendado:           'bg-emerald-100 text-emerald-800',
                cotizacion_enviada: 'bg-blue-100 text-blue-700',
                acepto_cotizacion:  'bg-blue-200 text-blue-900',
                venta:              'bg-emerald-600 text-white',
              }
              const LABEL: Record<string, string> = {
                interesado: 'Interesado', agendado: 'Agendado',
                cotizacion_enviada: 'Cotización enviada', acepto_cotizacion: 'Aceptó cotización',
                venta: 'Venta ✅',
              }
              const vendidos    = prospectosData.filter(p => p.estado === 'venta')
              const enProceso   = prospectosData.filter(p => ['cotizacion_enviada', 'acepto_cotizacion'].includes(p.estado))
              const nuevos      = prospectosData.filter(p => !['venta','cotizacion_enviada','acepto_cotizacion'].includes(p.estado) && (!p.tipificaciones || p.tipificaciones.length === 0))
              const contactados = prospectosData.filter(p => !['venta','cotizacion_enviada','acepto_cotizacion'].includes(p.estado) && p.tipificaciones?.length > 0)

              const ProspectoCard = ({ p }: { p: any }) => {
                const noRevisado = p.revisado === false
                const tieneContacto = p.tipificaciones?.length > 0
                return (
                  <div
                    onClick={() => { if (noRevisado) marcarRevisado(p.id); setProspectoSeleccionado(p) }}
                    className="p-4 border rounded-xl cursor-pointer transition-all hover:shadow-md"
                    style={{
                      borderColor: noRevisado ? '#EF4444' : p.estado === 'venta' ? '#059669' : '#EDE8DC',
                      backgroundColor: noRevisado ? '#FFF1F1' : p.estado === 'venta' ? '#ECFDF5' : '#FFFFFF',
                      borderLeftWidth: noRevisado || p.estado === 'venta' ? 4 : 1,
                    }}
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {noRevisado && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1" />}
                        <p className="font-semibold text-gray-800">{p.nombre}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!tieneContacto && p.estado !== 'venta' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">Sin tipificar</span>
                        )}
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE[p.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                          {LABEL[p.estado] ?? p.estado}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      {p.requerimiento && <p>📄 {p.requerimiento}</p>}
                      {p.juzgado       && <p>🏛 {p.juzgado}</p>}
                      {p.telefono      && <p>📞 {p.telefono}</p>}
                      {p.monto_deuda   && <p>💰 ${Number(p.monto_deuda).toLocaleString('es-CL')}</p>}
                    </div>
                    <p className="text-xs mt-2 font-medium" style={{ color: azul }}>Ver detalle →</p>
                  </div>
                )
              }

              return (
                <div className="space-y-6">
                  {nuevos.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: azul }}>
                        🆕 Nuevos
                        <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">{nuevos.length}</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {nuevos.map(p => <ProspectoCard key={p.id} p={p} />)}
                      </div>
                    </div>
                  )}
                  {contactados.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: azul }}>
                        📋 Contactados
                        <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-green-100 text-green-700">{contactados.length}</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {contactados.map(p => <ProspectoCard key={p.id} p={p} />)}
                      </div>
                    </div>
                  )}
                  {enProceso.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: azul }}>
                        📝 En proceso de cierre
                        <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{enProceso.length}</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {enProceso.map(p => <ProspectoCard key={p.id} p={p} />)}
                      </div>
                    </div>
                  )}
                  {vendidos.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#059669' }}>
                        💰 Ventas
                        <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{vendidos.length}</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {vendidos.map(p => <ProspectoCard key={p.id} p={p} />)}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}

      </main>

      {/* MODAL: PROSPECTO */}
      {prospectoSeleccionado && (
        <ProspectoModal
          prospecto={prospectoSeleccionado}
          token={sesionToken}
          onClose={() => setProspectoSeleccionado(null)}
          onTipificacionCreada={() => cargarCantidadProspectos(sesionToken)}
          onEstadoCambiado={() => cargarCantidadProspectos(sesionToken)}
        />
      )}

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
      {/* Modal: Crear contrato para cliente existente */}
      {/* Modal: Cambiar contraseña */}
      {modalPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900">Cambiar contraseña</h2>
              <button onClick={() => setModalPassword(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
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
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 text-white transition-colors"
                  style={{ backgroundColor: azul }}>
                  {guardandoPassword ? 'Guardando...' : 'Guardar contraseña'}
                </button>
                <button type="button" onClick={() => setModalPassword(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalContratoExistente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Crear contrato</h2>
                <p className="text-sm text-gray-500">para {modalContratoExistente.nombre}</p>
              </div>
              <button onClick={() => setModalContratoExistente(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <form onSubmit={handleCrearContratoExistente} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Tipo de servicio *</label>
                <input value={formContratoExistente.tipo_servicio} onChange={e => setFormContratoExistente(f => ({ ...f, tipo_servicio: e.target.value }))} required placeholder="Ej: Defensa ante embargo" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Descripción</label>
                <input value={formContratoExistente.descripcion} onChange={e => setFormContratoExistente(f => ({ ...f, descripcion: e.target.value }))} placeholder="Opcional" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Fecha inicio *</label>
                  <input type="date" value={formContratoExistente.fecha_inicio} onChange={e => setFormContratoExistente(f => ({ ...f, fecha_inicio: e.target.value }))} required className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Monto total *</label>
                  <input type="number" value={formContratoExistente.monto_total} onChange={e => setFormContratoExistente(f => ({ ...f, monto_total: e.target.value }))} required placeholder="0" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: azul }}>Monto pie *</label>
                <input type="number" value={formContratoExistente.monto_pie} onChange={e => setFormContratoExistente(f => ({ ...f, monto_pie: e.target.value }))} required placeholder="0" className={inputCls} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={guardandoCliente} className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 text-white transition-colors" style={{ backgroundColor: azul }}>
                  {guardandoCliente ? 'Guardando...' : 'Crear contrato'}
                </button>
                <button type="button" onClick={() => setModalContratoExistente(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm transition-colors">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
