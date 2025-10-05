'use client'

import { useState, KeyboardEvent, useEffect, useRef } from 'react'
import { CameraIcon, XMarkIcon } from '@heroicons/react/24/outline'
import BarcodeScanner from '../common/BarcodeScanner'

interface ProductCodeInputProps {
  value: string
  onChange: (value: string) => void
  onKeyPress?: (e: KeyboardEvent<HTMLInputElement>) => void
  onEnter?: () => void
  placeholder?: string
  className?: string
  disabled?: boolean
  autoFocus?: boolean
}

export default function ProductCodeInput({
  value,
  onChange,
  onKeyPress,
  onEnter,
  placeholder = "Digite o código",
  className = "",
  disabled = false,
  autoFocus = false
}: ProductCodeInputProps) {
  const [showScanner, setShowScanner] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleScan = (barcode: string) => {
    onChange(barcode)
    setShowScanner(false)
    // Dispara o evento de tecla Enter após o scan
    if (onEnter) onEnter()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (onKeyPress) onKeyPress(e)
    
    // Se pressionar Enter e houver um valor, chama a função onEnter
    if (e.key === 'Enter' && value.trim() && onEnter) {
      onEnter()
    }
  }

  const handleScannerOpen = () => {
    if (disabled) return
    
    // Verificar se o dispositivo suporta câmera
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      setShowScanner(true)
    } else {
      // Fallback para input manual
      const input = prompt('Digite o código do produto:')
      if (input && input.trim()) {
        onChange(input.trim())
        if (onEnter) onEnter()
      }
    }
  }

  // Focar no input quando o componente for montado se autoFocus for true
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  return (
    <div className="relative">
      <div className={`flex items-center border ${isFocused ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-gray-300'} rounded-md ${disabled ? 'bg-gray-100' : 'bg-white'}`}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={`flex-1 px-3 py-2 bg-transparent outline-none ${disabled ? 'cursor-not-allowed' : ''} ${className}`}
          disabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />
        
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('')
              inputRef.current?.focus()
            }}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            disabled={disabled}
            title="Limpar"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
        
        <button
          type="button"
          onClick={handleScannerOpen}
          disabled={disabled}
          className={`p-2 text-gray-400 hover:text-teal-600 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Escanear código de barras"
        >
          <CameraIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Scanner Modal */}
      <BarcodeScanner
        isOpen={showScanner}
        onScan={handleScan}
        onClose={() => setShowScanner(false)}
      />
    </div>
  )
}
