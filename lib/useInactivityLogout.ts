'use client'

import { useEffect, useRef } from 'react'
import { cerrarSesion } from './auth'

const EVENTOS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const

/**
 * Hook que cierra la sesión automáticamente tras un período de inactividad.
 *
 * Escucha eventos de interacción del usuario y reinicia el contador en cada uno.
 * Al expirar el timeout llama a `cerrarSesion()` y ejecuta el callback `onLogout`.
 *
 * @param onLogout - Callback ejecutado después de cerrar sesión (ej. router.push('/login'))
 * @param timeoutMs - Tiempo de inactividad en ms antes de cerrar sesión (default: 1 hora)
 *
 * @example
 * useInactivityLogout(() => router.push('/login'))
 */
export function useInactivityLogout(
  onLogout: () => void,
  timeoutMs = 60 * 60 * 1000
): void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function resetTimer() {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(async () => {
        await cerrarSesion()
        onLogout()
      }, timeoutMs)
    }

    resetTimer()
    EVENTOS.forEach(ev => window.addEventListener(ev, resetTimer, { passive: true }))

    return () => {
      if (timer.current) clearTimeout(timer.current)
      EVENTOS.forEach(ev => window.removeEventListener(ev, resetTimer))
    }
  }, [onLogout, timeoutMs])
}
