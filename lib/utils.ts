import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combina clases de Tailwind fusionando conflictos correctamente.
 * Usa clsx para condicionales y tailwind-merge para deduplicar utilidades.
 *
 * @example cn("px-2 py-1", isActive && "bg-blue-500", "px-4") → "py-1 bg-blue-500 px-4"
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
