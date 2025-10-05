'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { logSupabaseAuth, logSupabaseDB } from '@/lib/logger'

interface UserProfile {
  id: string
  full_name: string
  email: string
  role: 'user' | 'gerente' | 'administrador'
  active: boolean
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Função para tratar erros de autenticação
  const handleAuthError = (error: any) => {
    if (error?.message?.includes('Invalid Refresh Token') || 
        error?.message?.includes('Refresh Token Not Found') ||
        error?.message?.includes('refresh_token_not_found')) {
      
      logSupabaseAuth.tokenExpired({
        component: 'AuthContext',
        operation: 'token_validation',
        metadata: { errorMessage: error.message }
      })
      
      // Limpar sessão local e redirecionar para login
      supabase.auth.signOut()
      setUser(null)
      setSession(null)
      setProfile(null)
      router.push('/login')
      return true // Indica que o erro foi tratado
    }
    return false // Indica que o erro não foi tratado
  }

  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      try {
        logSupabaseDB.success('profile_fetch_start', 'profiles', {
          component: 'AuthContext',
          userId: userId,
          metadata: { operation: 'fetchProfile' }
        })
        
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, active, created_at, updated_at')
          .eq('id', userId)
          .single()

        if (error) {
          // Verificar se é erro de refresh token
          if (handleAuthError(error)) {
            return // Erro tratado, sair da função
          }
          
          logSupabaseDB.failed('profile_fetch_error', 'profiles', error, {
            component: 'AuthContext',
            userId: userId,
            metadata: {
              operation: 'fetchProfile',
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint
            }
          })
          
          // Se o perfil não existe, criar um perfil padrão
          if (error.code === 'PGRST116') {
            logSupabaseDB.success('profile_not_found', 'profiles', {
              component: 'AuthContext',
              userId: userId,
              metadata: { operation: 'createDefaultProfile' }
            })
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                email: user?.email,
                full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário',
                role: 'user',
                active: true
              })
              .select('id, full_name, email, role, active, created_at, updated_at')
              .single()
            
            if (createError) {
              // Verificar se é erro de refresh token
              if (handleAuthError(createError)) {
                return // Erro tratado, sair da função
              }
              logSupabaseDB.failed('profile_create_error', 'profiles', createError, {
                component: 'AuthContext',
                userId: userId,
                metadata: {
                  operation: 'createDefaultProfile',
                  error: createError
                }
              })
              setProfile(null)
              return
            }
            
            logSupabaseDB.success('profile_create_success', 'profiles', {
              component: 'AuthContext',
              userId: userId,
              metadata: {
                operation: 'createDefaultProfile',
                profile: newProfile
              }
            })
            setProfile(newProfile)
            return
          }
          
          // Em caso de erro de RLS ou outro, não definir perfil
          logSupabaseDB.failed('profile_load_failed', 'profiles', error, {
            component: 'AuthContext',
            userId: userId,
            metadata: {
              operation: 'fetchProfile',
              reason: 'RLS_or_other_error',
              message: error.message
            }
          })
          setProfile(null)
          return
        }

        if (!data.active) {
          logSupabaseAuth.failed('user_inactive', new Error('User account is inactive'), {
            component: 'AuthContext',
            userId: userId,
            metadata: { operation: 'fetchProfile' }
          })
          setProfile(null)
          return
        }

        logSupabaseDB.success('profile_load_success', 'profiles', {
          component: 'AuthContext',
          userId: userId,
          metadata: {
            operation: 'fetchProfile',
            profile: data
          }
        })
        setProfile(data)
      } catch (error) {
        logSupabaseDB.failed('profile_unexpected_error', error, {
          component: 'AuthContext',
          userId: userId,
          metadata: {
            operation: 'fetchProfile',
            error: (error as any)?.message || 'Erro desconhecido'
          }
        })
        setProfile(null)
      }
    }

    // Obter sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      }
      setLoading(false)
    })

    // Escutar mudanças na autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Verificar se é erro de refresh token
        if (handleAuthError(error)) {
          return { error }
        }
        
        logSupabaseAuth.failed('login', error as Error, {
          component: 'AuthContext',
          userId: email,
          metadata: { 
            email,
            status: (error as any)?.status || 'N/A',
            code: (error as any)?.name || 'N/A'
          }
        })
        return { error }
      }

      logSupabaseAuth.success('login', data.user?.id, {
        component: 'AuthContext',
        metadata: { 
          email: data.user?.email,
          userId: data.user?.id
        }
      })

      return { error: null }
    } catch (err: any) {
      // Verificar se é erro de refresh token
      if (handleAuthError(err)) {
        return { error: err as Error }
      }
      
      logSupabaseAuth.failed('login', err as Error, {
        component: 'AuthContext',
        userId: email,
        metadata: { 
          email,
          type: err?.constructor?.name || 'Unknown',
          message: err?.message || 'Erro desconhecido'
        }
      })
      return { error: err as Error }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'user', // Definindo 'user' como papel padrão para novos registros
          }
        }
      })

      if (error) {
        logSupabaseAuth.failed('signup', error as Error, {
          component: 'AuthContext',
          metadata: { email }
        })
        return { error }
      }

      logSupabaseAuth.success('signup', data.user?.id, {
        component: 'AuthContext',
        metadata: { 
          email,
          fullName,
          userId: data.user?.id
        }
      })
    } catch (err) {
      logSupabaseAuth.failed('signup', err as Error, {
        component: 'AuthContext',
        metadata: { email }
      })
      return { error: err as Error }
    } finally {
      setLoading(false)
    }

    return { error: null }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      // Tentar logout via Supabase com timeout
      const logoutPromise = supabase.auth.signOut()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), 5000)
      )
      
      const { error } = await Promise.race([logoutPromise, timeoutPromise]) as any
      
      if (error) {
        logSupabaseAuth.failed('logout', error as Error, {
          component: 'AuthContext',
          metadata: { 
            status: (error as any)?.status || 'N/A',
            code: (error as any)?.name || 'N/A'
          }
        })
        
        // Se for erro de rede ou timeout, fazer logout local
        if (error.message === 'TIMEOUT' || 
            error.message?.includes('ERR_ABORTED') ||
            error.message?.includes('Failed to fetch') ||
            error.message?.includes('Network Error')) {
          
          logSupabaseAuth.failed('logout', error, {
            component: 'AuthContext',
            operation: 'network_fallback',
            metadata: { fallbackReason: 'network_error' }
          })
          
          // Fazer logout local (limpar sessão sem chamar API)
          await performLocalLogout()
          return
        }
        
        throw error
      }
      
      logSupabaseAuth.success('logout', user?.id, {
        component: 'AuthContext'
      })
      
      // Limpar estado local após logout bem-sucedido
      await performLocalLogout()
      
    } catch (error: any) {
        logSupabaseAuth.failed('logout', error, {
          component: 'AuthContext',
          operation: 'unexpected_error',
          metadata: { 
            type: error?.constructor?.name || 'Unknown',
            message: error?.message || 'Erro desconhecido'
          }
        })
        
        // Em caso de erro inesperado, fazer logout local
        await performLocalLogout()
    } finally {
      setLoading(false)
    }
  }

  // Função auxiliar para logout local
  const performLocalLogout = async () => {
    try {
      // Limpar estado da aplicação
      setUser(null)
      setSession(null)
      setProfile(null)
      
      // Limpar localStorage se houver dados da sessão
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase.auth.token')
        // Limpar todas as chaves do Supabase
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-')) {
            localStorage.removeItem(key)
          }
        })
        sessionStorage.clear()
      }
      
      logSupabaseAuth.success('local_logout_success', user?.id || 'unknown', {
        component: 'AuthContext',
        userId: user?.id,
        metadata: { operation: 'localLogout' }
      })
    } catch (localError) {
      logSupabaseAuth.failed('local_logout_error', localError as Error, {
        component: 'AuthContext',
        userId: user?.id,
        metadata: {
          operation: 'localLogout',
          error: (localError as any)?.message || 'Erro desconhecido'
        }
      })
    }
  }

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}