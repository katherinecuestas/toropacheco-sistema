'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const azul = '#1F3A5F'
const dorado = '#C7B88A'

export default function RegistroClientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', rut: '', password: '', confirmar: '' })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.nombre || !form.email || !form.password) {
      setError('Nombre, email y contraseña son obligatorios.')
      return
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (form.password !== form.confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    setError('')
    const res = await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: form.nombre, email: form.email, password: form.password, telefono: form.telefono, rut: form.rut }),
    })
    const resultado = await res.json()
    setLoading(false)
    if (resultado.success) {
      router.push('/login?registro=ok')
    } else {
      setError(resultado.error || 'Error al crear la cuenta.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#FDFBF5', fontFamily: 'var(--font-inter), sans-serif' }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold mx-auto mb-3"
            style={{ backgroundColor: azul }}>⚖</div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair), serif', color: azul }}>
            Crear cuenta de cliente
          </h1>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>Toro Pacheco & Asociados</p>
        </div>

        <div className="rounded-2xl shadow-sm border p-8" style={{ backgroundColor: 'white', borderColor: '#EDE8DC' }}>
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm border" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#DC2626' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Nombre completo *', name: 'nombre', type: 'text', placeholder: 'Juan Pérez' },
              { label: 'RUT', name: 'rut', type: 'text', placeholder: '12.345.678-9' },
              { label: 'Email *', name: 'email', type: 'email', placeholder: 'tu@email.com' },
              { label: 'Teléfono', name: 'telefono', type: 'tel', placeholder: '+56 9 1234 5678' },
              { label: 'Contraseña *', name: 'password', type: 'password', placeholder: 'Mínimo 6 caracteres' },
              { label: 'Confirmar contraseña *', name: 'confirmar', type: 'password', placeholder: 'Repite la contraseña' },
            ].map(field => (
              <div key={field.name}>
                <label className="block text-xs font-semibold mb-1.5 tracking-wide" style={{ color: azul }}>
                  {field.label}
                </label>
                <input
                  name={field.name}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={form[field.name as keyof typeof form]}
                  onChange={handleChange}
                  disabled={loading}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors"
                  style={{ borderColor: '#E5E7EB', color: '#1F2937' }}
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold tracking-wider mt-2 transition-opacity disabled:opacity-60"
              style={{ backgroundColor: azul, color: dorado }}
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: '#9CA3AF' }}>
            ¿Ya tienes cuenta?{' '}
            <a href="/login" className="font-semibold" style={{ color: azul }}>Iniciar sesión</a>
          </p>
        </div>
      </div>
    </div>
  )
}
