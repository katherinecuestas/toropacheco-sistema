import { dorado, azulProfundo } from '@/lib/brand'

export default function ComoFunciona() {
  return (
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
  )
}
