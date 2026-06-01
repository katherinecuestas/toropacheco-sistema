'use client'

import { useState, useRef, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import { es } from 'date-fns/locale'
import 'react-day-picker/style.css'

interface Props {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  className?: string
}

function isoADate(iso: string): Date | undefined {
  if (!iso) return undefined
  const d = new Date(iso + 'T12:00:00')
  return isNaN(d.getTime()) ? undefined : d
}

function dateAIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isoADisplay(iso: string): string {
  if (!iso || iso.length < 10) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// Auto-inserta / mientras el usuario tipea: 12052026 → 12/05/2026
function formatearInputFecha(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function displayAIso(txt: string): string | null {
  const m = txt.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const iso = `${m[3]}-${m[2]}-${m[1]}`
  const d = new Date(iso + 'T12:00:00')
  return isNaN(d.getTime()) ? null : iso
}

export function DatePickerField({ value, onChange, placeholder = 'dd/mm/aaaa', className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const [textInput, setTextInput] = useState(isoADisplay(value))
  const ref = useRef<HTMLDivElement>(null)

  // Sincronizar textInput cuando value cambia externamente (ej. al editar un prospecto)
  useEffect(() => { setTextInput(isoADisplay(value)) }, [value])

  useEffect(() => {
    if (!open) return
    function clickFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', clickFuera)
    return () => document.removeEventListener('mousedown', clickFuera)
  }, [open])

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatearInputFecha(e.target.value)
    setTextInput(formatted)
    const iso = displayAIso(formatted)
    if (iso) onChange(iso)
    else if (!formatted) onChange('')
  }

  function handleCalendarSelect(d: Date | undefined) {
    if (d) {
      const iso = dateAIso(d)
      onChange(iso)
      setTextInput(isoADisplay(iso))
    }
    setOpen(false)
  }

  const selected = isoADate(value)

  return (
    <div className={`relative ${className}`} ref={ref}>
      <div className="flex items-center w-full border border-gray-200 rounded-lg text-sm overflow-hidden focus-within:ring-2 focus-within:ring-blue-400 bg-white">
        <input
          type="text"
          value={textInput}
          onChange={handleTextChange}
          placeholder={placeholder}
          maxLength={10}
          className="flex-1 px-3 py-2 focus:outline-none min-w-0"
        />
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="px-2.5 py-2 text-gray-400 border-l border-gray-200 hover:bg-gray-50 transition-colors"
        >
          📅
        </button>
      </div>

      {open && (
        <div
          className="absolute z-50 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden"
          style={{ fontSize: '0.8rem' }}
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleCalendarSelect}
            locale={es}
            weekStartsOn={1}
            defaultMonth={selected ?? new Date()}
          />
        </div>
      )}
    </div>
  )
}
