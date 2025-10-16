import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Usuario, DadosEmpresa, ConfiguracaoPix, NovoUsuario, FormDadosEmpresa, FormConfiguracaoPix } from '@/types/admin'
import toast from 'react-hot-toast'

export const useAdmin = () => {
  const [isLoading, setIsLoading] = useState(false)

  // Cadastrar novo usuário
  const cadastrarUsuario = useCallback(async (dadosUsuario: NovoUsuario): Promise<boolean> => {
    try {
      setIsLoading(true)

      // Get current session token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Você precisa estar autenticado para criar usuários')
      }

      // Call API route to create user (uses service role key server-side)
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: dadosUsuario.email,
          senha: dadosUsuario.senha,
          full_name: dadosUsuario.full_name
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar usuário')
      }

      toast.success('Usuário cadastrado com sucesso!')
      return true
    } catch (error: any) {
      console.error('Erro ao cadastrar usuário:', error)
      toast.error(error.message || 'Erro ao cadastrar usuário')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Listar usuários
  const listarUsuarios = useCallback(async (): Promise<Usuario[]> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, funcao, created_at')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return data || []
    } catch (error: any) {
      console.error('Erro ao listar usuários:', error)
      toast.error('Erro ao carregar usuários')
      return []
    }
  }, [supabase])

  // Carregar dados da empresa
  const carregarDadosEmpresa = useCallback(async (): Promise<DadosEmpresa | null> => {
    try {
      const { data, error } = await supabase
        .from('dados_empresa')
        .select('*')
        .eq('id', 1)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      return data || null
    } catch (error: any) {
      console.error('Erro ao carregar dados da empresa:', error)
      return null
    }
  }, [supabase])

  // Salvar dados da empresa
  const salvarDadosEmpresa = useCallback(async (dados: FormDadosEmpresa): Promise<boolean> => {
    try {
      setIsLoading(true)

      const { error } = await supabase
        .from('dados_empresa')
        .upsert({
          id: 1,
          ...dados,
          updated_at: new Date().toISOString()
        })

      if (error) {
        throw error
      }

      toast.success('Dados da empresa atualizados com sucesso!')
      return true
    } catch (error: any) {
      console.error('Erro ao salvar dados da empresa:', error)
      toast.error('Erro ao salvar dados da empresa')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  // Carregar configuração PIX
  const carregarConfiguracaoPix = useCallback(async (): Promise<ConfiguracaoPix | null> => {
    try {
      const { data, error } = await supabase
        .from('configuracao_pix')
        .select('*')
        .eq('id', 1)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      return data || null
    } catch (error: any) {
      console.error('Erro ao carregar configuração PIX:', error)
      return null
    }
  }, [supabase])

  // Salvar configuração PIX
  const salvarConfiguracaoPix = useCallback(async (dados: FormConfiguracaoPix): Promise<boolean> => {
    try {
      setIsLoading(true)

      const { error } = await supabase
        .from('configuracao_pix')
        .upsert({
          id: 1,
          ...dados,
          updated_at: new Date().toISOString()
        })

      if (error) {
        throw error
      }

      toast.success('Configuração PIX salva com sucesso!')
      return true
    } catch (error: any) {
      console.error('Erro ao salvar configuração PIX:', error?.message || 'Erro desconhecido')
      console.error('Detalhes do erro:', {
        message: error?.message || 'Erro desconhecido',
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      })
      if (error) {
        console.error('Objeto error completo:', error)
      }
      toast.error(`Erro ao salvar configuração PIX: ${error?.message || 'Erro desconhecido'}`)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  return {
    isLoading,
    cadastrarUsuario,
    listarUsuarios,
    carregarDadosEmpresa,
    salvarDadosEmpresa,
    carregarConfiguracaoPix,
    salvarConfiguracaoPix
  }
}
