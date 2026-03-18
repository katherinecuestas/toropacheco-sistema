'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { obtenerSesion, obtenerDatosAbogado, cerrarSesion } from '@/lib/auth'

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [abogado, setAbogado] = useState<any>(null)

  useEffect(() => {
    async function verificarSesion() {
      const { session } = await obtenerSesion()

      if (!session) {
        // No hay sesión, redirigir a login
        router.push('/login')
        return
      }

      // Obtener datos del abogado
      const { abogado: datosAbogado } = await obtenerDatosAbogado()
      setAbogado(datosAbogado)
      setLoading(false)
    }

    verificarSesion()
  }, [router])

  async function handleCerrarSesion() {
    await cerrarSesion()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Sistema Toropacheco
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleCerrarSesion}
                className="ml-4 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Bienvenido, {abogado?.nombre_negocio}
            </h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Email:</p>
                <p className="text-lg text-gray-900 dark:text-white">{abogado?.email}</p>
              </div>
              
              {abogado?.telefono && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Teléfono:</p>
                  <p className="text-lg text-gray-900 dark:text-white">{abogado.telefono}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Estado:</p>
                <p className="text-lg text-gray-900 dark:text-white">
                  {abogado?.estado ? 'Activo' : 'Inactivo'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}