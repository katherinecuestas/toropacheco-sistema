'use client'

import { useState } from 'react'
import { enviarConsulta } from '@/lib/consultas'
import { obtenerSlotsDisponibles } from '@/lib/citas'

const ABOGADO_ID = 2

export default function Home() {
  const [tab, setTab] = useState<'texto' | 'video'>('texto')

  // --- Consulta por texto ---
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', asunto: '', mensaje: '' })
  const [enviando, setEnviando] = useState(false)
  const [exito, setExito] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.nombre || !form.email || !form.asunto || !form.mensaje) {
      setError('Por favor completa todos los campos obligatorios.')
      return
    }
    setEnviando(true)
    setError('')
    const { success, error: err } = await enviarConsulta(
      ABOGADO_ID, form.nombre, form.email, form.asunto, form.mensaje, form.telefono
    )
    if (success) {
      setExito(true)
      setForm({ nombre: '', email: '', telefono: '', asunto: '', mensaje: '' })
    } else {
      setError(err || 'Error al enviar. Intenta nuevamente.')
    }
    setEnviando(false)
  }

  // --- Agendar videollamada ---
  const [video, setVideo] = useState({ nombre: '', email: '' })
  const [fechaVideo, setFechaVideo] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [slotSeleccionado, setSlotSeleccionado] = useState('')
  const [cargandoSlots, setCargandoSlots] = useState(false)
  const [agendando, setAgendando] = useState(false)
  const [exitoVideo, setExitoVideo] = useState(false)
  const [errorVideo, setErrorVideo] = useState('')

  async function handleFechaVideo(fecha: string) {
    setFechaVideo(fecha)
    setSlotSeleccionado('')
    if (!fecha) return
    setCargandoSlots(true)
    const { slots: disponibles } = await obtenerSlotsDisponibles(ABOGADO_ID, fecha)
    setSlots(disponibles)
    setCargandoSlots(false)
  }

  async function handleAgendarVideo(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!video.nombre || !video.email || !fechaVideo || !slotSeleccionado) {
      setErrorVideo('Completa todos los campos y selecciona un horario.')
      return
    }
    setAgendando(true)
    setErrorVideo('')
    const res = await fetch('/api/crear-cita', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consultaId: null,
        abogadoId: ABOGADO_ID,
        nombreCliente: video.nombre,
        emailCliente: video.email,
        fechaHora: new Date(`${fechaVideo}T${slotSeleccionado}:00`).toISOString(),
      }),
    })
    const resultado = await res.json()
    if (resultado.success) {
      setExitoVideo(true)
      setVideo({ nombre: '', email: '' })
      setFechaVideo('')
      setSlots([])
      setSlotSeleccionado('')
    } else {
      setErrorVideo(resultado.error || 'Error al agendar. Intenta nuevamente.')
    }
    setAgendando(false)
  }

  function getFechasDisponibles() {
    const fechas = []
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    for (let i = 0; i <= 30; i++) {
      const d = new Date(hoy)
      d.setDate(hoy.getDate() + i)
      fechas.push(d.toISOString().split('T')[0])
    }
    return fechas
  }

  const azul = '#1F3A5F'
  const dorado = '#C7B88A'
  const azulProfundo = '#162B46'

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>

      {/* NAVBAR */}
      <nav className="fixed top-0 w-full z-50" style={{ backgroundColor: azulProfundo }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex justify-between items-center py-4">
          <div>
            <img src="/logo_claro.png" alt="Toro Pacheco & Asociados" className="h-10 sm:h-16 w-auto" />
          </div>
          <div className="hidden md:flex gap-8 text-base font-medium">
            <a href="#servicios" className="text-white transition-colors hover:text-[#C7B88A]">Servicios</a>
            <a href="#como-funciona" className="text-white transition-colors hover:text-[#C7B88A]">Proceso</a>
            <a href="#consulta" className="text-white transition-colors hover:text-[#C7B88A]">Contacto</a>
            <a href="/login" className="text-white transition-colors hover:text-[#C7B88A]">Mi cuenta</a>
          </div>
          <div className="flex items-center gap-2">
            <a href="/registro-cliente" className="hidden md:flex items-center text-sm font-semibold px-4 py-2.5 rounded-full border transition-colors"
              style={{ borderColor: dorado + '66', color: dorado }}>
              Crear cuenta
            </a>
          <a
            href="https://wa.me/56950944482"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs sm:text-sm font-bold px-3 sm:px-5 py-2 sm:py-2.5 rounded-full transition-all hover:opacity-90"
            style={{ backgroundColor: dorado, color: azulProfundo, boxShadow: '0 4px 14px 0 rgba(199,184,138,0.3)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={azulProfundo} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            Contáctanos
          </a>
          </div>
        </div>
      </nav>
      {/* HERO */}
      <section className="min-h-screen flex items-start pt-20 relative" style={{ backgroundColor: '#FDFBF5' }}>
        <div className="absolute top-0 left-0 right-0 h-28 pointer-events-none z-10"
          style={{ background: `linear-gradient(to bottom, ${azulProfundo}, transparent)` }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end py-1 relative">

            <div className="lg:col-span-4 flex flex-col justify-center pb-8 lg:pb-24 pt-4 lg:pt-0 relative z-10">

              {/* Título + imagen lado a lado en móvil/tablet */}
              <div className="flex items-end gap-3 lg:block mb-6">
                <h1 className="flex-1 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight lg:leading-[0.9] lg:mb-6 backdrop-blur-sm rounded-2xl px-4 py-3 -mx-4"
                  style={{ fontFamily: 'var(--font-playfair), serif', letterSpacing: '-0.02em', backgroundColor: 'rgba(253,251,245,0.55)' }}>
                  <span style={{ color: azul }}>Protegemos</span><br />
                  <span style={{ color: azul }}>lo que más</span><br />
                  <span style={{ color: dorado }}>te importa</span>
                </h1>
                {/* Imagen solo en móvil/tablet, junto al título */}
                <div className="flex-shrink-0 lg:hidden self-end">
                  <img
                    src="/justicia2.png"
                    alt="Toro Pacheco & Asociados"
                    className="h-40 sm:h-52 md:h-64 w-auto object-contain object-bottom"
                    style={{
                      maskImage: 'linear-gradient(to top, transparent 0%, black 18%)',
                      WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 18%)'
                    }}
                  />
                </div>
              </div>

              <p className="text-base leading-relaxed mb-8" style={{ color: '#5A6474' }}>
                En Toro Pacheco, transformamos situaciones legales complejas en soluciones claras. Defendiendo tus derechos en Chile.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <a href="#consulta" className="px-7 py-3.5 text-sm font-bold tracking-wider rounded-full transition-colors text-center"
                  style={{ backgroundColor: azul, color: dorado }}>
                  Consulta gratis
                </a>
                <a href="#como-funciona" className="px-7 py-3.5 text-sm font-bold tracking-wider rounded-full border transition-colors text-center"
                  style={{ borderColor: azul, color: azul }}>
                  Cómo funciona →
                </a>
              </div>
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-6 border-t" style={{ borderColor: '#EDE8DC' }}>
                {[
                  { número: '24h', texto: 'Tiempo de respuesta' },
                  { número: '90%', texto: 'Tasa de éxito' },
                ].map(stat => (
                  <div key={stat.texto}>
                    <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-playfair), serif', color: azul }}>
                      {stat.número}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{stat.texto}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Columna central — imagen sin fondo, oculta en móvil */}
            <div className="hidden lg:flex lg:col-span-5 items-end justify-center h-full relative z-20" style={{ marginLeft: '-4rem', marginRight: '-2rem' }}>
            <div className="w-full h-[750px] relative flex items-end justify-center">
              <img
                src="/justicia2.png"
                alt="Toro Pacheco & Asociados"
                className="h-full w-auto object-contain object-bottom drop-shadow-2xl"
                style={{
                  maxWidth: '140%',
                  // ESTO ELIMINA EL CORTE RECTO ABAJO:
                  maskImage: 'linear-gradient(to top, transparent 0%, black 15%)',
                  WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 15%)'
                }}
              />
                {/* Tagline superpuesto */}
                <div className="absolute -bottom-5 left-0 right-0 flex justify-center">
  <div className="rounded-full px-10 py-3.5 border"
    style={{
      backgroundColor: azulProfundo,
      borderColor: dorado + '55',
      boxShadow: '0 8px 30px rgba(0,0,0,0.25)'
    }}>
    <p className="text-[10px] font-bold tracking-[0.45em] text-center uppercase" style={{ color: dorado }}>
      Justicia &nbsp;·&nbsp; Tradición &nbsp;·&nbsp; Confianza
    </p>
  </div>
</div>
              </div>
            </div>

                <div className="hidden lg:flex lg:col-span-3 flex-col justify-end pb-16 space-y-3 relative z-10">
              <p className="text-xs font-bold tracking-widest mb-2" style={{ color: dorado }}>ÁREAS DE PRÁCTICA</p>
              {[
                { icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M12 3V21" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round"/><path d="M6 6H18" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round"/><path d="M7 6L4 13H10L7 6Z" stroke="#C7B88A" strokeWidth="1.5" strokeLinejoin="round"/><path d="M17 6L14 13H20L17 6Z" stroke="#C7B88A" strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 21H15" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round"/></svg>, titulo: 'Derecho Laboral', desc: 'Despidos, finiquitos y acoso laboral.' },
                { icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M4 9L12 4L20 9H4Z" stroke="#C7B88A" strokeWidth="1.5" strokeLinejoin="round"/><path d="M6 10V18" stroke="#C7B88A" strokeWidth="1.5"/><path d="M10 10V18" stroke="#C7B88A" strokeWidth="1.5"/><path d="M14 10V18" stroke="#C7B88A" strokeWidth="1.5"/><path d="M18 10V18" stroke="#C7B88A" strokeWidth="1.5"/><path d="M4 20H20" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round"/></svg>, titulo: 'Derecho Civil', desc: 'Contratos, herencias y arrendamientos.' },
                { icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="8" r="2.5" stroke="#C7B88A" strokeWidth="1.5"/><circle cx="16" cy="8" r="2.5" stroke="#C7B88A" strokeWidth="1.5"/><circle cx="12" cy="14" r="2" stroke="#C7B88A" strokeWidth="1.5"/><path d="M4 20C4.5 16.8 6 14.5 8 14.5" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round"/><path d="M20 20C19.5 16.8 18 14.5 16 14.5" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round"/><path d="M9 20C9.3 17.8 10.4 16.5 12 16.5C13.6 16.5 14.7 17.8 15 20" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round"/></svg>, titulo: 'Derecho de Familia', desc: 'Divorcios, tuición y alimentos.' },
                { icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="13" rx="1.5" stroke="#C7B88A" strokeWidth="1.5"/><path d="M7 7V5C7 3.9 7.9 3 9 3H15C16.1 3 17 3.9 17 5V7" stroke="#C7B88A" strokeWidth="1.5" strokeLinejoin="round"/><path d="M3 12H21" stroke="#C7B88A" strokeWidth="1.5"/><path d="M10 12V16" stroke="#C7B88A" strokeWidth="1.5"/><path d="M14 12V16" stroke="#C7B88A" strokeWidth="1.5"/></svg>, titulo: 'Derecho Comercial', desc: 'Empresas y contratos comerciales.' },
                { icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="#C7B88A" strokeWidth="1.5"/><path d="M12 8V12L14.5 14.5" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 6.5C9 6.5 10 4 12 4C14 4 15 6.5 15 6.5" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round"/></svg>, titulo: 'Deudas y Cobranzas', desc: 'Defensa ante juicios y embargos.' },
              ].map((s, i) => (
                <div key={s.titulo}
                  className="flex items-start gap-4 p-5 rounded-xl border transition-all hover:shadow-sm cursor-pointer group"
                  style={{ borderColor: i === 0 ? azul : '#EDE8DC', backgroundColor: i === 0 ? azul : 'white' }}>
                  <span className="flex-shrink-0">{s.icon}</span>
                  <div>
                    <p className="text-base font-bold leading-tight" style={{ color: i === 0 ? '#FFFFFF' : azul }}>
                      {s.titulo}
                    </p>
                    <p className="text-sm mt-0.5 leading-relaxed" style={{ color: i === 0 ? '#EDE8DC' : '#6B7280' }}>
                      {s.desc}
                    </p>
                  </div>
                </div>
              ))}
              <a href="#servicios" className="text-xs font-semibold text-center pt-2 transition-colors hover:opacity-70"
                style={{ color: azul }}>
                Ver todos los servicios →
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* SERVICIOS */}
      <section id="servicios" className="py-16 sm:py-24 px-4 sm:px-6" style={{ backgroundColor: '#F5F7FA' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold tracking-widest mb-3" style={{ color: dorado }}>NUESTRAS ESPECIALIDADES</p>
            <h2 className="text-2xl sm:text-4xl font-bold mb-3" style={{ fontFamily: 'var(--font-playfair), serif', color: azul }}>
              Áreas de práctica
            </h2>
            <div className="w-16 h-0.5 mx-auto" style={{ backgroundColor: dorado }} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { titulo: 'Derecho Laboral', descripcion: 'Despidos injustificados, finiquitos, acoso laboral y defensa de trabajadores.' },
              { titulo: 'Derecho Civil', descripcion: 'Contratos, arrendamientos, herencias y resolución de conflictos civiles.' },
              { titulo: 'Derecho Comercial', descripcion: 'Constitución de empresas, contratos comerciales y asesoría empresarial.' },
              { titulo: 'Derecho de Familia', descripcion: 'Divorcios, pensión de alimentos, tuición y régimen de visitas.' },
              { titulo: 'Deudas y Cobranzas', descripcion: 'Defensa ante juicios ejecutivos, embargos y renegociación de deudas.' },
              { titulo: 'Contratos y Documentos', descripcion: 'Redacción y revisión de contratos, poder notarial y documentos legales.' },
            ].map((s) => (
              <div key={s.titulo} className="bg-white p-8 border-t-2 hover:shadow-lg transition-all"
                style={{ borderColor: dorado }}>
                <h3 className="text-lg font-bold mb-3" style={{ fontFamily: 'var(--font-playfair), serif', color: azul }}>
                  {s.titulo}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>{s.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="py-16 sm:py-24 px-4 sm:px-6" style={{ backgroundColor: azulProfundo }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold tracking-widest mb-3" style={{ color: dorado }}>PROCESO</p>
            <h2 className="text-2xl sm:text-4xl font-bold text-white" style={{ fontFamily: 'var(--font-playfair), serif' }}>
              Cómo funciona
            </h2>
            <div className="w-16 h-0.5 mx-auto mt-4" style={{ backgroundColor: dorado }} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { paso: '01', titulo: 'Envía tu consulta', descripcion: 'Completa el formulario con tu situación legal. Es gratis y sin compromiso.' },
              { paso: '02', titulo: 'Recibe respuesta', descripcion: 'Un abogado especialista revisa tu caso y te responde en menos de 24 horas.' },
              { paso: '03', titulo: 'Resuelve tu caso', descripcion: 'Agenda una videollamada o contrata nuestros servicios para continuar.' },
            ].map((item) => (
              <div key={item.paso} className="text-center">
                <p className="text-5xl font-bold mb-4" style={{ color: dorado, fontFamily: 'var(--font-playfair), serif', opacity: 0.4 }}>
                  {item.paso}
                </p>
                <h3 className="text-lg font-semibold text-white mb-2">{item.titulo}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#C7B88A99' }}>{item.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FORMULARIO DE CONSULTA */}
      <section id="consulta" className="py-16 sm:py-24 px-4 sm:px-6" style={{ backgroundColor: '#F5F7FA' }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-bold tracking-widest mb-3" style={{ color: dorado }}>COMIENZA HOY</p>
            <h2 className="text-2xl sm:text-4xl font-bold mb-3" style={{ fontFamily: 'var(--font-playfair), serif', color: azul }}>
              ¿Cómo quieres comenzar?
            </h2>
            <div className="w-16 h-0.5 mx-auto mb-4" style={{ backgroundColor: dorado }} />
            <p className="text-sm" style={{ color: '#6B7280' }}>Elige la opción que mejor se adapte a tu situación</p>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl p-1 mb-6 border" style={{ backgroundColor: 'white', borderColor: '#E5E7EB' }}>
            <button
              onClick={() => setTab('texto')}
              className="flex-1 py-3 text-sm font-semibold rounded-lg transition-all"
              style={tab === 'texto'
                ? { backgroundColor: azul, color: 'white' }
                : { color: '#6B7280' }}
            >
              ✉️ Consulta gratuita
            </button>
            <button
              onClick={() => setTab('video')}
              className="flex-1 py-3 text-sm font-semibold rounded-lg transition-all"
              style={tab === 'video'
                ? { backgroundColor: azul, color: 'white' }
                : { color: '#6B7280' }}
            >
              🎥 Agendar videollamada
            </button>
          </div>

          {/* TAB: CONSULTA POR TEXTO */}
          {tab === 'texto' && (
            <div className="bg-white rounded-2xl p-5 sm:p-8 shadow-sm border" style={{ borderColor: '#E5E7EB' }}>
              {exito ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: '#F0F7EE' }}>
                    <span className="text-3xl">✅</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair), serif', color: azul }}>
                    ¡Consulta enviada!
                  </h3>
                  <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
                    Te responderemos a tu email en menos de 24 horas.
                  </p>
                  <button onClick={() => setExito(false)}
                    className="text-sm font-medium underline"
                    style={{ color: azul }}>
                    Enviar otra consulta
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="text-sm p-4 rounded-lg border" style={{ backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', color: '#B91C1C' }}>
                      {error}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Nombre completo *</label>
                      <input type="text" name="nombre" value={form.nombre} onChange={handleChange}
                        placeholder="Ej: Juan Pérez"
                        className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 border"
                        style={{ borderColor: '#D1D5DB', '--tw-ring-color': azul } as React.CSSProperties} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Correo electrónico *</label>
                      <input type="email" name="email" value={form.email} onChange={handleChange}
                        placeholder="tu@email.com"
                        className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 border"
                        style={{ borderColor: '#D1D5DB' }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Teléfono</label>
                      <input type="tel" name="telefono" value={form.telefono} onChange={handleChange}
                        placeholder="+56 9 1234 5678"
                        className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 border"
                        style={{ borderColor: '#D1D5DB' }} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Asunto *</label>
                      <input type="text" name="asunto" value={form.asunto} onChange={handleChange}
                        placeholder="Ej: Consulta sobre despido"
                        className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 border"
                        style={{ borderColor: '#D1D5DB' }} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Describe tu situación *</label>
                    <textarea name="mensaje" value={form.mensaje} onChange={handleChange} rows={5}
                      placeholder="Cuéntanos con detalle tu situación legal..."
                      className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 border resize-none"
                      style={{ borderColor: '#D1D5DB' }} />
                  </div>
                  <button type="submit" disabled={enviando}
                    className="w-full font-bold py-4 rounded-xl tracking-wide transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: dorado, color: azulProfundo }}>
                    {enviando ? 'Enviando...' : 'ENVIAR CONSULTA GRATUITA'}
                  </button>
                  <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
                    Los campos marcados con * son obligatorios. Tu información es confidencial.
                  </p>
                </form>
              )}
            </div>
          )}

          {/* TAB: AGENDAR VIDEOLLAMADA */}
          {tab === 'video' && (
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
              {exitoVideo ? (
                <div className="text-center py-12 px-8">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#F0F7EE' }}>
                    <span className="text-3xl">🎉</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair), serif', color: azul }}>
                    ¡Videollamada agendada!
                  </h3>
                  <p className="text-sm mb-2" style={{ color: '#6B7280' }}>Te enviamos el enlace de la videollamada a tu email.</p>
                  {fechaVideo && slotSeleccionado && (
                    <p className="text-sm font-semibold mt-3 mb-6" style={{ color: azul }}>
                      📅 {new Date(`${fechaVideo}T${slotSeleccionado}`).toLocaleString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                  <button onClick={() => { setExitoVideo(false); setFechaVideo(''); setSlots([]); setSlotSeleccionado('') }}
                    className="text-sm font-medium underline" style={{ color: azul }}>
                    Agendar otra
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAgendarVideo}>

                  {/* Indicador de pasos */}
                  <div className="flex border-b" style={{ borderColor: '#E5E7EB' }}>
                    {[
                      { n: '1', label: 'Tus datos' },
                      { n: '2', label: 'Fecha' },
                      { n: '3', label: 'Horario' },
                    ].map((paso, i) => {
                      const activo = i === 0
                        ? true
                        : i === 1
                          ? !!(video.nombre && video.email)
                          : !!(video.nombre && video.email && fechaVideo)
                      return (
                        <div key={paso.n} className="flex-1 py-3 flex items-center justify-center gap-2">
                          <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
                            style={{ backgroundColor: activo ? azul : '#E5E7EB', color: activo ? 'white' : '#9CA3AF' }}>
                            {paso.n}
                          </span>
                          <span className="text-xs font-medium hidden sm:block" style={{ color: activo ? azul : '#9CA3AF' }}>
                            {paso.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="p-6 space-y-6">
                    {errorVideo && (
                      <div className="text-sm p-4 rounded-lg border" style={{ backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', color: '#B91C1C' }}>
                        {errorVideo}
                      </div>
                    )}

                    {/* PASO 1: Datos */}
                    <div>
                      <p className="text-xs font-bold tracking-widest mb-3" style={{ color: dorado }}>PASO 1 — TUS DATOS</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Nombre completo *</label>
                          <input type="text" value={video.nombre} onChange={e => setVideo({ ...video, nombre: e.target.value })}
                            placeholder="Ej: Juan Pérez"
                            className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none border"
                            style={{ borderColor: '#D1D5DB' }} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Correo electrónico *</label>
                          <input type="email" value={video.email} onChange={e => setVideo({ ...video, email: e.target.value })}
                            placeholder="tu@email.com"
                            className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none border"
                            style={{ borderColor: '#D1D5DB' }} />
                        </div>
                      </div>
                    </div>

                    <hr style={{ borderColor: '#F3F4F6' }} />

                    {/* PASO 2: Fecha */}
                    <div>
                      <p className="text-xs font-bold tracking-widest mb-3" style={{ color: dorado }}>PASO 2 — ELIGE UNA FECHA</p>
                      <div className="space-y-2">
                        {getFechasDisponibles().slice(0, 14).map(f => {
                          const d = new Date(f + 'T12:00:00')
                          const seleccionada = fechaVideo === f
                          return (
                            <button key={f} type="button" onClick={() => handleFechaVideo(f)}
                              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left"
                              style={seleccionada
                                ? { backgroundColor: azul, borderColor: azul, color: 'white' }
                                : { backgroundColor: 'white', borderColor: '#E5E7EB', color: '#374151' }}>
                              <span className="text-sm font-semibold capitalize">
                                {d.toLocaleDateString('es-CL', { weekday: 'long' })}
                              </span>
                              <span className="text-sm" style={{ color: seleccionada ? '#C7B88A' : '#6B7280' }}>
                                {d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <hr style={{ borderColor: '#F3F4F6' }} />

                    {/* PASO 3: Horario */}
                    <div>
                      <p className="text-xs font-bold tracking-widest mb-3" style={{ color: dorado }}>PASO 3 — ELIGE UN HORARIO</p>

                      {!fechaVideo && (
                        <div className="py-6 text-center rounded-xl border-2 border-dashed" style={{ borderColor: '#E5E7EB' }}>
                          <p className="text-sm" style={{ color: '#9CA3AF' }}>Primero selecciona una fecha arriba</p>
                        </div>
                      )}

                      {cargandoSlots && (
                        <div className="py-6 text-center">
                          <p className="text-sm" style={{ color: '#9CA3AF' }}>Cargando horarios disponibles...</p>
                        </div>
                      )}

                      {!cargandoSlots && fechaVideo && slots.length === 0 && (
                        <div className="py-6 text-center rounded-xl border-2 border-dashed" style={{ borderColor: '#E5E7EB' }}>
                          <p className="text-sm" style={{ color: '#6B7280' }}>No hay horarios disponibles para ese día.</p>
                          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Prueba seleccionando otra fecha.</p>
                        </div>
                      )}

                      {!cargandoSlots && slots.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                          {slots.map(slot => (
                            <button key={slot} type="button" onClick={() => setSlotSeleccionado(slot)}
                              className="py-3 rounded-xl text-sm font-bold border transition-all"
                              style={slotSeleccionado === slot
                                ? { backgroundColor: azul, borderColor: azul, color: 'white' }
                                : { backgroundColor: 'white', borderColor: '#E5E7EB', color: '#374151' }}>
                              {slot}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Resumen + confirmar */}
                    {fechaVideo && slotSeleccionado && (
                      <div className="rounded-xl p-4 border" style={{ backgroundColor: '#F0F4FF', borderColor: '#C7D2FE' }}>
                        <p className="text-sm font-semibold mb-1" style={{ color: azul }}>
                          📅 {new Date(`${fechaVideo}T${slotSeleccionado}`).toLocaleString('es-CL', {
                            weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>Duración: 30 minutos · Enlace de videollamada por email</p>
                      </div>
                    )}

                    <button type="submit" disabled={agendando || !fechaVideo || !slotSeleccionado}
                      className="w-full font-bold py-4 rounded-xl tracking-wide transition-opacity disabled:opacity-40"
                      style={{ backgroundColor: dorado, color: azulProfundo }}>
                      {agendando ? 'Agendando...' : 'CONFIRMAR VIDEOLLAMADA'}
                    </button>
                    <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
                      Tu información es confidencial. Recibirás el enlace de videollamada por correo.
                    </p>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 sm:py-16 px-4 sm:px-6" style={{ backgroundColor: azul }}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 pb-10 border-b" style={{ borderColor: '#2A4F7A' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-playfair), serif' }} className="mb-4">
              <p className="text-white text-lg font-bold tracking-wide">TORO PACHECO</p>
              <p className="text-sm font-normal" style={{ color: dorado }}>&amp; ASOCIADOS</p>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#C7B88A99' }}>
              Defendemos tus derechos con dedicación y compromiso. Soluciones legales claras para cada situación en Chile.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-bold tracking-widest mb-4" style={{ color: dorado }}>SERVICIOS</h4>
            <ul className="space-y-2 text-sm" style={{ color: '#C7B88A99' }}>
              <li>Derecho Laboral</li>
              <li>Derecho Civil</li>
              <li>Derecho de Familia</li>
              <li>Deudas y Cobranzas</li>
              <li>Derecho Comercial</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold tracking-widest mb-4" style={{ color: dorado }}>CONTACTO</h4>
            <ul className="space-y-2 text-sm" style={{ color: '#C7B88A99' }}>
              <li>contacto@toropachecoasociados.cl</li>
              <li>
                <a href="https://wa.me/56950944482" target="_blank" rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity">
                  +56 9 50944482
                </a>
              </li>
              <li>Santiago, Chile</li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs" style={{ color: '#C7B88A66' }}>
            © 2026 Toro Pacheco &amp; Asociados. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-3">
            {/* LinkedIn */}
            <a href="https://www.linkedin.com/in/branco-toro/" target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" rx="6" fill="#1F3A5F"/>
                <path d="M10.667 13.333H13.333V21.333H10.667V13.333ZM12 12C11.264 12 10.667 11.403 10.667 10.667C10.667 9.931 11.264 9.333 12 9.333C12.736 9.333 13.333 9.931 13.333 10.667C13.333 11.403 12.736 12 12 12ZM21.333 21.333H18.667V17.333C18.667 16.229 17.771 15.333 16.667 15.333C15.563 15.333 14.667 16.229 14.667 17.333V21.333H12V13.333H14.667V14.485C15.227 13.768 16.101 13.333 17.067 13.333C19.387 13.333 21.333 15.28 21.333 17.6V21.333Z" fill="#C7B88A"/>
              </svg>
            </a>
            {/* Instagram */}
            <a href="https://www.instagram.com/toropachecoasociados/" target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" rx="6" fill="#1F3A5F"/>
                <rect x="9" y="9" width="14" height="14" rx="4" stroke="#C7B88A" strokeWidth="1.5"/>
                <circle cx="16" cy="16" r="3.5" stroke="#C7B88A" strokeWidth="1.5"/>
                <circle cx="20" cy="12" r="1" fill="#C7B88A"/>
              </svg>
            </a>
            {/* YouTube */}
            <a href="https://www.youtube.com/@estudiandoderechobranco" target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" rx="6" fill="#1F3A5F"/>
                <rect x="8" y="11" width="16" height="10" rx="3" stroke="#C7B88A" strokeWidth="1.5"/>
                <path d="M14 13.5L19 16L14 18.5V13.5Z" fill="#C7B88A"/>
              </svg>
            </a>
          </div>
          <p className="text-xs font-semibold tracking-widest" style={{ color: dorado }}>
            JUSTICIA · TRADICIÓN · CONFIANZA
          </p>
        </div>
      </footer>

    </main>
  )
}