'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { iniciarSesion } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    // Validaciones básicas
    if (!email || !password) {
      setError('Email y contraseña son obligatorios')
      setLoading(false)
      return
    }

    // Llamar función de login
    const resultado = await iniciarSesion(email, password)

    setLoading(false)

    if (resultado.success) {
      // Redirigir al dashboard
      router.push('/dashboard')
    } else {
      setError(resultado.error || 'Error al iniciar sesión')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Iniciar sesión
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

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Correo electrónico
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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                disabled={loading}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm disabled:opacity-50"
                placeholder="Tu contraseña"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </div>

          <div className="text-center">
            <a href="/registro" className="text-sm text-indigo-600 hover:text-indigo-500">
              ¿No tienes cuenta? Crear una
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
