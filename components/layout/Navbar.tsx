'use client'

import { useState } from 'react'
import { azul, dorado, azulProfundo } from '@/lib/brand'

export default function Navbar() {
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <nav className="fixed top-0 w-full z-50" style={{ backgroundColor: azulProfundo }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center py-4">
        <a href="#inicio">
          <img src="/logo_claro.png" alt="Toro Pacheco & Asociados" className="h-10 sm:h-16 w-auto" />
        </a>

        <div className="hidden md:flex gap-8 text-base font-medium">
          <a href="#servicios" className="text-white transition-colors hover:text-[#C7B88A]">Servicios</a>
          <a href="#como-funciona" className="text-white transition-colors hover:text-[#C7B88A]">Proceso</a>
          <a href="#consulta" className="text-white transition-colors hover:text-[#C7B88A]">Contacto</a>
          <a href="/login" className="text-white transition-colors hover:text-[#C7B88A]">Mi cuenta</a>
        </div>

        <div className="flex items-center gap-2">
          <a href="/registro-cliente"
            className="hidden md:flex items-center text-sm font-semibold px-4 py-2.5 rounded-full border transition-colors"
            style={{ borderColor: dorado + '66', color: dorado }}>
            Crear cuenta
          </a>
          <a href="https://wa.me/56950944482" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs sm:text-sm font-bold px-3 sm:px-5 py-2 sm:py-2.5 rounded-full transition-all hover:opacity-90"
            style={{ backgroundColor: dorado, color: azulProfundo, boxShadow: '0 4px 14px 0 rgba(199,184,138,0.3)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={azulProfundo} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <span className="hidden sm:inline">Contáctanos</span>
          </a>

          <button
            onClick={() => setMenuAbierto(v => !v)}
            className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-lg"
            aria-label="Menú">
            <span className={`block w-5 h-0.5 transition-all origin-center ${menuAbierto ? 'rotate-45 translate-y-2' : ''}`} style={{ backgroundColor: dorado }} />
            <span className={`block w-5 h-0.5 transition-all ${menuAbierto ? 'opacity-0' : ''}`} style={{ backgroundColor: dorado }} />
            <span className={`block w-5 h-0.5 transition-all origin-center ${menuAbierto ? '-rotate-45 -translate-y-2' : ''}`} style={{ backgroundColor: dorado }} />
          </button>
        </div>
      </div>

      {menuAbierto && (
        <div className="md:hidden border-t px-4 py-4 flex flex-col gap-1" style={{ backgroundColor: azulProfundo, borderColor: '#243B55' }}>
          {[
            { href: '#servicios', label: 'Servicios' },
            { href: '#como-funciona', label: 'Proceso' },
            { href: '#consulta', label: 'Contacto' },
          ].map(({ href, label }) => (
            <a key={href} href={href} onClick={() => setMenuAbierto(false)}
              className="py-3 px-4 rounded-xl text-sm font-medium text-white hover:bg-white/10 transition-colors">
              {label}
            </a>
          ))}
          <div className="h-px my-1" style={{ backgroundColor: '#243B55' }} />
          <a href="/login" onClick={() => setMenuAbierto(false)}
            className="py-3 px-4 rounded-xl text-sm font-semibold transition-colors"
            style={{ color: dorado }}>
            Mi cuenta →
          </a>
          <a href="/registro-cliente" onClick={() => setMenuAbierto(false)}
            className="py-3 px-4 rounded-xl text-sm font-semibold border transition-colors text-center"
            style={{ borderColor: dorado + '44', color: dorado }}>
            Crear cuenta
          </a>
        </div>
      )}
    </nav>
  )
}
