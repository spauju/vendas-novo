'use client'

import { forwardRef, ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'outline' | 'ghost'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  fullWidth?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses = [
      'inline-flex items-center justify-center font-medium rounded-lg',
      'transition-all duration-200 ease-in-out',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'active:scale-95'
    ]

    const variantClasses = {
      primary: [
        'bg-gradient-to-r from-teal-600 to-emerald-600 text-white',
        'hover:from-teal-700 hover:to-emerald-700',
        'focus:ring-teal-500',
        'shadow-lg shadow-teal-600/25'
      ],
      secondary: [
        'bg-gradient-to-r from-gray-600 to-gray-700 text-white',
        'hover:from-gray-700 hover:to-gray-800',
        'focus:ring-gray-500',
        'shadow-lg shadow-gray-600/25'
      ],
      success: [
        'bg-gradient-to-r from-green-600 to-green-700 text-white',
        'hover:from-green-700 hover:to-green-800',
        'focus:ring-green-500',
        'shadow-lg shadow-green-600/25'
      ],
      danger: [
        'bg-gradient-to-r from-red-600 to-red-700 text-white',
        'hover:from-red-700 hover:to-red-800',
        'focus:ring-red-500',
        'shadow-lg shadow-red-600/25'
      ],
      warning: [
        'bg-gradient-to-r from-yellow-500 to-orange-500 text-white',
        'hover:from-yellow-600 hover:to-orange-600',
        'focus:ring-yellow-500',
        'shadow-lg shadow-yellow-500/25'
      ],
      info: [
        'bg-gradient-to-r from-blue-600 to-blue-700 text-white',
        'hover:from-blue-700 hover:to-blue-800',
        'focus:ring-blue-500',
        'shadow-lg shadow-blue-600/25'
      ],
      outline: [
        'border-2 border-gray-300 text-gray-700 bg-white',
        'hover:bg-gray-50 hover:border-gray-400',
        'focus:ring-gray-500'
      ],
      ghost: [
        'text-gray-700 bg-transparent',
        'hover:bg-gray-100',
        'focus:ring-gray-500'
      ]
    }

    const sizeClasses = {
      xs: 'px-2 py-1 text-xs gap-1',
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-base gap-2',
      lg: 'px-6 py-3 text-lg gap-2.5',
      xl: 'px-8 py-4 text-xl gap-3'
    }

    const iconSizes = {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
      xl: 'w-7 h-7'
    }

    const classes = clsx(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      {
        'w-full': fullWidth,
        'cursor-not-allowed': disabled || loading
      },
      className
    )

    const iconClass = iconSizes[size]

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className={clsx('animate-spin', iconClass)}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        
        {!loading && leftIcon && (
          <span className={iconClass}>{leftIcon}</span>
        )}
        
        {children}
        
        {!loading && rightIcon && (
          <span className={iconClass}>{rightIcon}</span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button