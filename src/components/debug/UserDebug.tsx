'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function UserDebug() {
  const { user, loading } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) return

      try {
        const supabase = createClientComponentClient()
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) {
          setError(error.message)
        } else {
          setProfile(data)
        }
      } catch (err: any) {
        setError(err.message)
      }
    }

    if (!loading) {
      checkProfile()
    }
  }, [user, loading])

  if (loading) {
    return <div className="p-4 bg-yellow-100 border border-yellow-300 rounded">Carregando...</div>
  }

  return (
    <div className="p-4 bg-blue-100 border border-blue-300 rounded mb-4">
      <h3 className="font-bold text-blue-800 mb-2">Debug do Usuário</h3>
      
      <div className="space-y-2 text-sm">
        <p><strong>User ID:</strong> {user?.id || 'Não logado'}</p>
        <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
        
        {error && (
          <p className="text-red-600"><strong>Erro:</strong> {error}</p>
        )}
        
        {profile && (
          <>
            <p><strong>Nome:</strong> {profile.nome_completo || 'N/A'}</p>
            <p><strong>Função:</strong> {profile.funcao || 'Não definida'}</p>
            <p><strong>Criado em:</strong> {profile.created_at || 'N/A'}</p>
          </>
        )}
        
        {!profile && !error && user && (
          <p className="text-orange-600">Perfil não encontrado no banco de dados</p>
        )}
      </div>
    </div>
  )
}
