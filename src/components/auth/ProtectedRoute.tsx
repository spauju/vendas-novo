'use client'

import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  module: string
  action?: 'view' | 'create' | 'edit' | 'delete'
  fallback?: ReactNode
}

export default function ProtectedRoute({ 
  children, 
  module, 
  action = 'view',
  fallback 
}: ProtectedRouteProps) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { hasPermission, loading: permissionsLoading } = usePermissions()

  // Mostrar loading enquanto carrega
  if (authLoading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center p-6 bg-white rounded-xl shadow-lg">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-primary/10 border-t-primary"></div>
          <p className="mt-4 text-gray-700 font-medium">Carregando permissões...</p>
          <p className="text-sm text-gray-500 mt-2">Por favor, aguarde</p>
        </div>
      </div>
    )
  }

  // Redirecionar para login se não autenticado
  if (!user) {
    router.push('/auth/login')
    return null
  }

  // Verificar permissão
  if (!hasPermission(module, action)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 transform transition-all duration-300 hover:shadow-2xl">
          <div className="bg-gradient-to-r from-error to-error-dark p-6 text-white text-center">
            <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-lg">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Acesso Negado</h2>
            <p className="text-gray-600 mb-8">
              Você não tem permissão para acessar esta página ou recurso.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => router.back()}
                className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all font-medium text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                Voltar
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all font-medium text-sm shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                Ir para o Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
