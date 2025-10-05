'use client'

import { ReactNode } from 'react'
import { usePermissions } from '@/hooks/usePermissions'

interface PermissionButtonProps {
  children: ReactNode
  module: string
  action: 'view' | 'create' | 'edit' | 'delete'
  fallback?: ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

export default function PermissionButton({ 
  children, 
  module, 
  action,
  fallback = null,
  className = '',
  onClick,
  disabled = false,
  type = 'button'
}: PermissionButtonProps) {
  const { hasPermission } = usePermissions()

  if (!hasPermission(module, action)) {
    return <>{fallback}</>
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  )
}
