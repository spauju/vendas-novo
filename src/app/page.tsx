'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import LoadingScreen from '@/components/layout/LoadingScreen'
import { logSupabaseDB } from '@/lib/logger';

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Usuário autenticado, redirecionar para o dashboard
        console.log('Usuário autenticado, redirecionando para dashboard:', user.email)
        router.replace('/dashboard')
      } else {
        // Usuário não autenticado, redirecionar para login
        console.log('Usuário não autenticado, redirecionando para auth')
        router.replace('/auth')
      }
    }
  }, [user, loading, router])

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return <LoadingScreen />
  }

  // Renderizar loading enquanto redireciona
  return <LoadingScreen />
}


