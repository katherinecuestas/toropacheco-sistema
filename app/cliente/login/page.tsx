'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { iniciarSesion } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

const azul = '#1F3A5F'
const dorado = '#C7B88A'

export default function ClienteLoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    const email = fd.get('email') as string
    const password = fd.get('password') as string

    const resultado = await iniciarSesion(email, password)
    if (!resultado.success) {
      setError(resultado.error || 'Credenciales incorrectas.')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Error al obtener sesión.'); setLoading(false); return }

    const { data: cliente } = await supabase
      .from('clientes')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!cliente) {
      setError('Esta cuenta no corresponde a un cliente registrado.')
      setLoading(false)
      return
    }

    router.push('/cliente/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#FDFBF5', fontFamily: 'var(--font-inter), sans-serif' }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block rounded-2xl px-6 py-3 mb-1" style={{ backgroundColor: azul }}>
            <img src="/logo_claro.png" alt="Toro Pacheco & Asociados" className="h-16 w-auto mx-auto" />
          </div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair), serif', color: azul }}>
            Portal del Cliente
          </h1>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>Toro Pacheco & Asociados</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl shadow-sm border p-8" style={{ backgroundColor: 'white', borderColor: '#EDE8DC' }}>
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm border"
              style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#DC2626' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 tracking-wide" style={{ color: azul }}>
                Correo electrónico
              </label>
              <input name="email" type="email" required disabled={loading}
                placeholder="tu@email.com"
                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2"
                style={{ borderColor: '#E5E7EB', color: '#1F2937' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 tracking-wide" style={{ color: azul }}>
                Contraseña
              </label>
              <input name="password" type="password" required disabled={loading}
                placeholder="Tu contraseña"
                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2"
                style={{ borderColor: '#E5E7EB', color: '#1F2937' }} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold tracking-wider transition-opacity disabled:opacity-60"
              style={{ backgroundColor: azul, color: dorado }}>
              {loading ? 'Ingresando...' : 'Ingresar a mi portal'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t text-center" style={{ borderColor: '#F3F4F6' }}>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              ¿Necesitas ayuda?{' '}
              <a href="https://wa.me/56950944482" target="_blank" rel="noopener noreferrer"
                className="font-semibold" style={{ color: azul }}>
                Contáctanos por WhatsApp
              </a>
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <a href="/" className="text-sm hover:opacity-70 transition-opacity" style={{ color: '#9CA3AF' }}>
            ← Volver al sitio
          </a>
        </div>
      </div>
    </div>
  )
}
