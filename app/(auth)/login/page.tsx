'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { iniciarSesion } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

const azul = '#1F3A5F'
const dorado = '#C7B88A'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const registroOk = searchParams.get('registro') === 'ok'
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

    const { data: abogado } = await supabase.from('abogados').select('id').eq('auth_user_id', user.id).maybeSingle()
    if (abogado) { router.push('/dashboard'); return }

    const { data: admin } = await supabase.from('admins').select('id').eq('auth_user_id', user.id).maybeSingle()
    if (admin) { router.push('/admin'); return }

    router.push('/mi-cuenta')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#FDFBF5', fontFamily: 'var(--font-inter), sans-serif' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold mx-auto mb-3"
            style={{ backgroundColor: azul }}>⚖</div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair), serif', color: azul }}>
            Iniciar sesión
          </h1>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>Toro Pacheco & Asociados</p>
        </div>

        <div className="rounded-2xl shadow-sm border p-8" style={{ backgroundColor: 'white', borderColor: '#EDE8DC' }}>
          {registroOk && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm border" style={{ backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', color: '#15803D' }}>
              ¡Cuenta creada! Ya puedes iniciar sesión.
            </div>
          )}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm border" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#DC2626' }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 tracking-wide" style={{ color: azul }}>Email</label>
              <input name="email" type="email" required disabled={loading} placeholder="tu@email.com"
                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                style={{ borderColor: '#E5E7EB', color: '#1F2937' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 tracking-wide" style={{ color: azul }}>Contraseña</label>
              <input name="password" type="password" required disabled={loading} placeholder="Tu contraseña"
                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                style={{ borderColor: '#E5E7EB', color: '#1F2937' }} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold tracking-wider transition-opacity disabled:opacity-60"
              style={{ backgroundColor: azul, color: dorado }}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
          <div className="mt-6 pt-6 border-t text-center space-y-2" style={{ borderColor: '#F3F4F6' }}>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              ¿Eres cliente nuevo?{' '}
              <a href="/registro-cliente" className="font-semibold" style={{ color: azul }}>Crear cuenta</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}