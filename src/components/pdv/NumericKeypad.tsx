'use client'

import { BackspaceIcon } from '@heroicons/react/24/outline'

interface NumericKeypadProps {
  onNumberClick: (number: string) => void
  onClear: () => void
  onBackspace: () => void
  onEnter: () => void
}

const keypadButtons = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['0', '.', 'C']
]

export default function NumericKeypad({ 
  onNumberClick, 
  onClear, 
  onBackspace, 
  onEnter 
}: NumericKeypadProps) {
  const handleButtonClick = (value: string) => {
    if (value === 'C') {
      onClear()
    } else if (value === '←') {
      onBackspace()
    } else if (value === 'Enter') {
      onEnter()
    } else {
      onNumberClick(value)
    }
  }

  return (
    <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
        Teclado Numérico
      </h3>
      
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-2 sm:mb-3">
        {keypadButtons.flat().map((button) => {
          let buttonClass = "h-10 sm:h-12 rounded-lg font-semibold text-base sm:text-lg transition-all duration-200 active:scale-95"
          
          if (button === 'C') {
            buttonClass += " bg-red-100 text-red-700 hover:bg-red-200"
          } else if (button === '0') {
            buttonClass += " bg-gray-100 text-gray-700 hover:bg-gray-200"
          } else {
            buttonClass += " bg-teal-100 text-teal-700 hover:bg-teal-200"
          }
          
          return (
            <button
              key={button}
              onClick={() => handleButtonClick(button)}
              className={buttonClass}
            >
              {button}
            </button>
          )
        })}
      </div>
      
      {/* Botões especiais */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <button
          onClick={onBackspace}
          className="h-10 sm:h-12 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center"
        >
          <BackspaceIcon className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        
        <button
          onClick={onEnter}
          className="h-10 sm:h-12 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 active:scale-95"
        >
          Enter
        </button>
      </div>
    </div>
  )
}