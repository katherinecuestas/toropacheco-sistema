'use client'

import { useEffect, useRef } from 'react'
import { cerrarSesion } from './auth'

const EVENTOS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']

export function useInactivityLogout(
  onLogout: () => void,
  timeoutMs = 60 * 60 * 1000 // 1 hora
) {
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
