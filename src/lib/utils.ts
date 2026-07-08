import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format SLSH amount: 125000 -> '125,000 SLSH'
export function formatSLSH(amount: number): string {
  return new Intl.NumberFormat('en-SO').format(amount) + ' SLSH'
}

// Convert SLSH to USD using exchange rate
export function slshToUsd(slsh: number, rate: number): string {
  return '$' + (slsh / rate).toFixed(2)
}

// Format date: ISO string -> 'Jul 12, 2025'
export function formatDate(iso: string, locale = 'en'): string {
  return new Date(iso).toLocaleDateString(locale === 'so' ? 'so-SO' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Generate initials from full name: 'Ahmed Ali' -> 'AA'
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

// Truncate text with ellipsis
export function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text
}
