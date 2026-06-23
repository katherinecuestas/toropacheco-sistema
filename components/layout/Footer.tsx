import { azul, dorado } from '@/lib/brand'

export default function Footer() {
  return (
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
            <li>Deudas y Cobranzas</li>
            <li>Derecho Tributario</li>
            <li>Derecho Laboral</li>
            <li>Derecho Civil</li>
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
          <a href="https://www.linkedin.com/in/branco-toro/" target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="6" fill="#1F3A5F"/>
              <path d="M10.667 13.333H13.333V21.333H10.667V13.333ZM12 12C11.264 12 10.667 11.403 10.667 10.667C10.667 9.931 11.264 9.333 12 9.333C12.736 9.333 13.333 9.931 13.333 10.667C13.333 11.403 12.736 12 12 12ZM21.333 21.333H18.667V17.333C18.667 16.229 17.771 15.333 16.667 15.333C15.563 15.333 14.667 16.229 14.667 17.333V21.333H12V13.333H14.667V14.485C15.227 13.768 16.101 13.333 17.067 13.333C19.387 13.333 21.333 15.28 21.333 17.6V21.333Z" fill="#C7B88A"/>
            </svg>
          </a>
          <a href="https://www.instagram.com/toropachecoasociados/" target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="6" fill="#1F3A5F"/>
              <rect x="9" y="9" width="14" height="14" rx="4" stroke="#C7B88A" strokeWidth="1.5"/>
              <circle cx="16" cy="16" r="3.5" stroke="#C7B88A" strokeWidth="1.5"/>
              <circle cx="20" cy="12" r="1" fill="#C7B88A"/>
            </svg>
          </a>
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
  )
}
