'use client'

import { useState } from 'react'
import Image from 'next/image'
import { azul, dorado, azulProfundo } from '@/lib/brand'

export default function Hero() {
  const [cardActiva, setCardActiva] = useState(-1)

  return (
    <section id="inicio" className="lg:min-h-screen flex items-start pt-28 lg:pt-32 pb-4 lg:pb-0 relative" style={{ backgroundColor: '#FDFBF5' }}>
      <div className="absolute top-0 left-0 right-0 h-28 pointer-events-none z-10"
        style={{ background: `linear-gradient(to bottom, ${azulProfundo}, transparent)` }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end py-1 relative">

          {/* ── Columna izquierda: título, texto, botones ── */}
          <div className="lg:col-span-4 flex flex-col justify-center pb-2 lg:pb-24 pt-4 lg:pt-0 relative z-10">

            <div className="flex items-end gap-3 lg:block mb-6">
              <h1 className="flex-1 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight lg:leading-[0.9] lg:mb-6 backdrop-blur-sm rounded-2xl px-4 py-3 -mx-4"
                style={{ fontFamily: 'var(--font-playfair), serif', letterSpacing: '0.01em', backgroundColor: 'rgba(253,251,245,0.55)' }}>
                <span style={{ color: azul, display: 'block', animation: 'fadeUp 0.6s ease both' }}>Paramos</span>
                <span style={{ color: azul, display: 'block', animation: 'fadeUp 0.6s ease both', animationDelay: '150ms' }}>tu embargo</span>
                <span style={{
                  display: 'block',
                  background: `linear-gradient(90deg, ${dorado} 30%, #FFF8DC 50%, ${dorado} 70%)`,
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'fadeUpScale 0.6s ease both, textShimmer 3s linear 1s infinite',
                  animationDelay: '300ms, 0ms',
                }}>HOY</span>
              </h1>

              {/* Imagen solo en móvil/tablet */}
              <div className="flex-shrink-0 lg:hidden self-end" style={{ transform: 'translateX(-16px)' }}>
                <img
                  src="/justicia2.png"
                  alt="Toro Pacheco & Asociados"
                  className="h-54 sm:h-52 md:h-64 w-auto object-contain object-bottom"
                  style={{
                    maskImage: 'linear-gradient(to top, transparent 0%, black 18%)',
                    WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 18%)'
                  }}
                />
              </div>
            </div>

            <p className="text-base leading-relaxed mb-8 text-center lg:text-left" style={{ color: '#5A6474' }}>
              ¿Tienes un juicio ejecutivo, embargo o deuda que no puedes pagar? <br />
              Te ayudamos a defenderte legalmente.
            </p>
            <p className="text-lg font-bold text-center lg:text-left" style={{ color: '#1F2937' }}>
              Primera consulta completamente gratis.
            </p>
            <p className="text-sm mt-1 mb-6" style={{ color: '#5A6474' }}></p>

            <div className="flex flex-col sm:flex-row gap-3 mb-10 justify-center lg:justify-start">
              <a href="#consulta" className="px-7 py-3.5 text-sm font-bold tracking-wider rounded-full transition-colors text-center"
                style={{ backgroundColor: azul }}>
                <span style={{
                  background: `linear-gradient(90deg, ${dorado} 30%, #FFF8DC 50%, ${dorado} 70%)`,
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'textShimmer 3s linear 1s infinite',
                }}>Consulta gratis</span>
              </a>
              <a href="#como-funciona" className="px-7 py-3.5 text-sm font-bold tracking-wider rounded-full border transition-colors text-center"
                style={{ borderColor: azul, color: azul }}>
                Cómo funciona →
              </a>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 border-t mx-auto lg:mx-0" style={{ borderColor: '#EDE8DC' }}>
              {[
                { número: '24h', texto: 'Respuesta garantizada' },
                { número: '90%', texto: 'Éxito en juicios' },
                { número: '+50', texto: 'Clientes atendidos' },
                { número: '100%', texto: 'Compromiso con el cliente' },
              ].map(stat => (
                <div key={stat.texto} className="text-center lg:text-left">
                  <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-playfair), serif', color: azul }}>
                    {stat.número}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{stat.texto}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Columna central: imagen grande desktop ── */}
          <div className="hidden lg:flex lg:col-span-5 items-end justify-center h-full relative z-20" style={{ marginLeft: '-4rem', marginRight: '-2rem' }}>
            <div className="w-full h-[750px] relative flex items-end justify-center">
              <Image
                src="/justicia2.png"
                alt="Toro Pacheco & Asociados"
                width={600}
                height={750}
                priority
                className="h-full w-auto object-contain object-bottom drop-shadow-2xl"
                style={{
                  maxWidth: '140%',
                  maskImage: 'linear-gradient(to top, transparent 0%, black 15%)',
                  WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 15%)'
                }}
              />

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

          {/* ── Columna derecha: cards ÁREAS DE PRÁCTICA (solo desktop) ── */}
          <div className="hidden lg:flex lg:col-span-3 flex-col justify-end pb-16 space-y-3 relative z-10">
            <p className="text-xs font-bold tracking-widest mb-2" style={{ color: dorado }}>ÁREAS DE PRÁCTICA</p>

            {[
              { icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="#C7B88A" strokeWidth="1.5"/><path d="M12 8V12L14.5 14.5" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 6.5C9 6.5 10 4 12 4C14 4 15 6.5 15 6.5" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round"/></svg>, titulo: 'Deudas y Cobranzas', desc: 'Defensa ante juicios y embargos.' },
              { icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="#C7B88A" strokeWidth="1.5"/><path d="M8 8H16" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round"/><path d="M8 12H16" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round"/><path d="M8 16H12" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round"/></svg>, titulo: 'Derecho Tributario', desc: 'Defensa ante SII, multas y fiscalizaciones.' },
              { icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M12 3V21" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round"/><path d="M6 6H18" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round"/><path d="M7 6L4 13H10L7 6Z" stroke="#C7B88A" strokeWidth="1.5" strokeLinejoin="round"/><path d="M17 6L14 13H20L17 6Z" stroke="#C7B88A" strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 21H15" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round"/></svg>, titulo: 'Derecho Laboral', desc: 'Despidos, finiquitos y acoso laboral.' },
              { icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M4 9L12 4L20 9H4Z" stroke="#C7B88A" strokeWidth="1.5" strokeLinejoin="round"/><path d="M6 10V18" stroke="#C7B88A" strokeWidth="1.5"/><path d="M10 10V18" stroke="#C7B88A" strokeWidth="1.5"/><path d="M14 10V18" stroke="#C7B88A" strokeWidth="1.5"/><path d="M18 10V18" stroke="#C7B88A" strokeWidth="1.5"/><path d="M4 20H20" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round"/></svg>, titulo: 'Derecho Civil', desc: 'Contratos, herencias y arrendamientos.' },
              { icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="13" rx="1.5" stroke="#C7B88A" strokeWidth="1.5"/><path d="M7 7V5C7 3.9 7.9 3 9 3H15C16.1 3 17 3.9 17 5V7" stroke="#C7B88A" strokeWidth="1.5" strokeLinejoin="round"/><path d="M3 12H21" stroke="#C7B88A" strokeWidth="1.5"/><path d="M10 12V16" stroke="#C7B88A" strokeWidth="1.5"/><path d="M14 12V16" stroke="#C7B88A" strokeWidth="1.5"/></svg>, titulo: 'Derecho Comercial', desc: 'Empresas y contratos comerciales.' },
            ].map((s, i) => (
              <div key={s.titulo}
                className="flex items-start gap-4 p-5 rounded-xl border hover:shadow-md cursor-pointer"
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderColor: cardActiva === i ? azul : '#EDE8DC',
                  backgroundColor: cardActiva === i ? azul : 'white',
                  transform: cardActiva === i ? 'translateY(-3px)' : 'translateY(0)',
                  transition: 'all 0.3s ease',
                  animation: 'slideInFromRight 0.5s ease both',
                  animationDelay: `${i * 100}ms`,
                }}
                onMouseEnter={() => setCardActiva(i)}
                onMouseLeave={() => setCardActiva(-1)}
              >
                {cardActiva === i && (
                  <div className="shimmer" style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '60px',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(199,184,138,0.4), transparent)',
                    pointerEvents: 'none',
                  }} />
                )}
                <span className="flex-shrink-0">{s.icon}</span>
                <div>
                  <p className="text-base font-bold leading-tight" style={{ color: cardActiva === i ? '#FFFFFF' : azul }}>
                    {s.titulo}
                  </p>
                  <p className="text-sm mt-0.5 leading-relaxed" style={{ color: cardActiva === i ? '#EDE8DC' : '#6B7280' }}>
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
  )
}
