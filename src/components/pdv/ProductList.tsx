'use client'

import { TrashIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image?: string
  barcode?: string
}

interface ProductListProps {
  items: CartItem[]
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemoveItem: (id: string) => void
}

export default function ProductList({ items, onUpdateQuantity, onRemoveItem }: ProductListProps) {
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 h-full">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
          Carrinho de Compras
        </h3>
        <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-gray-500">
          <svg className="w-12 h-12 sm:w-16 sm:h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 11-4 0v-6m4 0V9a2 2 0 10-4 0v4.01" />
          </svg>
          <p className="text-base sm:text-lg font-medium">Carrinho vazio</p>
          <p className="text-xs sm:text-sm text-center">Adicione produtos para iniciar uma venda</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
      <div className="p-3 sm:p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            Carrinho de Compras
          </h3>
          <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded-full text-xs sm:text-sm font-medium">
            {totalItems} {totalItems === 1 ? 'item' : 'itens'}
          </span>
        </div>
      </div>

      {/* Lista de produtos */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
            {/* Imagem do produto */}
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                />
              ) : (
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              )}
            </div>

            {/* Informações do produto */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate text-sm sm:text-base">
                {item.name}
              </p>
              <p className="text-xs sm:text-sm text-gray-500">
R$ {(item.price || 0).toFixed(2)} cada
              </p>
              {item.barcode && (
                <p className="text-xs text-gray-400 hidden sm:block">
                  Código: {item.barcode}
                </p>
              )}
            </div>

            {/* Controles de quantidade */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              <button
                onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors"
              >
                <MinusIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
              </button>
              
              <span className="w-6 sm:w-8 text-center font-medium text-gray-900 text-sm sm:text-base">
                {item.quantity}
              </span>
              
              <button
                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                className="w-6 h-6 sm:w-8 sm:h-8 bg-teal-100 hover:bg-teal-200 rounded-full flex items-center justify-center transition-colors"
              >
                <PlusIcon className="w-3 h-3 sm:w-4 sm:h-4 text-teal-600" />
              </button>
            </div>

            {/* Subtotal e remover */}
            <div className="text-right flex-shrink-0">
              <p className="font-semibold text-gray-900 text-sm sm:text-base">
                R$ {((item.price * item.quantity) || 0).toFixed(2)}
              </p>
              <button
                onClick={() => onRemoveItem(item.id)}
                className="mt-1 text-red-500 hover:text-red-700 transition-colors"
              >
                <TrashIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <span className="text-base sm:text-lg font-semibold text-gray-900">
            Total:
          </span>
          <span className="text-lg sm:text-2xl font-bold text-teal-600">
            R$ {((total || 0) || 0).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}