'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface SimpleAccessControlProps {
  children: React.ReactNode
}

export default function SimpleAccessControl({ children }: SimpleAccessControlProps) {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [hasAccess, setHasAccess] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    const checkAccess = () => {
      if (authLoading) return

      if (!user) {
        console.log('Usuário não autenticado, redirecionando para login')
        router.push('/auth/login')
        return
      }

      try {
        console.log('=== SIMPLE ACCESS CONTROL DEBUG ===')
        console.log('User ID:', user.id)
        console.log('User Email:', user.email)
        console.log('Profile from Context:', profile)

        setDebugInfo({ profile, userId: user.id, userEmail: user.email })

        if (!profile) {
          console.error('Perfil não encontrado no contexto')
          router.push('/dashboard')
          setIsChecking(false)
          return
        }

        // Verificar função do usuário
        const userRole = profile.role
        console.log('User Role encontrado:', userRole)

        // Verificar se é admin ou gerente
        const isAuthorized = 
          userRole === 'administrador' || 
          userRole === 'gerente'

        console.log('Is Authorized:', isAuthorized)

        if (isAuthorized) {
          console.log('✅ Acesso concedido!')
          setHasAccess(true)
        } else {
          console.log('❌ Acesso negado - Role não autorizado')
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('Erro ao verificar acesso:', error)
        router.push('/dashboard')
      } finally {
        setIsChecking(false)
      }
    }

    checkAccess()
  }, [user, profile, authLoading, router])

  if (authLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-lg">
          <div className="text-red-600 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h1>
          <p className="text-gray-600 mb-6">
            Você não tem permissão para acessar esta página. 
            Esta área é restrita a administradores e gerentes.
          </p>
          
          {/* Debug Info */}
          {debugInfo && (
            <div className="mt-6 p-4 bg-gray-100 rounded text-left text-xs">
              <p className="font-bold mb-2">Informações de Debug:</p>
              <p><strong>User ID:</strong> {debugInfo.userId}</p>
              <p><strong>Email:</strong> {debugInfo.userEmail}</p>
              <p><strong>Função encontrada:</strong> {debugInfo.profile?.role || 'Não definida'}</p>
              <p><strong>Acesso permitido para:</strong> administrador, gerente</p>
            </div>
          )}
          
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
