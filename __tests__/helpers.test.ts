import { generateTempPassword, generarSlots } from '../lib/helpers'

// generateTempPassword usa Web Crypto API — disponible en Node 19+
// Si la versión de Node no la tiene, habilitamos el polyfill de jest:
if (typeof globalThis.crypto === 'undefined') {
  const { webcrypto } = require('crypto')
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto })
}

// ─── generateTempPassword ────────────────────────────────────────────────────

describe('generateTempPassword()', () => {
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'

  it('genera exactamente 12 caracteres', () => {
    expect(generateTempPassword()).toHaveLength(12)
  })

  it('solo contiene caracteres del conjunto permitido', () => {
    const password = generateTempPassword()
    for (const char of password) {
      expect(CHARS).toContain(char)
    }
  })

  it('no contiene letras ambiguas (O, I, l)', () => {
    // Ejecutamos 50 veces para cubrir la aleatoriedad
    for (let i = 0; i < 50; i++) {
      const p = generateTempPassword()
      expect(p).not.toMatch(/[OIl01]/)
    }
  })

  it('genera contraseñas distintas en llamadas sucesivas', () => {
    const a = generateTempPassword()
    const b = generateTempPassword()
    // La probabilidad de colisión es astronómicamente baja (charset^12 posibilidades)
    expect(a).not.toBe(b)
  })
})

// ─── generarSlots ────────────────────────────────────────────────────────────

describe('generarSlots()', () => {
  it('genera slots de 30 min entre 09:00 y 11:00', () => {
    expect(generarSlots('09:00', '11:00')).toEqual(['09:00', '09:30', '10:00', '10:30'])
  })

  it('incluye el último slot cuando hay exactamente 30 min al cierre', () => {
    // 10:30 + 30 min = 11:00 = minutesFin → debe incluirse
    expect(generarSlots('10:00', '11:00')).toEqual(['10:00', '10:30'])
  })

  it('no incluye slot cuando queda menos de 30 min al cierre', () => {
    // De 10:00 a 10:29 no hay espacio para ningún slot
    expect(generarSlots('10:00', '10:29')).toEqual([])
  })

  it('devuelve array vacío cuando inicio === fin', () => {
    expect(generarSlots('09:00', '09:00')).toEqual([])
  })

  it('devuelve array vacío cuando inicio > fin', () => {
    expect(generarSlots('11:00', '09:00')).toEqual([])
  })

  it('maneja minutos no redondos en la hora de inicio', () => {
    // 09:15 → slots: 09:15, 09:45
    expect(generarSlots('09:15', '10:15')).toEqual(['09:15', '09:45'])
  })

  it('genera slot único cuando hay exactamente 30 min', () => {
    expect(generarSlots('14:00', '14:30')).toEqual(['14:00'])
  })

  it('cubre una jornada completa de 08:00 a 18:00 (20 slots)', () => {
    const slots = generarSlots('08:00', '18:00')
    expect(slots).toHaveLength(20)
    expect(slots[0]).toBe('08:00')
    expect(slots[slots.length - 1]).toBe('17:30')
  })
})
