import { cn } from '../lib/utils'

describe('cn()', () => {
  it('combina clases sin conflicto', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1')
  })

  it('resuelve conflictos de Tailwind — la última clase gana', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('ignora valores falsy (false, null, undefined, cadena vacía)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(cn('px-2', false as any, null as any, undefined, '')).toBe('px-2')
  })

  it('evalúa expresiones condicionales correctamente', () => {
    const activo = true
    expect(cn('base', activo && 'bg-blue-500')).toBe('base bg-blue-500')
    expect(cn('base', !activo && 'bg-blue-500')).toBe('base')
  })

  it('acepta arrays anidados de clases', () => {
    expect(cn(['px-2', 'py-1'])).toBe('px-2 py-1')
  })

  it('sin argumentos devuelve cadena vacía', () => {
    expect(cn()).toBe('')
  })

  it('fusiona padding conflictivo con tailwind-merge', () => {
    // tailwind-merge deduplica p-* vs px-* correctamente
    expect(cn('p-4', 'px-2')).toBe('p-4 px-2')
  })
})
