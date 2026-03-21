'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { obtenerSesion, obtenerDatosAbogado, cerrarSesion } from '@/lib/auth'
import {
  obtenerMisConsultas,
  responderConsulta,
  rechazarConsulta,
  type Consulta
} from '@/lib/consultas'

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [abogado, setAbogado] = useState<any>(null)
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [consultaActiva, setConsultaActiva] = useState<number | null>(null)
  const [textoRespuesta, setTextoRespuesta] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)

  useEffect(() => {
    async function cargarDatos() {
      const { session } = await obtenerSesion()
      if (!session) {
        router.push('/login')
        return
      }
      const { abogado: datosAbogado } = await obtenerDatosAbogado()
      setAbogado(datosAbogado)

      const { consultas: listaConsultas } = await obtenerMisConsultas()
      if (listaConsultas) setConsultas(listaConsultas)

      setLoading(false)
    }
    cargarDatos()
  }, [router])

  async function handleCerrarSesion() {
    await cerrarSesion()
    router.push('/login')
  }

  async function handleResponder(consultaId: number) {
    if (!textoRespuesta.trim()) {
      setMensaje({ tipo: 'error', texto: 'La respuesta no puede estar vacía.' })
      return
    }
    setEnviando(true)
    const { success, error } = await responderConsulta(consultaId, textoRespuesta, abogado.id)
    if (success) {
      setMensaje({ tipo: 'exito', texto: 'Respuesta enviada correctamente.' })
      setConsultaActiva(null)
      setTextoRespuesta('')
      const { consultas: actualizadas } = await obtenerMisConsultas()
      if (actualizadas) setConsultas(actualizadas)
    } else {
      setMensaje({ tipo: 'error', texto: error || 'Error al enviar respuesta.' })
    }
    setEnviando(false)
    setTimeout(() => setMensaje(null), 4000)
  }

  async function handleRechazar(consultaId: number) {
    setEnviando(true)
    const { success, error } = await rechazarConsulta(consultaId)
    if (success) {
      setMensaje({ tipo: 'exito', texto: 'Consulta rechazada.' })
      const { consultas: actualizadas } = await obtenerMisConsultas()
      if (actualizadas) setConsultas(actualizadas)
    } else {
      setMensaje({ tipo: 'error', texto: error || 'Error al rechazar.' })
    }
    setEnviando(false)
    setTimeout(() => setMensaje(null), 4000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-600">Cargando...</p>
      </div>
    )
  }

  const consultasNuevas = consultas.filter(c => c.estado === 'nueva')
  const consultasRespondidas = consultas.filter(c => c.estado === 'respondida')
  const consultasRechazadas = consultas.filter(c => c.estado === 'rechazada')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Toropacheco y Asociados</h1>
            <p className="text-xs text-gray-500">Panel de Administración</p>
          </div>
          <button
            onClick={handleCerrarSesion}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

        {/* Mensaje de éxito o error */}
        {mensaje && (
          <div className={`mb-6 p-4 rounded-lg text-sm font-medium ${
            mensaje.tipo === 'exito'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {mensaje.texto}
          </div>
        )}

        {/* Bienvenida */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Bienvenida, {abogado?.nombre_negocio}
          </h2>
          <p className="text-gray-500 mt-1">{abogado?.email}</p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-600 rounded-xl p-6 text-white">
            <p className="text-sm font-medium opacity-80">Consultas Nuevas</p>
            <p className="text-4xl font-bold mt-1">{consultasNuevas.length}</p>
          </div>
          <div className="bg-green-600 rounded-xl p-6 text-white">
            <p className="text-sm font-medium opacity-80">Respondidas</p>
            <p className="text-4xl font-bold mt-1">{consultasRespondidas.length}</p>
          </div>
          <div className="bg-gray-700 rounded-xl p-6 text-white">
            <p className="text-sm font-medium opacity-80">Total</p>
            <p className="text-4xl font-bold mt-1">{consultas.length}</p>
          </div>
        </div>

        {/* Lista de consultas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Consultas Recibidas</h3>

          {consultas.length === 0 ? (
            <p className="text-gray-500 text-center py-12">No hay consultas todavía.</p>
          ) : (
            <div className="space-y-4">
              {consultas.map((consulta) => (
                <div
                  key={consulta.id}
                  className={`border rounded-xl p-5 transition-all ${
                    consulta.estado === 'nueva'
                      ? 'border-blue-200 bg-blue-50'
                      : consulta.estado === 'respondida'
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  {/* Cabecera de la consulta */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-lg">{consulta.asunto}</h4>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {consulta.nombre_cliente} · {consulta.email_cliente}
                        {consulta.telefono_cliente && ` · ${consulta.telefono_cliente}`}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      consulta.estado === 'nueva'
                        ? 'bg-blue-100 text-blue-800'
                        : consulta.estado === 'respondida'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {consulta.estado.toUpperCase()}
                    </span>
                  </div>

                  {/* Mensaje del cliente */}
                  <p className="text-gray-700 mb-3">{consulta.mensaje}</p>
                  <p className="text-xs text-gray-400">
                    Recibida: {new Date(consulta.created_at).toLocaleString('es-CL')}
                  </p>

                  {/* Respuesta ya enviada */}
                  {consulta.respuesta && (
                    <div className="mt-4 pt-4 border-t border-green-200">
                      <p className="text-sm font-semibold text-green-800 mb-1">Tu respuesta:</p>
                      <p className="text-gray-700 text-sm">{consulta.respuesta}</p>
                    </div>
                  )}

                  {/* Botones de acción — solo si está en estado 'nueva' */}
                  {consulta.estado === 'nueva' && (
                    <div className="mt-4">
                      {consultaActiva === consulta.id ? (
                        <div className="space-y-3">
                          <textarea
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={4}
                            placeholder="Escribe tu respuesta aquí..."
                            value={textoRespuesta}
                            onChange={(e) => setTextoRespuesta(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleResponder(consulta.id)}
                              disabled={enviando}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              {enviando ? 'Enviando...' : 'Enviar respuesta'}
                            </button>
                            <button
                              onClick={() => {
                                setConsultaActiva(null)
                                setTextoRespuesta('')
                              }}
                              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConsultaActiva(consulta.id)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            Responder
                          </button>
                          <button
                            onClick={() => handleRechazar(consulta.id)}
                            disabled={enviando}
                            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                          >
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
      </main>
    </div>
  )
}
