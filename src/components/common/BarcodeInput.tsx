'use client'

import { useState } from 'react'
import { CameraIcon } from '@heroicons/react/24/outline'
import BarcodeScanner from './BarcodeScanner'

interface BarcodeInputProps {
  value: string
  onChange: (value: string) => void
  onKeyPress?: (e: React.KeyboardEvent) => void
  placeholder?: string
  className?: string
  style?: React.CSSProperties
  required?: boolean
  disabled?: boolean
}

export default function BarcodeInput({
  value,
  onChange,
  onKeyPress,
  placeholder = "Digite o código de barras",
  className = "",
  style,
  required = false,
  disabled = false
}: BarcodeInputProps) {
  const [showScanner, setShowScanner] = useState(false)

  const handleScan = (barcode: string) => {
    onChange(barcode)
    setShowScanner(false)
  }

  const handleScannerOpen = () => {
    // Verificar se o dispositivo suporta câmera
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      setShowScanner(true)
    } else {
      // Fallback para input manual
      const input = prompt('Digite o código de barras:')
      if (input && input.trim()) {
        onChange(input.trim())
      }
    }
  }

  return (
    <>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder={placeholder}
          className={`pr-12 ${className}`}
          style={style}
          required={required}
          disabled={disabled}
        />
        
        {/* Botão do scanner */}
        <button
          type="button"
          onClick={handleScannerOpen}
          disabled={disabled}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    </>
  )
}