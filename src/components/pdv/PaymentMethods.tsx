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
import PixQRCode from './PixQRCode'

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
  onPaymentComplete: (paymentData: { method: PaymentMethod; amount: number }) => void
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

const colorClasses = {
  green: 'bg-green-50 border-green-200 hover:bg-green-100 text-green-800',
  blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-800',
  purple: 'bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-800',
  teal: 'bg-teal-50 border-teal-200 hover:bg-teal-100 text-teal-800',
  indigo: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100 text-indigo-800',
  gray: 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-800',
  orange: 'bg-orange-50 border-orange-200 hover:bg-orange-100 text-orange-800'
}

export default function PaymentMethods({ total, onPaymentComplete, onCancel }: PaymentMethodsProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [cashReceived, setCashReceived] = useState('')
  const [processing, setProcessing] = useState(false)
  const [showPixQR, setShowPixQR] = useState(false)

  const handlePaymentConfirm = async () => {
    if (!selectedMethod) return

    setProcessing(true)

    try {
      // Validação para pagamento em dinheiro
      if (selectedMethod === 'cash') {
        const received = parseFloat(cashReceived.replace(',', '.')) || 0
        if (received < total) {
          alert('Valor recebido é menor que o total da venda')
          setProcessing(false)
          return
        }
      }

      // Simular processamento
      await new Promise(resolve => setTimeout(resolve, 1000))

      onPaymentComplete({
        method: selectedMethod,
        amount: total
      })
    } catch (error) {
      console.error('Erro ao processar pagamento:', error)
      alert('Erro ao processar pagamento')
    } finally {
      setProcessing(false)
    }
  }

  const formatCurrency = (value: number) => {
    return value.toFixed(2).replace('.', ',')
  }

  const calculateChange = () => {
    if (selectedMethod !== 'cash') return 0
    const received = parseFloat(cashReceived.replace(',', '.')) || 0
    return Math.max(0, received - total)
  }

  const isInsufficientAmount = () => {
    if (selectedMethod !== 'cash') return false
    const received = parseFloat(cashReceived.replace(',', '.')) || 0
    return cashReceived !== '' && received < total
  }

  return (
    <div className="space-y-6">
      {/* Total da venda */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-center">
          <p className="text-sm text-gray-600">Total a pagar</p>
          <p className="text-2xl font-bold text-gray-900">R$ {formatCurrency(total)}</p>
        </div>
      </div>

      {/* Métodos de pagamento */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {paymentOptions.map((option) => {
          const IconComponent = option.icon
          const isSelected = selectedMethod === option.id
          
          return (
            <button
              key={option.id}
              onClick={() => {
                setSelectedMethod(option.id)
                // Abrir QR Code automaticamente ao selecionar PIX
                if (option.id === 'pix') {
                  setShowPixQR(true)
                }
              }}
              className={`p-4 rounded-lg border-2 transition-all ${
                isSelected 
                  ? `${colorClasses[option.color as keyof typeof colorClasses]} border-current` 
                  : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className="flex flex-col items-center space-y-2">
                <IconComponent className="h-8 w-8" />
                <span className="text-sm font-medium">{option.name}</span>
                <span className="text-xs opacity-75">{option.description}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Botão para reabrir QR Code PIX */}
      {selectedMethod === 'pix' && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <div className="text-center">
            <QrCodeIcon className="w-12 h-12 text-teal-600 mx-auto mb-3" />
            <p className="text-sm text-teal-800 mb-3">
              Clique no botão abaixo para visualizar o QR Code PIX
            </p>
            <button
              onClick={() => setShowPixQR(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
            >
              Ver QR Code PIX
            </button>
          </div>
        </div>
      )}

      {/* Campo para dinheiro */}
      {selectedMethod === 'cash' && (
        <div className={`rounded-lg p-4 border-2 transition-colors ${
          isInsufficientAmount() 
            ? 'bg-red-50 border-red-300' 
            : 'bg-green-50 border-green-200'
        }`}>
          <label className={`block text-sm font-medium mb-2 ${
            isInsufficientAmount() ? 'text-red-800' : 'text-green-800'
          }`}>
            Valor recebido (R$)
          </label>
          <input
            type="text"
            value={cashReceived}
            onChange={(e) => setCashReceived(e.target.value.replace(/[^\d,]/g, ''))}
            placeholder="0,00"
            className={`w-full px-3 py-2 border-2 rounded-md focus:ring-2 transition-colors ${
              isInsufficientAmount()
                ? 'border-red-400 focus:ring-red-500 focus:border-red-500 bg-red-50 text-red-900'
                : 'border-green-300 focus:ring-green-500 focus:border-green-500'
            }`}
            autoFocus
          />
          {cashReceived && (
            <div className="mt-2 text-sm">
              {isInsufficientAmount() ? (
                <p className="text-red-700 font-semibold flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Valor insuficiente! Faltam R$ {formatCurrency(total - parseFloat(cashReceived.replace(',', '.') || '0'))}
                </p>
              ) : (
                <p className="text-green-700">
                  Troco: <span className="font-semibold">R$ {formatCurrency(calculateChange())}</span>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Botões de ação */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={processing}
          className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={handlePaymentConfirm}
          disabled={!selectedMethod || processing || isInsufficientAmount()}
          className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {processing ? 'Processando...' : isInsufficientAmount() ? 'Valor Insuficiente' : 'Confirmar Pagamento'}
        </button>
      </div>

      {/* Modal QR Code PIX */}
      {showPixQR && (
        <PixQRCode
          amount={total}
          onClose={() => setShowPixQR(false)}
        />
      )}
    </div>
  )
}