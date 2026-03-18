'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registrarAbogado } from '@/lib/auth'

export default function RegistroPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault() 
    setLoading(true)
    setError(null)
    setMensaje(null)

    const formData = new FormData(e.currentTarget)
    const nombreNegocio = formData.get('nombreNegocio') as string
    const email = formData.get('email') as string
    const telefono = formData.get('telefono') as string
    const password = formData.get('password') as string

    // Validaciones básicas
    if (!nombreNegocio || !email || !password) {
      setError('Todos los campos obligatorios deben estar llenos')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setLoading(false)
      return
    }

    // Llamar función de registro
    const resultado = await registrarAbogado(
      email,
      password,
      nombreNegocio,
      telefono || undefined
    )

    setLoading(false)

    if (resultado.success) {
      setMensaje(resultado.message || 'Cuenta creada exitosamente')
      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } else {
      setError(resultado.error || 'Error al crear cuenta')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Crear cuenta
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Sistema Toropacheco y Asociados
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {mensaje && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 px-4 py-3 rounded">
            {mensaje}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="nombre-negocio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre del negocio *
              </label>
              <input
                id="nombre-negocio"
                name="nombreNegocio"
                type="text"
                required
                disabled={loading}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm disabled:opacity-50"
                placeholder="Ej: Estudio Jurídico González"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Correo electrónico *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                disabled={loading}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm disabled:opacity-50"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Teléfono
              </label>
              <input
                id="telefono"
                name="telefono"
                type="tel"
                disabled={loading}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm disabled:opacity-50"
                placeholder="+56 9 1234 5678"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contraseña *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                disabled={loading}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm disabled:opacity-50"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </div>

          <div className="text-center">
            <a href="/login" className="text-sm text-indigo-600 hover:text-indigo-500">
              ¿Ya tienes cuenta? Inicia sesión
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}