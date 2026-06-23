import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Hero from '@/components/sections/Hero'
import Servicios from '@/components/sections/Servicios'
import ComoFunciona from '@/components/sections/ComoFunciona'
import FormularioConsulta from '@/components/forms/FormularioConsulta'

export default function Home() {
  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
      <Navbar />
      <Hero />
      <Servicios />
      <ComoFunciona />
      <FormularioConsulta />
      <Footer />
    </main>
  )
}
