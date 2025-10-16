'use client'

import { useEffect, useRef, useState } from 'react'
import { CameraIcon } from '@heroicons/react/24/outline'
import BarcodeScanner from '@/components/common/BarcodeScanner'

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
  const [showScanner, setShowScanner] = useState(false)

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

  const handleScan = (barcode: string) => {
    onChange(barcode)
    setShowScanner(false)
    // Executar a ação de Enter após escanear
    setTimeout(() => {
      onEnter()
    }, 100)
  }

  return (
    <>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Escanear código de barras"
        >
          <CameraIcon className="w-5 h-5" />
        </button>
      </div>

      <BarcodeScanner
        isOpen={showScanner}
        onScan={handleScan}
        onClose={() => setShowScanner(false)}
      />
    </>
  )
}