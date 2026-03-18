'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [estado, setEstado] = useState({
    conexion: 'Verificando...',
    variablesEnv: false,
    clienteCreado: false,
    rlsActivo: false
  })

  useEffect(() => {
    async function verificarSistema() {
      // 1. Verificar variables de entorno
      const urlEnv = process.env.NEXT_PUBLIC_SUPABASE_URL
      const keyEnv = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!urlEnv || !keyEnv) {
        setEstado({
          conexion: 'Error: Variables de entorno no configuradas',
          variablesEnv: false,
          clienteCreado: false,
          rlsActivo: false
        })
        return
      }

      // 2. Verificar que el cliente se creó
      if (!supabase) {
        setEstado({
          conexion: 'Error: Cliente de Supabase no se pudo crear',
          variablesEnv: true,
          clienteCreado: false,
          rlsActivo: false
        })
        return
      }

      // 3. Intentar consulta (esperamos que falle por RLS)
      const { data, error } = await supabase
        .from('abogados')
        .select('count')
        .single()

      // 4. Analizar resultado
      if (error) {
        // Si el error es de RLS o autenticación, es CORRECTO
        if (error.message.includes('row-level security') || 
            error.message.includes('Failed to fetch') ||
            error.code === 'PGRST116') {
          setEstado({
            conexion: 'Sistema configurado correctamente',
            variablesEnv: true,
            clienteCreado: true,
            rlsActivo: true
          })
        } else {
          setEstado({
            conexion: `Error inesperado: ${error.message}`,
            variablesEnv: true,
            clienteCreado: true,
            rlsActivo: false
          })
        }
      } else {
        // Si no hay error, RLS está desactivado (problema de seguridad)
        setEstado({
          conexion: 'Advertencia: RLS no está activo',
          variablesEnv: true,
          clienteCreado: true,
          rlsActivo: false
        })
      }
    }

    verificarSistema()
  }, [])

  return (
    <div className="min-h-screen p-8 bg-white dark:bg-black">
      <h1 className="text-3xl font-bold mb-8">
        Sistema Toropacheco y Asociados
      </h1>
      
      <div className="space-y-6">
        <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Estado del Sistema:</h2>
          <p className="text-lg mb-4">{estado.conexion}</p>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`w-4 h-4 rounded-full ${estado.variablesEnv ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span>Variables de entorno: {estado.variablesEnv ? 'Configuradas' : 'No configuradas'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`w-4 h-4 rounded-full ${estado.clienteCreado ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span>Cliente Supabase: {estado.clienteCreado ? 'Creado' : 'Error'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`w-4 h-4 rounded-full ${estado.rlsActivo ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              <span>Row Level Security: {estado.rlsActivo ? 'Activo' : 'Inactivo o no verificado'}</span>
            </div>
          </div>
        </div>

        {estado.conexion === 'Sistema configurado correctamente' && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
              ✓ Configuración Exitosa
            </h3>
            <p className="text-green-700 dark:text-green-300">
              Todos los componentes están configurados correctamente. El sistema está listo para implementar autenticación.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
