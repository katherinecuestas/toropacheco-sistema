'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { enviarConsulta } from '@/lib/consultas'

export default function ConsultaPage() {
  const searchParams = useSearchParams()
  const abogadoId = Number(searchParams.get('id'))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setExito(false)

    const form = e.currentTarget
    const formData = new FormData(form)
    const nombreCliente = formData.get('nombreCliente') as string
    const emailCliente = formData.get('emailCliente') as string
    const telefonoCliente = formData.get('telefonoCliente') as string
    const asunto = formData.get('asunto') as string
    const mensaje = formData.get('mensaje') as string

    // Validaciones
    if (!nombreCliente || !emailCliente || !asunto || !mensaje) {
      setError('Todos los campos obligatorios deben estar llenos')
      setLoading(false)
      return
    }

    if (!abogadoId) {
      setError('Enlace de consulta inválido')
      setLoading(false)
      return
    }

    const resultado = await enviarConsulta(
      abogadoId,
      nombreCliente,
      emailCliente,
      asunto,
      mensaje,
      telefonoCliente || undefined
    )

    setLoading(false)

    if (resultado.success) {
      setExito(true)
      // Limpiar formulario
      form.reset()
    } else {
      setError(resultado.error || 'Error al enviar consulta')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Consulta Gratuita
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sistema Toropacheco y Asociados
          </p>
          <p className="mt-4 text-base text-gray-700 dark:text-gray-300">
            Envíanos tu consulta legal y te responderemos a la brevedad
          </p>
        </div>

        {exito && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 px-4 py-3 rounded">
            <p className="font-semibold">¡Consulta enviada exitosamente!</p>
            <p className="text-sm mt-1">Te responderemos por email a la brevedad.</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="nombreCliente" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre completo *
              </label>
              <input
                id="nombreCliente"
                name="nombreCliente"
                type="text"
                required
                disabled={loading}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm disabled:opacity-50"
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div>
              <label htmlFor="emailCliente" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Correo electrónico *
              </label>
              <input
                id="emailCliente"
                name="emailCliente"
                type="email"
                required
                disabled={loading}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm disabled:opacity-50"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label htmlFor="telefonoCliente" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Teléfono
              </label>
              <input
                id="telefonoCliente"
                name="telefonoCliente"
                type="tel"
                disabled={loading}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm disabled:opacity-50"
                placeholder="+56 9 1234 5678"
              />
            </div>

            <div>
              <label htmlFor="asunto" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Asunto *
              </label>
              <input
                id="asunto"
                name="asunto"
                type="text"
                required
                disabled={loading}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm disabled:opacity-50"
                placeholder="Ej: Consulta sobre divorcio"
              />
            </div>

            <div>
              <label htmlFor="mensaje" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mensaje *
              </label>
              <textarea
                id="mensaje"
                name="mensaje"
                rows={6}
                required
                disabled={loading}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm disabled:opacity-50"
                placeholder="Describe tu consulta legal..."
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Enviando...' : 'Enviar Consulta Gratuita'}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Los campos marcados con * son obligatorios
        </p>
      </div>
    </div>
  )
}