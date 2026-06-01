import { NextResponse } from 'next/server'
import { TRIBUNALES, type GrupoTribunal } from '@/lib/tribunales'
export type { GrupoTribunal }

export async function GET() {
  try {
    const res = await fetch(
      'https://oficinajudicialvirtual.pjud.cl/indexN.php',
      { signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()

    const grupos: GrupoTribunal[] = []
    const optgroupRe = /<optgroup\s+label="([^"]+)"[^>]*>([\s\S]*?)<\/optgroup>/gi
    let gm: RegExpExecArray | null
    while ((gm = optgroupRe.exec(html)) !== null) {
      const corte = gm[1].trim()
      const bloque = gm[2]
      const tribunales: string[] = []
      const optRe = /<option[^>]*value="[^"]*">([^<]+)<\/option>/gi
      let om: RegExpExecArray | null
      while ((om = optRe.exec(bloque)) !== null) {
        const nombre = om[1].trim()
        if (nombre && nombre.length > 3 && !/seleccione/i.test(nombre)) tribunales.push(nombre)
      }
      if (tribunales.length > 0) grupos.push({ corte, tribunales })
    }

    if (grupos.length >= 3) return NextResponse.json({ tribunales: grupos })
    throw new Error('No se encontraron tribunales')
  } catch {
    return NextResponse.json({ tribunales: TRIBUNALES, fallback: true })
  }
}
