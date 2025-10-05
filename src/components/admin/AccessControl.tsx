'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface AccessControlProps {
  children: React.ReactNode
  requiredRoles: ('administrador' | 'gerente')[]
}

export default function AccessControl({ children, requiredRoles }: AccessControlProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [hasAccess, setHasAccess] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      if (loading) return

      if (!user) {
        router.push('/auth/login')
        return
      }

      // Verificar a função do usuário
      try {
        const { createClientComponentClient } = await import('@supabase/auth-helpers-nextjs')
        const supabase = createClientComponentClient()
        
        console.log('=== DEBUG ACCESS CONTROL ===')
        console.log('User ID:', user.id)
        console.log('Required Roles:', requiredRoles)
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('funcao')
          .eq('id', user.id)
          .single()

        console.log('Profile data:', profile)
        console.log('Profile error:', error)

        if (error || !profile) {
          console.log('Erro ou perfil não encontrado, redirecionando para dashboard')
          router.push('/dashboard')
          return
        }

        const userRole = profile.funcao as string
        console.log('User Role:', userRole)
        console.log('User Role Type:', typeof userRole)
        
        // Verificar variações possíveis do nome da função
        const normalizedRole = userRole?.toLowerCase()?.trim()
        const isAdmin = normalizedRole === 'administrador' || normalizedRole === 'admin' || normalizedRole === 'administrator'
        const isManager = normalizedRole === 'gerente' || normalizedRole === 'manager'
        
        console.log('Normalized Role:', normalizedRole)
        console.log('Is Admin:', isAdmin)
        console.log('Is Manager:', isManager)
        
        const hasRequiredRole = requiredRoles.some(role => {
          const normalizedRequired = role.toLowerCase().trim()
          return normalizedRole === normalizedRequired || 
                 (normalizedRequired === 'administrador' && isAdmin) ||
                 (normalizedRequired === 'gerente' && isManager)
        })
        
        console.log('Has Required Role:', hasRequiredRole)

        if (hasRequiredRole) {
          console.log('Acesso concedido!')
          setHasAccess(true)
        } else {
          console.log('Acesso negado, redirecionando para dashboard')
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
  }, [user, loading, router, requiredRoles])

  if (loading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h1>
          <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
