import { azul, dorado } from '@/lib/brand'

export default function Servicios() {
  return (
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
            { titulo: 'Deudas y Cobranzas', descripcion: '¿Juicio ejecutivo, embargo o deuda CAE? Tenemos estrategias legales para paralizar el proceso y defenderte. Consulta gratis hoy.' },
            { titulo: 'Derecho Tributario', descripcion: '¿Problemas con el SII, multas o fiscalizaciones? Te asesoramos para defenderte y regularizar tu situación tributaria.' },
            { titulo: 'Derecho Laboral', descripcion: '¿Te despidieron sin justificación o no te pagaron el finiquito? Te ayudamos a recuperar lo que te corresponde.' },
            { titulo: 'Derecho Civil', descripcion: 'Contratos, arrendamientos, herencias y resolución de conflictos civiles.' },
            { titulo: 'Derecho Comercial', descripcion: 'Constitución de empresas, contratos comerciales y asesoría empresarial.' },
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
  )
}
