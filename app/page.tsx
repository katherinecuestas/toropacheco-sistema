'use client' // → "le digo a Next.js: este componente corre en el navegador, no en el servidor"

import { useState } from 'react'                        // → "traigo useState para poder tener variables que cambian y re-dibujan la pantalla"
import { enviarConsulta } from '@/lib/consultas'         // → "traigo la función que manda una consulta de texto al servidor"
import { obtenerSlotsDisponibles } from '@/lib/citas'   // → "traigo la función que me dice qué horarios de videollamada están libres"

const ABOGADO_ID = 2 // → "fijo el ID del abogado que va a recibir todo — número 2 en la base de datos"

export default function Home() { // → "declaro el componente principal de la página de inicio y lo exporto para que Next.js lo muestre"

  const [tab, setTab] = useState<'texto' | 'video'>('texto') // → "creo la pestaña activa: puede ser 'texto' o 'video', arranco con 'texto' seleccionado"

  // ─── ESTADOS DEL FORMULARIO DE CONSULTA POR TEXTO ───────────────────────────
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', asunto: '', mensaje: '' }) // → "creo el objeto del formulario con todos los campos vacíos al inicio"
  const [enviando, setEnviando] = useState(false)  // → "bandera: ¿estoy enviando el formulario ahora mismo? arranco en false (no)"
  const [exito, setExito] = useState(false)         // → "bandera: ¿se envió con éxito? arranco en false"
  const [error, setError] = useState('')            // → "guardo el mensaje de error si algo sale mal, arranco vacío"

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) { // → "esta función se activa cada vez que el usuario escribe en un campo"
    setForm({ ...form, [e.target.name]: e.target.value }) // → "copio todos los campos que ya tenía y reemplazo solo el que acaba de cambiar"
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) { // → "esta función se activa cuando el usuario aprieta 'Enviar consulta'"
    e.preventDefault() // → "evito que la página se recargue sola (comportamiento por defecto del formulario HTML)"
    if (!form.nombre || !form.email || !form.asunto || !form.mensaje) { // → "reviso si falta algún campo obligatorio"
      setError('Por favor completa todos los campos obligatorios.') // → "si falta algo, muestro el mensaje de error"
      return // → "paro aquí, no envío nada"
    }
    setEnviando(true)  // → "activo el spinner de carga para que el usuario sepa que estoy trabajando"
    setError('')       // → "limpio cualquier error anterior"
    const { success, error: err } = await enviarConsulta( // → "llamo a la función que envía la consulta y espero la respuesta"
      ABOGADO_ID, form.nombre, form.email, form.asunto, form.mensaje, form.telefono // → "le mando todos los datos del formulario"
    )
    if (success) {                  // → "si todo salió bien..."
      setExito(true)                // → "muestro la pantalla de éxito"
      setForm({ nombre: '', email: '', telefono: '', asunto: '', mensaje: '' }) // → "limpio el formulario para que quede vacío"
    } else {
      setError(err || 'Error al enviar. Intenta nuevamente.') // → "si falló, muestro el error que vino del servidor (o uno genérico)"
    }
    setEnviando(false) // → "apago el spinner de carga, terminé"
  }

  // ─── ESTADOS DE LA VIDEOLLAMADA ───────────────────────────────────────────────
  const [video, setVideo] = useState({ nombre: '', email: '' }) // → "creo el formulario de videollamada con nombre y email vacíos"
  const [fechaVideo, setFechaVideo] = useState('')              // → "guardo la fecha que selecciona el usuario para la videollamada"
  const [slots, setSlots] = useState<string[]>([])              // → "guardo la lista de horarios disponibles para esa fecha"
  const [slotSeleccionado, setSlotSeleccionado] = useState('')  // → "guardo el horario específico que eligió el usuario"
  const [cargandoSlots, setCargandoSlots] = useState(false)     // → "bandera: ¿estoy buscando horarios disponibles ahora mismo?"
  const [agendando, setAgendando] = useState(false)             // → "bandera: ¿estoy confirmando la videollamada ahora mismo?"
  const [exitoVideo, setExitoVideo] = useState(false)           // → "bandera: ¿se agendó la videollamada con éxito?"
  const [errorVideo, setErrorVideo] = useState('')              // → "guardo errores de la videollamada, arranco vacío"

  async function handleFechaVideo(fecha: string) { // → "esta función se activa cuando el usuario elige una fecha"
    setFechaVideo(fecha)       // → "guardo la fecha que eligió"
    setSlotSeleccionado('')    // → "limpio el horario anterior porque cambió la fecha"
    if (!fecha) return         // → "si no hay fecha (la deseleccionó), paro aquí"
    setCargandoSlots(true)     // → "activo el indicador de 'buscando horarios...'"
    const { slots: disponibles } = await obtenerSlotsDisponibles(ABOGADO_ID, fecha) // → "pregunto al servidor qué horarios están libres ese día"
    setSlots(disponibles)      // → "guardo los horarios que me devolvió el servidor"
    setCargandoSlots(false)    // → "apago el indicador de carga"
  }

  async function handleAgendarVideo(e: React.SyntheticEvent) { // → "esta función se activa cuando el usuario confirma la videollamada"
    e.preventDefault() // → "evito que el formulario recargue la página"
    if (!video.nombre || !video.email || !fechaVideo || !slotSeleccionado) { // → "reviso que tenga todos los datos necesarios"
      setErrorVideo('Completa todos los campos y selecciona un horario.') // → "si falta algo, lo aviso"
      return // → "paro, no agenda nada"
    }
    setAgendando(true)  // → "activo el estado de 'agendando...'"
    setErrorVideo('')   // → "limpio errores anteriores"
    const res = await fetch('/api/crear-cita', { // → "hago una petición POST a mi propio servidor para crear la cita"
      method: 'POST',                            // → "le digo que es un POST (envío datos)"
      headers: { 'Content-Type': 'application/json' }, // → "le aviso que voy a mandar datos en formato JSON"
      body: JSON.stringify({                     // → "convierto el objeto a texto JSON para mandarlo"
        consultaId: null,                        // → "no viene de una consulta previa, es directo"
        abogadoId: ABOGADO_ID,                  // → "el abogado que va a tener la videollamada"
        nombreCliente: video.nombre,             // → "nombre del cliente"
        emailCliente: video.email,               // → "email del cliente para mandarle el enlace"
        fechaHora: new Date(`${fechaVideo}T${slotSeleccionado}:00`).toISOString(), // → "combino fecha + hora y lo convierto a formato internacional"
      }),
    })
    const resultado = await res.json() // → "espero la respuesta del servidor y la convierto de JSON a objeto JavaScript"
    if (resultado.success) {           // → "si el servidor confirmó que todo salió bien..."
      setExitoVideo(true)              // → "muestro la pantalla de confirmación"
      setVideo({ nombre: '', email: '' }) // → "limpio el formulario"
      setFechaVideo('')               // → "limpio la fecha seleccionada"
      setSlots([])                    // → "limpio la lista de horarios"
      setSlotSeleccionado('')         // → "limpio el horario seleccionado"
    } else {
      setErrorVideo(resultado.error || 'Error al agendar. Intenta nuevamente.') // → "si falló, muestro el error"
    }
    setAgendando(false) // → "apago el estado de 'agendando...'"
  }

  function getFechasDisponibles() { // → "esta función genera la lista de fechas para los próximos 30 días"
    const fechas = []               // → "arranco con un arreglo vacío"
    const hoy = new Date()          // → "tomo la fecha y hora de hoy"
    hoy.setHours(0, 0, 0, 0)       // → "la pongo a medianoche para que solo me importe el día, no la hora"
    for (let i = 0; i <= 30; i++) { // → "voy a recorrer del día 0 (hoy) al día 30"
      const d = new Date(hoy)       // → "copio la fecha de hoy para no modificarla"
      d.setDate(hoy.getDate() + i)  // → "le sumo i días para avanzar al siguiente"
      fechas.push(d.toISOString().split('T')[0]) // → "convierto la fecha a texto formato YYYY-MM-DD y la agrego a la lista"
    }
    return fechas // → "devuelvo la lista de 31 fechas"
  }

  // ─── ESTADOS DE UI ────────────────────────────────────────────────────────────
  const [menuAbierto, setMenuAbierto] = useState(false) // → "bandera: ¿el menú hamburguesa está abierto en móvil?"
  const [cardActiva, setCardActiva] = useState(-1)      // → "índice de la card que tiene el mouse encima, -1 = ninguna"

  // ─── COLORES DEL PROYECTO ─────────────────────────────────────────────────────
  const azul = '#1F3A5F'        // → "azul marino del estudio, lo uso en todo el sitio"
  const dorado = '#B8A070'      // → "dorado del estudio, para acentos y botones"
  const azulProfundo = '#162B46' // → "azul más oscuro para el navbar y fondos profundos"

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
      {/* → "el contenedor principal ocupa al menos toda la pantalla y usa la fuente Inter" */}

      {/* ═══ NAVBAR ═══════════════════════════════════════════════════════════════ */}
      <nav className="fixed top-0 w-full z-50" style={{ backgroundColor: azulProfundo }}>
        {/* → "la barra de navegación está fija arriba, siempre visible, encima de todo (z-50)" */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center py-4">
          {/* → "contenedor centrado que distribuye el logo a la izquierda y los links a la derecha" */}
          <div>
            <img src="/logo_claro.png" alt="Toro Pacheco & Asociados" className="h-10 sm:h-16 w-auto" />
            {/* → "logo del estudio: pequeño en móvil (h-10), más grande en tablet/desktop (h-16)" */}
          </div>

          {/* Links desktop — solo visibles en pantallas medianas o grandes */}
          <div className="hidden md:flex gap-8 text-base font-medium">
            {/* → "estos links se ocultan en móvil (hidden) y aparecen en md (768px+)" */}
            <a href="#servicios" className="text-white transition-colors hover:text-[#C7B88A]">Servicios</a>
            {/* → "link que lleva a la sección #servicios, al pasar el mouse se vuelve dorado" */}
            <a href="#como-funciona" className="text-white transition-colors hover:text-[#C7B88A]">Proceso</a>
            <a href="#consulta" className="text-white transition-colors hover:text-[#C7B88A]">Contacto</a>
            <a href="/login" className="text-white transition-colors hover:text-[#C7B88A]">Mi cuenta</a>
          </div>

          <div className="flex items-center gap-2">
            {/* → "contenedor de los botones de la derecha del navbar" */}
            <a href="/registro-cliente" className="hidden md:flex items-center text-sm font-semibold px-4 py-2.5 rounded-full border transition-colors"
              style={{ borderColor: dorado + '66', color: dorado }}>
              {/* → "botón 'Crear cuenta': oculto en móvil, visible en desktop, borde dorado semitransparente" */}
              Crear cuenta
            </a>
            <a href="https://wa.me/56950944482" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-bold px-3 sm:px-5 py-2 sm:py-2.5 rounded-full transition-all hover:opacity-90"
              style={{ backgroundColor: dorado, color: azulProfundo, boxShadow: '0 4px 14px 0 rgba(199,184,138,0.3)' }}>
              {/* → "botón de WhatsApp: fondo dorado, texto azul profundo, con sombra dorada difusa" */}
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={azulProfundo} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {/* → "ícono de teléfono dibujado con SVG" */}
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <span className="hidden sm:inline">Contáctanos</span>
              {/* → "el texto 'Contáctanos' se oculta en móvil, solo aparece el ícono" */}
            </a>

            {/* Botón hamburguesa — solo visible en móvil */}
            <button onClick={() => setMenuAbierto(v => !v)}
              className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-lg"
              aria-label="Menú">
              {/* → "al hacer click alterno el estado del menú: si estaba cerrado lo abro, si estaba abierto lo cierro" */}
              <span className={`block w-5 h-0.5 transition-all origin-center ${menuAbierto ? 'rotate-45 translate-y-2' : ''}`} style={{ backgroundColor: dorado }} />
              {/* → "primera línea de la hamburguesa: si el menú está abierto, roto 45° y la bajo para hacer la X" */}
              <span className={`block w-5 h-0.5 transition-all ${menuAbierto ? 'opacity-0' : ''}`} style={{ backgroundColor: dorado }} />
              {/* → "línea del medio: cuando el menú está abierto la hago invisible para completar la X" */}
              <span className={`block w-5 h-0.5 transition-all origin-center ${menuAbierto ? '-rotate-45 -translate-y-2' : ''}`} style={{ backgroundColor: dorado }} />
              {/* → "tercera línea: la roto -45° y la subo para completar la X" */}
            </button>
          </div>
        </div>

        {/* Menú desplegable móvil — solo aparece si menuAbierto es true */}
        {menuAbierto && (
          <div className="md:hidden border-t px-4 py-4 flex flex-col gap-1" style={{ backgroundColor: azulProfundo, borderColor: '#243B55' }}>
            {/* → "menú vertical que aparece debajo del navbar cuando está abierto, solo en móvil" */}
            {[
              { href: '#servicios', label: 'Servicios' },
              { href: '#como-funciona', label: 'Proceso' },
              { href: '#consulta', label: 'Contacto' },
            ].map(({ href, label }) => (
              // → "recorro la lista de links y dibujo cada uno"
              <a key={href} href={href} onClick={() => setMenuAbierto(false)}
                className="py-3 px-4 rounded-xl text-sm font-medium text-white hover:bg-white/10 transition-colors">
                {/* → "al hacer click en un link, cierro el menú automáticamente" */}
                {label}
              </a>
            ))}
            <div className="h-px my-1" style={{ backgroundColor: '#243B55' }} />
            {/* → "línea separadora entre los links de navegación y los botones de cuenta" */}
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

      {/* ═══ HERO ═════════════════════════════════════════════════════════════════ */}
      <section className="lg:min-h-screen flex items-start pt-20 pb-4 lg:pb-0 relative" style={{ backgroundColor: '#FDFBF5' }}>
        {/* → "sección principal: ocupa toda la pantalla, fondo crema, el pt-20 deja espacio para el navbar fijo" */}
        <div className="absolute top-0 left-0 right-0 h-28 pointer-events-none z-10"
          style={{ background: `linear-gradient(to bottom, ${azulProfundo}, transparent)` }} />
        {/* → "capa decorativa: gradiente que va del azul profundo del navbar hacia transparente, para que la transición se vea suave" */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
          {/* → "contenedor centrado con ancho máximo para el contenido del hero" */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end py-1 relative">
            {/* → "grilla: 1 columna en móvil, 12 columnas en desktop, los elementos se alinean abajo" */}

            {/* ── Columna izquierda: título, texto, botones ── */}
            <div className="lg:col-span-4 flex flex-col justify-center pb-2 lg:pb-24 pt-4 lg:pt-0 relative z-10">
              {/* → "ocupa 4 de las 12 columnas en desktop, apila los elementos verticalmente" */}

              {/* Título + imagen en móvil lado a lado */}
              <div className="flex items-end gap-3 lg:block mb-6">
                {/* → "en móvil: el H1 y la imagen van lado a lado alineados abajo. En desktop: solo el H1 (lg:block lo convierte en bloque)" */}
                <h1 className="flex-1 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight lg:leading-[0.9] lg:mb-6 backdrop-blur-sm rounded-2xl px-4 py-3 -mx-4"
                  style={{ fontFamily: 'var(--font-playfair), serif', letterSpacing: '0.01em', backgroundColor: 'rgba(253,251,245,0.55)' }}>
                  {/* → "título grande con fuente Playfair, el flex-1 hace que ocupe todo el espacio disponible junto a la imagen" */}
                  <span style={{ color: azul, display: 'block', animation: 'fadeUp 0.6s ease both' }}>Paramos</span>
                  {/* → "'Paramos' aparece primero: sube desde abajo con fade in, sin delay" */}
                  <span style={{ color: azul, display: 'block', animation: 'fadeUp 0.6s ease both', animationDelay: '150ms' }}>tu embargo</span>
                  {/* → "'tu embargo' aparece segundo: misma animación pero espera 150ms" */}
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
                  {/* → "'HOY' en dorado aparece último: sube Y además crece de 80% a 100%, espera 300ms" */}
                </h1>

                {/* Imagen solo en móvil/tablet */}
                <div className="flex-shrink-0 lg:hidden self-end" style={{ transform: 'translateX(-16px)' }}>
                  {/* → "contenedor de la imagen: no se encoge (flex-shrink-0), se oculta en desktop (lg:hidden), se alinea abajo (self-end)" */}
                  <img
                    src="/justicia2.png"
                    alt="Toro Pacheco & Asociados"
                    className="h-54 sm:h-52 md:h-64 w-auto object-contain object-bottom"
                    style={{
                      maskImage: 'linear-gradient(to top, transparent 0%, black 18%)',
                      WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 18%)'
                    }}
                  />
                  {/* → "imagen de la justicia: más pequeña en móvil (h-40), más grande en tablet. La máscara la desvanece desde abajo para que no tenga corte recto" */}
                </div>
              </div>

              <p className="text-base leading-relaxed mb-8 text-center lg:text-left" style={{ color: '#5A6474' }}>
                ¿Tienes un juicio ejecutivo, embargo o deuda que no puedes pagar? <br />
                Te ayudamos a defenderte legalmente.
              </p>
              {/* → "párrafo descriptivo en gris medio" */}
              <p className="text-lg font-bold text-center lg:text-left" style={{ color: '#1F2937' }}>
                Primera consulta completamente gratis.
              </p>
              {/* → "frase destacada en negrita" */}
              <p className="text-sm mt-1 mb-6" style={{ color: '#5A6474' }}></p>
              {/* → "espacio vacío de separación" */}

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-3 mb-10 justify-center lg:justify-start">
                {/* → "en móvil los botones van uno debajo del otro, en sm+ van lado a lado" */}
                <a href="#consulta" className="px-7 py-3.5 text-sm font-bold tracking-wider rounded-full transition-colors text-center"
                  style={{ backgroundColor: azul }}>
                  {/* → "botón principal: fondo azul, texto con shimmer dorado, lleva a la sección del formulario" */}
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
                  {/* → "botón secundario: solo borde azul, lleva a la sección del proceso" */}
                </a>
              </div>

              {/* Estadísticas */}
              <div className="flex gap-6 pt-6 border-t mx-auto lg:mx-0 w-fit" style={{ borderColor: '#EDE8DC' }}>
                {/* → "grilla de 2 columnas para los números destacados, separada con una línea dorada" */}
                {[
                  { número: '24h', texto: 'Tiempo de respuesta' },
                  { número: '90%', texto: 'Tasa de éxito' },
                ].map(stat => (
                  // → "recorro los dos stats y dibujo cada uno"
                  <div key={stat.texto} className="text-center lg:text-left">
                    <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-playfair), serif', color: azul }}>
                      {stat.número}
                      {/* → "número grande en Playfair azul" */}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{stat.texto}</p>
                    {/* → "descripción del stat en gris claro" */}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Columna central: imagen grande desktop ── */}
            <div className="hidden lg:flex lg:col-span-5 items-end justify-center h-full relative z-20" style={{ marginLeft: '-4rem', marginRight: '-2rem' }}>
              {/* → "esta columna solo existe en desktop (hidden lg:flex), ocupa 5/12 columnas, con márgenes negativos para que la imagen se expanda más" */}
              <div className="w-full h-[750px] relative flex items-end justify-center">
                {/* → "contenedor de altura fija para que la imagen siempre ocupe el mismo espacio" */}
                <img
                  src="/justicia2.png"
                  alt="Toro Pacheco & Asociados"
                  className="h-full w-auto object-contain object-bottom drop-shadow-2xl"
                  style={{
                    maxWidth: '140%',
                    maskImage: 'linear-gradient(to top, transparent 0%, black 15%)',
                    WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 15%)'
                  }}
                />
                {/* → "imagen a pantalla completa con sombra fuerte. La máscara elimina el corte recto de abajo desvaneciendo en gradiente" */}

                {/* Tagline superpuesto abajo de la imagen */}
                <div className="absolute -bottom-5 left-0 right-0 flex justify-center">
                  {/* → "posiciono esta pastilla centrada, justo debajo de la imagen" */}
                  <div className="rounded-full px-10 py-3.5 border"
                    style={{
                      backgroundColor: azulProfundo,
                      borderColor: dorado + '55',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.25)'
                    }}>
                    {/* → "pastilla azul profundo con borde dorado semitransparente y sombra oscura" */}
                    <p className="text-[10px] font-bold tracking-[0.45em] text-center uppercase" style={{ color: dorado }}>
                      Justicia &nbsp;·&nbsp; Tradición &nbsp;·&nbsp; Confianza
                      {/* → "texto muy pequeño en mayúsculas con mucho espaciado entre letras" */}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Columna derecha: cards ÁREAS DE PRÁCTICA (solo desktop) ── */}
            <div className="hidden lg:flex lg:col-span-3 flex-col justify-end pb-16 space-y-3 relative z-10">
              {/* → "columna de 3/12, solo visible en desktop, apila las cards de abajo hacia arriba" */}
              <p className="text-xs font-bold tracking-widest mb-2" style={{ color: dorado }}>ÁREAS DE PRÁCTICA</p>
              {/* → "etiqueta dorada en mayúsculas con mucho espaciado" */}

              {[
                { icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="#C7B88A" strokeWidth="1.5"/><path d="M12 8V12L14.5 14.5" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 6.5C9 6.5 10 4 12 4C14 4 15 6.5 15 6.5" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round"/></svg>, titulo: 'Deudas y Cobranzas', desc: 'Defensa ante juicios y embargos.' },
                { icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="#C7B88A" strokeWidth="1.5"/><path d="M8 8H16" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round"/><path d="M8 12H16" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round"/><path d="M8 16H12" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round"/></svg>, titulo: 'Derecho Tributario', desc: 'Defensa ante SII, multas y fiscalizaciones.' },
                { icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M12 3V21" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round"/><path d="M6 6H18" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round"/><path d="M7 6L4 13H10L7 6Z" stroke="#C7B88A" strokeWidth="1.5" strokeLinejoin="round"/><path d="M17 6L14 13H20L17 6Z" stroke="#C7B88A" strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 21H15" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round"/></svg>, titulo: 'Derecho Laboral', desc: 'Despidos, finiquitos y acoso laboral.' },
                { icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M4 9L12 4L20 9H4Z" stroke="#C7B88A" strokeWidth="1.5" strokeLinejoin="round"/><path d="M6 10V18" stroke="#C7B88A" strokeWidth="1.5"/><path d="M10 10V18" stroke="#C7B88A" strokeWidth="1.5"/><path d="M14 10V18" stroke="#C7B88A" strokeWidth="1.5"/><path d="M18 10V18" stroke="#C7B88A" strokeWidth="1.5"/><path d="M4 20H20" stroke="#C7B88A" strokeWidth="1.5" strokeLinecap="round"/></svg>, titulo: 'Derecho Civil', desc: 'Contratos, herencias y arrendamientos.' },
                { icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="13" rx="1.5" stroke="#C7B88A" strokeWidth="1.5"/><path d="M7 7V5C7 3.9 7.9 3 9 3H15C16.1 3 17 3.9 17 5V7" stroke="#C7B88A" strokeWidth="1.5" strokeLinejoin="round"/><path d="M3 12H21" stroke="#C7B88A" strokeWidth="1.5"/><path d="M10 12V16" stroke="#C7B88A" strokeWidth="1.5"/><path d="M14 12V16" stroke="#C7B88A" strokeWidth="1.5"/></svg>, titulo: 'Derecho Comercial', desc: 'Empresas y contratos comerciales.' },
              ].map((s, i) => (
                // → "recorro la lista de 5 áreas y dibujo cada card"
                <div key={s.titulo}
                  className="flex items-start gap-4 p-5 rounded-xl border hover:shadow-md cursor-pointer"
                  style={{
                    position: 'relative',           // → "necesito 'relative' para que el destello absoluto se posicione dentro de la card"
                    overflow: 'hidden',              // → "oculto todo lo que salga de los bordes redondeados (el destello dorado)"
                    borderColor: cardActiva === i ? azul : '#EDE8DC', // → "si esta es la card activa, borde azul; si no, borde crema"
                    backgroundColor: cardActiva === i ? azul : 'white', // → "si está activa, fondo azul; si no, blanco"
                    transform: cardActiva === i ? 'translateY(-3px)' : 'translateY(0)', // → "si está activa, la levanto 3px hacia arriba"
                    transition: 'all 0.3s ease',     // → "todos los cambios de estilo se animan suavemente en 0.3s"
                    animation: 'slideInFromRight 0.5s ease both', // → "al cargar la página, la card entra deslizándose desde la derecha con fade in"
                    animationDelay: `${i * 100}ms`,  // → "cada card espera 100ms más que la anterior: 0, 100, 200, 300, 400ms"
                  }}
                  onMouseEnter={() => setCardActiva(i)}  // → "cuando el mouse entra, marco esta card como activa con su índice"
                  onMouseLeave={() => setCardActiva(-1)} // → "cuando el mouse sale, desactivo todas (-1 = ninguna)"
                >
                  {cardActiva === i && ( // → "solo muestro el destello dorado cuando esta card está activa"
                    <div className="shimmer" style={{
                      position: 'absolute', // → "lo posiciono dentro de la card (que es relative)"
                      top: 0,               // → "arranca desde arriba"
                      left: 0,              // → "arranca desde la izquierda"
                      width: '60px',        // → "es una franja angosta de 60px"
                      height: '100%',       // → "ocupa toda la altura de la card"
                      background: 'linear-gradient(90deg, transparent, rgba(199,184,138,0.4), transparent)', // → "gradiente: transparente → dorado semitransparente → transparente, como un brillo metálico"
                      pointerEvents: 'none', // → "el destello no intercepta clicks ni eventos del mouse"
                    }} />
                  )}
                  <span className="flex-shrink-0">{s.icon}</span>
                  {/* → "el ícono SVG dorado, no se encoge aunque haya poco espacio" */}
                  <div>
                    <p className="text-base font-bold leading-tight" style={{ color: cardActiva === i ? '#FFFFFF' : azul }}>
                      {s.titulo}
                      {/* → "título de la card: blanco si está activa, azul si no" */}
                    </p>
                    <p className="text-sm mt-0.5 leading-relaxed" style={{ color: cardActiva === i ? '#EDE8DC' : '#6B7280' }}>
                      {s.desc}
                      {/* → "descripción: crema claro si está activa, gris si no" */}
                    </p>
                  </div>
                </div>
              ))}

              <a href="#servicios" className="text-xs font-semibold text-center pt-2 transition-colors hover:opacity-70"
                style={{ color: azul }}>
                Ver todos los servicios →
                {/* → "link al final de las cards que lleva a la sección de servicios completa" */}
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* ═══ SERVICIOS ════════════════════════════════════════════════════════════ */}
      <section id="servicios" className="py-16 sm:py-24 px-4 sm:px-6" style={{ backgroundColor: '#F5F7FA' }}>
        {/* → "sección de servicios con fondo gris claro, padding vertical generoso" */}
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            {/* → "encabezado de la sección centrado con margen inferior" */}
            <p className="text-xs font-bold tracking-widest mb-3" style={{ color: dorado }}>NUESTRAS ESPECIALIDADES</p>
            <h2 className="text-2xl sm:text-4xl font-bold mb-3" style={{ fontFamily: 'var(--font-playfair), serif', color: azul }}>
              Áreas de práctica
            </h2>
            <div className="w-16 h-0.5 mx-auto" style={{ backgroundColor: dorado }} />
            {/* → "línea decorativa dorada de 64px centrada bajo el título" */}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* → "grilla: 1 columna en móvil, 3 columnas en tablet/desktop" */}
            {[
              { titulo: 'Deudas y Cobranzas', descripcion: '¿Juicio ejecutivo, embargo o deuda CAE? Tenemos estrategias legales para paralizar el proceso y defenderte. Consulta gratis hoy.' },
              { titulo: 'Derecho Tributario', descripcion: '¿Problemas con el SII, multas o fiscalizaciones? Te asesoramos para defenderte y regularizar tu situación tributaria.' },
              { titulo: 'Derecho Laboral', descripcion: '¿Te despidieron sin justificación o no te pagaron el finiquito? Te ayudamos a recuperar lo que te corresponde.' },
              { titulo: 'Derecho Civil', descripcion: 'Contratos, arrendamientos, herencias y resolución de conflictos civiles.' },
              { titulo: 'Derecho Comercial', descripcion: 'Constitución de empresas, contratos comerciales y asesoría empresarial.' },
              { titulo: 'Contratos y Documentos', descripcion: 'Redacción y revisión de contratos, poder notarial y documentos legales.' },
            ].map((s) => (
              // → "recorro los 6 servicios y dibujo cada tarjeta"
              <div key={s.titulo} className="bg-white p-8 border-t-2 hover:shadow-lg transition-all"
                style={{ borderColor: dorado }}>
                {/* → "cada tarjeta: fondo blanco, borde superior dorado grueso, sombra al hacer hover" */}
                <h3 className="text-lg font-bold mb-3" style={{ fontFamily: 'var(--font-playfair), serif', color: azul }}>
                  {s.titulo}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>{s.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CÓMO FUNCIONA ════════════════════════════════════════════════════════ */}
      <section id="como-funciona" className="py-16 sm:py-24 px-4 sm:px-6" style={{ backgroundColor: azulProfundo }}>
        {/* → "sección oscura azul profundo para contrastar con las secciones claras" */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold tracking-widest mb-3" style={{ color: dorado }}>PROCESO</p>
            <h2 className="text-2xl sm:text-4xl font-bold text-white" style={{ fontFamily: 'var(--font-playfair), serif' }}>
              Cómo funciona
            </h2>
            <div className="w-16 h-0.5 mx-auto mt-4" style={{ backgroundColor: dorado }} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* → "3 pasos del proceso en grilla, separados con espacio generoso" */}
            {[
              { paso: '01', titulo: 'Envía tu consulta', descripcion: 'Completa el formulario con tu situación legal. Es gratis y sin compromiso.' },
              { paso: '02', titulo: 'Recibe respuesta', descripcion: 'Un abogado especialista revisa tu caso y te responde en menos de 24 horas.' },
              { paso: '03', titulo: 'Resuelve tu caso', descripcion: 'Agenda una videollamada o contrata nuestros servicios para continuar.' },
            ].map((item) => (
              // → "recorro los 3 pasos y dibujo cada uno"
              <div key={item.paso} className="text-center">
                <p className="text-5xl font-bold mb-4" style={{ color: dorado, fontFamily: 'var(--font-playfair), serif', opacity: 0.4 }}>
                  {item.paso}
                  {/* → "número del paso muy grande, dorado y semitransparente para que sea decorativo" */}
                </p>
                <h3 className="text-lg font-semibold text-white mb-2">{item.titulo}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#C7B88A99' }}>{item.descripcion}</p>
                {/* → "descripción en dorado muy transparente para que sea legible pero no dominante" */}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FORMULARIO DE CONSULTA ═══════════════════════════════════════════════ */}
      <section id="consulta" className="py-16 sm:py-24 px-4 sm:px-6" style={{ backgroundColor: '#F5F7FA' }}>
        <div className="max-w-2xl mx-auto">
          {/* → "contenedor angosto centrado: el formulario no debe ser muy ancho" */}
          <div className="text-center mb-10">
            <p className="text-xs font-bold tracking-widest mb-3" style={{ color: dorado }}>COMIENZA HOY</p>
            <h2 className="text-2xl sm:text-4xl font-bold mb-3" style={{ fontFamily: 'var(--font-playfair), serif', color: azul }}>
              ¿Cómo quieres comenzar?
            </h2>
            <div className="w-16 h-0.5 mx-auto mb-4" style={{ backgroundColor: dorado }} />
            <p className="text-sm" style={{ color: '#6B7280' }}>Elige la opción que mejor se adapte a tu situación</p>
          </div>

          {/* Selector de pestañas */}
          <div className="flex rounded-xl p-1 mb-6 border" style={{ backgroundColor: 'white', borderColor: '#E5E7EB' }}>
            {/* → "contenedor de las dos pestañas, fondo blanco con borde gris" */}
            <button
              onClick={() => setTab('texto')} // → "al hacer click cambio la pestaña activa a 'texto'"
              className="flex-1 py-3 text-sm font-semibold rounded-lg transition-all"
              style={tab === 'texto'
                ? { backgroundColor: azul, color: 'white' } // → "si esta pestaña está activa: fondo azul, texto blanco"
                : { color: '#6B7280' }}                      // → "si no está activa: solo texto gris"
            >
              ✉️ Consulta gratuita
            </button>
            <button
              onClick={() => setTab('video')} // → "al hacer click cambio la pestaña activa a 'video'"
              className="flex-1 py-3 text-sm font-semibold rounded-lg transition-all"
              style={tab === 'video'
                ? { backgroundColor: azul, color: 'white' }
                : { color: '#6B7280' }}
            >
              🎥 Agendar videollamada
            </button>
          </div>

          {/* ── Contenido pestaña TEXTO ── */}
          {tab === 'texto' && ( // → "solo muestro este bloque si la pestaña activa es 'texto'"
            <div className="bg-white rounded-2xl p-5 sm:p-8 shadow-sm border" style={{ borderColor: '#E5E7EB' }}>
              {exito ? ( // → "si la consulta se envió con éxito, muestro la pantalla de confirmación"
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
                  <button onClick={() => setExito(false)} // → "al hacer click vuelvo al formulario vacío"
                    className="text-sm font-medium underline"
                    style={{ color: azul }}>
                    Enviar otra consulta
                  </button>
                </div>
              ) : ( // → "si no hubo éxito todavía, muestro el formulario"
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* → "al enviar el formulario llamo a handleSubmit, espacio vertical entre campos" */}
                  {error && ( // → "solo muestro el bloque de error si hay un mensaje de error"
                    <div className="text-sm p-4 rounded-lg border" style={{ backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', color: '#B91C1C' }}>
                      {error}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* → "en móvil los campos van uno debajo del otro, en desktop van de a dos" */}
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Nombre completo *</label>
                      <input type="text" name="nombre" value={form.nombre} onChange={handleChange}
                        placeholder="Ej: Juan Pérez"
                        className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 border"
                        style={{ borderColor: '#D1D5DB', '--tw-ring-color': azul } as React.CSSProperties} />
                      {/* → "campo de texto: value conectado al estado, onChange actualiza el estado, el ring azul aparece al hacer focus" */}
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
                      <select name="asunto" value={form.asunto}
                        onChange={e => setForm({ ...form, asunto: e.target.value })}
                        // → "cuando cambia el select, actualizo solo el campo 'asunto' en el estado"
                        className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none border"
                        style={{ borderColor: '#D1D5DB', color: form.asunto ? '#374151' : '#9CA3AF' }}>
                        {/* → "si hay algo seleccionado el texto es oscuro, si está vacío es gris (como placeholder)" */}
                        <option value="">Selecciona tu área *</option>
                        <option value="Deuda / Embargo / Juicio Ejecutivo">Deuda / Embargo / Juicio Ejecutivo</option>
                        <option value="Derecho Tributario / SII">Derecho Tributario / SII</option>
                        <option value="Despido / Derecho Laboral">Despido / Derecho Laboral</option>
                        <option value="Contrato / Herencia / Civil">Contrato / Herencia / Civil</option>
                        <option value="Constitución de empresa">Constitución de empresa</option>
                        <option value="Otra consulta">Otra consulta</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Describe tu situación *</label>
                    <textarea name="mensaje" value={form.mensaje} onChange={handleChange} rows={5}
                      placeholder="Cuéntanos con detalle tu situación legal..."
                      className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 border resize-none"
                      style={{ borderColor: '#D1D5DB' }} />
                    {/* → "área de texto de 5 líneas, sin opción de redimensionar (resize-none)" */}
                  </div>
                  <button type="submit" disabled={enviando}
                    className="w-full font-bold py-4 rounded-xl tracking-wide transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: dorado, color: azulProfundo }}>
                    {/* → "botón de envío: se desactiva y se vuelve semitransparente mientras está enviando" */}
                    {enviando ? 'Enviando...' : 'ENVIAR CONSULTA GRATUITA'}
                    {/* → "si está enviando muestro '...' , si no muestro el texto normal" */}
                  </button>
                  <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
                    Los campos marcados con * son obligatorios. Tu información es confidencial.
                  </p>
                </form>
              )}
            </div>
          )}

          {/* ── Contenido pestaña VIDEO ── */}
          {tab === 'video' && ( // → "solo muestro este bloque si la pestaña activa es 'video'"
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
              {exitoVideo ? ( // → "si la videollamada se agendó con éxito, muestro la confirmación"
                <div className="text-center py-12 px-8">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#F0F7EE' }}>
                    <span className="text-3xl">🎉</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair), serif', color: azul }}>
                    ¡Videollamada agendada!
                  </h3>
                  <p className="text-sm mb-2" style={{ color: '#6B7280' }}>Te enviamos el enlace de la videollamada a tu email.</p>
                  {fechaVideo && slotSeleccionado && ( // → "solo muestro la fecha/hora si tengo ambos datos"
                    <p className="text-sm font-semibold mt-3 mb-6" style={{ color: azul }}>
                      📅 {new Date(`${fechaVideo}T${slotSeleccionado}`).toLocaleString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      {/* → "combino fecha y hora, lo formateo en español chileno: 'lunes 26 de mayo, 10:00'" */}
                    </p>
                  )}
                  <button onClick={() => { setExitoVideo(false); setFechaVideo(''); setSlots([]); setSlotSeleccionado('') }}
                    // → "al hacer click reseteo todo para que pueda agendar otra videollamada"
                    className="text-sm font-medium underline" style={{ color: azul }}>
                    Agendar otra
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAgendarVideo}> {/* → "al enviar llamo a handleAgendarVideo" */}

                  {/* Indicador de 3 pasos */}
                  <div className="flex border-b" style={{ borderColor: '#E5E7EB' }}>
                    {/* → "barra horizontal con 3 pasos, separada del formulario con una línea" */}
                    {[
                      { n: '1', label: 'Tus datos' },
                      { n: '2', label: 'Fecha' },
                      { n: '3', label: 'Horario' },
                    ].map((paso, i) => {
                      const activo = i === 0           // → "el paso 1 siempre está activo"
                        ? true
                        : i === 1
                          ? !!(video.nombre && video.email) // → "el paso 2 se activa cuando hay nombre y email"
                          : !!(video.nombre && video.email && fechaVideo) // → "el paso 3 se activa cuando además hay fecha"
                      return (
                        <div key={paso.n} className="flex-1 py-3 flex items-center justify-center gap-2">
                          <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
                            style={{ backgroundColor: activo ? azul : '#E5E7EB', color: activo ? 'white' : '#9CA3AF' }}>
                            {/* → "círculo del paso: azul con texto blanco si está activo, gris si no" */}
                            {paso.n}
                          </span>
                          <span className="text-xs font-medium hidden sm:block" style={{ color: activo ? azul : '#9CA3AF' }}>
                            {/* → "la etiqueta del paso se oculta en móvil muy pequeño" */}
                            {paso.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="p-6 space-y-6">
                    {errorVideo && ( // → "muestro el error solo si existe"
                      <div className="text-sm p-4 rounded-lg border" style={{ backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', color: '#B91C1C' }}>
                        {errorVideo}
                      </div>
                    )}

                    {/* PASO 1: Datos del cliente */}
                    <div>
                      <p className="text-xs font-bold tracking-widest mb-3" style={{ color: dorado }}>PASO 1 — TUS DATOS</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Nombre completo *</label>
                          <input type="text" value={video.nombre} onChange={e => setVideo({ ...video, nombre: e.target.value })}
                            // → "al escribir actualizo solo el nombre en el objeto video"
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

                    <hr style={{ borderColor: '#F3F4F6' }} /> {/* → "línea separadora entre pasos" */}

                    {/* PASO 2: Selección de fecha */}
                    <div>
                      <p className="text-xs font-bold tracking-widest mb-3" style={{ color: dorado }}>PASO 2 — ELIGE UNA FECHA</p>
                      <div className="space-y-2">
                        {getFechasDisponibles().slice(0, 14).map(f => {
                          // → "genero los próximos 30 días pero solo muestro los primeros 14"
                          const d = new Date(f + 'T12:00:00') // → "creo un objeto Date al mediodía para evitar problemas de zona horaria"
                          const seleccionada = fechaVideo === f // → "esta fecha está seleccionada si coincide con la guardada"
                          return (
                            <button key={f} type="button" onClick={() => handleFechaVideo(f)}
                              // → "al hacer click cargo los slots disponibles para esta fecha"
                              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left"
                              style={seleccionada
                                ? { backgroundColor: azul, borderColor: azul, color: 'white' } // → "si está seleccionada: fondo azul"
                                : { backgroundColor: 'white', borderColor: '#E5E7EB', color: '#374151' }}> {/* → "si no: blanco con borde gris" */}
                              <span className="text-sm font-semibold capitalize">
                                {d.toLocaleDateString('es-CL', { weekday: 'long' })}
                                {/* → "nombre del día de la semana en español: 'lunes', 'martes'..." */}
                              </span>
                              <span className="text-sm" style={{ color: seleccionada ? '#C7B88A' : '#6B7280' }}>
                                {d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                                {/* → "fecha completa: '26 de mayo de 2026', dorada si está seleccionada" */}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <hr style={{ borderColor: '#F3F4F6' }} />

                    {/* PASO 3: Selección de horario */}
                    <div>
                      <p className="text-xs font-bold tracking-widest mb-3" style={{ color: dorado }}>PASO 3 — ELIGE UN HORARIO</p>

                      {!fechaVideo && ( // → "si no hay fecha elegida, pido que elijan primero"
                        <div className="py-6 text-center rounded-xl border-2 border-dashed" style={{ borderColor: '#E5E7EB' }}>
                          <p className="text-sm" style={{ color: '#9CA3AF' }}>Primero selecciona una fecha arriba</p>
                        </div>
                      )}

                      {cargandoSlots && ( // → "mientras busco los slots muestro mensaje de carga"
                        <div className="py-6 text-center">
                          <p className="text-sm" style={{ color: '#9CA3AF' }}>Cargando horarios disponibles...</p>
                        </div>
                      )}

                      {!cargandoSlots && fechaVideo && slots.length === 0 && (
                        // → "si terminé de cargar, hay fecha, pero no hay horarios disponibles"
                        <div className="py-6 text-center rounded-xl border-2 border-dashed" style={{ borderColor: '#E5E7EB' }}>
                          <p className="text-sm" style={{ color: '#6B7280' }}>No hay horarios disponibles para ese día.</p>
                          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Prueba seleccionando otra fecha.</p>
                        </div>
                      )}

                      {!cargandoSlots && slots.length > 0 && ( // → "si hay horarios disponibles, los muestro"
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                          {/* → "grilla de botones de horario: 3 por fila en móvil, hasta 5 en desktop" */}
                          {slots.map(slot => (
                            <button key={slot} type="button" onClick={() => setSlotSeleccionado(slot)}
                              // → "al hacer click guardo el horario seleccionado"
                              className="py-3 rounded-xl text-sm font-bold border transition-all"
                              style={slotSeleccionado === slot
                                ? { backgroundColor: azul, borderColor: azul, color: 'white' } // → "si está seleccionado: azul"
                                : { backgroundColor: 'white', borderColor: '#E5E7EB', color: '#374151' }}> {/* → "si no: blanco" */}
                              {slot}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Resumen de la cita — aparece solo cuando hay fecha Y horario */}
                    {fechaVideo && slotSeleccionado && (
                      <div className="rounded-xl p-4 border" style={{ backgroundColor: '#F0F4FF', borderColor: '#C7D2FE' }}>
                        {/* → "cuadro de resumen azul claro que confirma qué eligió el usuario" */}
                        <p className="text-sm font-semibold mb-1" style={{ color: azul }}>
                          📅 {new Date(`${fechaVideo}T${slotSeleccionado}`).toLocaleString('es-CL', {
                            weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                          })}
                          {/* → "muestro la fecha y hora formateada en español" */}
                        </p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>Duración: 30 minutos · Enlace de videollamada por email</p>
                      </div>
                    )}

                    <button type="submit" disabled={agendando || !fechaVideo || !slotSeleccionado}
                      // → "el botón está desactivado si: está agendando, o no hay fecha, o no hay horario"
                      className="w-full font-bold py-4 rounded-xl tracking-wide transition-opacity disabled:opacity-40"
                      style={{ backgroundColor: dorado, color: azulProfundo }}>
                      {agendando ? 'Agendando...' : 'CONFIRMAR VIDEOLLAMADA'}
                      {/* → "mientras agenda muestro '...' , si no el texto normal" */}
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

      {/* ═══ FOOTER ═══════════════════════════════════════════════════════════════ */}
      <footer className="py-10 sm:py-16 px-4 sm:px-6" style={{ backgroundColor: azul }}>
        {/* → "pie de página azul marino con padding vertical" */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 pb-10 border-b" style={{ borderColor: '#2A4F7A' }}>
          {/* → "grilla de 3 columnas para las 3 secciones del footer, separadas con línea azul" */}

          {/* Columna 1: Logo e identidad */}
          <div>
            <div style={{ fontFamily: 'var(--font-playfair), serif' }} className="mb-4">
              <p className="text-white text-lg font-bold tracking-wide">TORO PACHECO</p>
              <p className="text-sm font-normal" style={{ color: dorado }}>&amp; ASOCIADOS</p>
              {/* → "nombre del estudio en dos líneas: 'TORO PACHECO' blanco y '& ASOCIADOS' dorado" */}
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#C7B88A99' }}>
              Defendemos tus derechos con dedicación y compromiso. Soluciones legales claras para cada situación en Chile.
            </p>
            {/* → "eslogan del estudio en dorado semitransparente" */}
          </div>

          {/* Columna 2: Lista de servicios */}
          <div>
            <h4 className="text-sm font-bold tracking-widest mb-4" style={{ color: dorado }}>SERVICIOS</h4>
            <ul className="space-y-2 text-sm" style={{ color: '#C7B88A99' }}>
              {/* → "lista simple de los servicios, sin links, solo texto dorado suave" */}
              <li>Deudas y Cobranzas</li>
              <li>Derecho Tributario</li>
              <li>Derecho Laboral</li>
              <li>Derecho Civil</li>
              <li>Derecho Comercial</li>
            </ul>
          </div>

          {/* Columna 3: Contacto */}
          <div>
            <h4 className="text-sm font-bold tracking-widest mb-4" style={{ color: dorado }}>CONTACTO</h4>
            <ul className="space-y-2 text-sm" style={{ color: '#C7B88A99' }}>
              <li>contacto@toropachecoasociados.cl</li>
              <li>
                <a href="https://wa.me/56950944482" target="_blank" rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity">
                  {/* → "el teléfono es clickeable y abre WhatsApp en una pestaña nueva" */}
                  +56 9 50944482
                </a>
              </li>
              <li>Santiago, Chile</li>
            </ul>
          </div>
        </div>

        {/* Barra inferior del footer */}
        <div className="max-w-6xl mx-auto mt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          {/* → "en móvil los elementos se apilan, en desktop van en fila distribuidos" */}
          <p className="text-xs" style={{ color: '#C7B88A66' }}>
            © 2026 Toro Pacheco &amp; Asociados. Todos los derechos reservados.
          </p>

          {/* Íconos de redes sociales */}
          <div className="flex items-center gap-3">
            {/* LinkedIn */}
            <a href="https://www.linkedin.com/in/branco-toro/" target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity">
              {/* → "link a LinkedIn, se vuelve semitransparente al hacer hover" */}
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
                {/* → "triángulo de play dibujado con SVG" */}
              </svg>
            </a>
          </div>

          <p className="text-xs font-semibold tracking-widest" style={{ color: dorado }}>
            JUSTICIA · TRADICIÓN · CONFIANZA
            {/* → "eslogan final del estudio en dorado con letras muy separadas" */}
          </p>
        </div>
      </footer>

    </main>
  )
}
