'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface AbrirCaixaModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (initialValue: number) => void
}

export default function AbrirCaixaModal({ isOpen, onClose, onConfirm }: AbrirCaixaModalProps) {
  const [initialValue, setInitialValue] = useState('')

  if (!isOpen) return null

  const handleConfirm = () => {
    const value = parseFloat(initialValue.replace(',', '.')) || 0
    if (value < 0) {
      alert('O valor inicial não pode ser negativo')
      return
    }
    onConfirm(value)
    setInitialValue('')
  }

  const handleClose = () => {
    setInitialValue('')
    onClose()
  }

  const formatCurrency = (value: string) => {
    // Remove tudo que não é número ou vírgula/ponto
    const numbers = value.replace(/[^\d,\.]/g, '')
    return numbers
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Abrir Caixa</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valor inicial para troco (R$)
            </label>
            <input
              type="text"
              value={initialValue}
              onChange={(e) => setInitialValue(formatCurrency(e.target.value))}
              placeholder="0,00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Digite o valor que será usado como troco inicial
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors"
            >
              Abrir Caixa
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}