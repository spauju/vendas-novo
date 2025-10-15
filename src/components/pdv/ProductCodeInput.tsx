'use client'

import { useEffect, useRef } from 'react'

interface ProductCodeInputProps {
  value: string
  onChange: (value: string) => void
  onEnter: () => void
  placeholder?: string
  autoFocus?: boolean
  disabled?: boolean
}

export default function ProductCodeInput({
  value,
  onChange,
  onEnter,
  placeholder = "Digite o código ou escaneie",
  autoFocus = false,
  disabled = false
}: ProductCodeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus && inputRef.current && !disabled) {
      inputRef.current.focus()
    }
  }, [autoFocus, disabled])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onEnter()
    }
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
    />
  )
}