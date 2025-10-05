'use client'

import { useState } from 'react'
import { 
  BanknotesIcon,
  CreditCardIcon,
  QrCodeIcon,
  DevicePhoneMobileIcon,
  BuildingLibraryIcon,
  TicketIcon
} from '@heroicons/react/24/outline'

export type PaymentMethod = 
  | 'cash' 
  | 'debit' 
  | 'credit' 
  | 'pix' 
  | 'digital_wallet' 
  | 'bank_transfer' 
  | 'meal_voucher'

interface PaymentMethodsProps {
  total: number
  onPaymentComplete: (paymentData: any) => void
  onCancel: () => void
}

const paymentOptions = [
  {
    id: 'cash' as PaymentMethod,
    name: 'Dinheiro',
    icon: BanknotesIcon,
    color: 'green',
    description: 'Pagamento em espécie'
  },
  {
    id: 'debit' as PaymentMethod,
    name: 'Cartão de Débito',
    icon: CreditCardIcon,
    color: 'blue',
    description: 'Débito na conta'
  },
  {
    id: 'credit' as PaymentMethod,
    name: 'Cartão de Crédito',
    icon: CreditCardIcon,
    color: 'purple',
    description: 'À vista ou parcelado'
  },
  {
    id: 'pix' as PaymentMethod,
    name: 'PIX',
    icon: QrCodeIcon,
    color: 'teal',
    description: 'Transferência instantânea'
  },
  {
    id: 'digital_wallet' as PaymentMethod,
    name: 'Carteira Digital',
    icon: DevicePhoneMobileIcon,
    color: 'indigo',
    description: 'PicPay, Mercado Pago'
  },
  {
    id: 'bank_transfer' as PaymentMethod,
    name: 'Transferência',
    icon: BuildingLibraryIcon,
    color: 'gray',
    description: 'TED/DOC'
  },
  {
    id: 'meal_voucher' as PaymentMethod,
    name: 'Vale Refeição',
    icon: TicketIcon,
    color: 'orange',
    description: 'VR, VA, Sodexo'
  }
]

export default function PaymentMethods({ total, onPaymentComplete, onCancel }: PaymentMethodsProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [cashAmount, setCashAmount] = useState('')
  const [installments, setInstallments] = useState(1)

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method)
  }

  const handleConfirmPayment = () => {
    if (!selectedMethod) return

    const paymentData = {
      method: selectedMethod,
      amount: selectedMethod === 'cash' ? (parseFloat(cashAmount) || total) : total,
      installments: selectedMethod === 'credit' ? installments : 1
    }

    onPaymentComplete(paymentData)
  }

  const cashChange = selectedMethod === 'cash' && cashAmount 
    ? Math.max(0, parseFloat(cashAmount) - total)
    : 0

  const installmentValue = installments > 1 ? total / installments : total

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Forma de Pagamento
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-teal-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-base sm:text-lg font-medium text-gray-700">
              Total a pagar:
            </span>
            <span className="text-xl sm:text-2xl font-bold text-teal-600">
              R$ {(total || 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Opções de pagamento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {paymentOptions.map((option) => {
            const Icon = option.icon
            const isSelected = selectedMethod === option.id
            
            return (
              <button
                key={option.id}
                onClick={() => handleMethodSelect(option.id)}
                className={`
                  p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 text-left
                  ${
                    isSelected
                      ? `border-${option.color}-500 bg-${option.color}-50`
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }
                `}
              >
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className={`
                    w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0
                    ${
                      isSelected
                        ? `bg-${option.color}-100`
                        : 'bg-gray-100'
                    }
                  `}>
                    <Icon className={`
                      w-5 h-5 sm:w-6 sm:h-6
                      ${
                        isSelected
                          ? `text-${option.color}-600`
                          : 'text-gray-600'
                      }
                    `} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                      {option.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">
                      {option.description}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Configurações específicas do método */}
        {selectedMethod === 'cash' && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">
              Valor Recebido
            </h3>
            <input
              type="number"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              placeholder="Digite o valor recebido"
              className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm sm:text-base"
              step="0.01"
              min="0"
            />
            {parseFloat(cashAmount) > 0 && (
              <div className="mt-3 p-2 sm:p-3 bg-white rounded border">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm sm:text-base">Troco:</span>
                  <span className={`font-semibold text-sm sm:text-base ${
                    cashChange >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    R$ {Math.abs(cashChange || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedMethod === 'credit' && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">
              Parcelamento
            </h3>
            <select
              value={installments}
              onChange={(e) => setInstallments(parseInt(e.target.value))}
              className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm sm:text-base"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                <option key={num} value={num}>
                  {num}x de R$ {(installmentValue || 0).toFixed(2)}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedMethod === 'pix' && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg text-center">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-200 rounded-lg mx-auto mb-3 sm:mb-4 flex items-center justify-center">
              <span className="text-xs sm:text-sm text-gray-500">QR Code</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600">
              Escaneie o QR Code com seu aplicativo do banco
            </p>
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={onCancel}
            className="flex-1 px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmPayment}
            disabled={!selectedMethod || (selectedMethod === 'cash' && parseFloat(cashAmount) < total)}
            className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm sm:text-base font-medium"
          >
            Confirmar Pagamento
          </button>
        </div>
      </div>
    </div>
  )
}