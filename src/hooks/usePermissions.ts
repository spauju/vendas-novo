import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { logSupabaseDB, logSupabaseAuth } from '@/lib/logger'

export interface Permission {
  module: string
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

export interface UserRole {
  role: 'user' | 'gerente' | 'administrador'
  permissions: Permission[]
}

export const usePermissions = () => {
  const { user } = useAuth()
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadUserPermissions()
    } else {
      setUserRole(null)
      setLoading(false)
    }
  }, [user])

  const loadUserPermissions = async () => {
    try {
      setLoading(true)
      
      logSupabaseDB.success('load_permissions_start', 'profiles', { 
        component: 'usePermissions',
        userId: user?.id,
        metadata: { operation: 'loadUserPermissions' }
      })
      
      // Buscar perfil do usuário usando service role para evitar RLS
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, active')
        .eq('id', user!.id)
        .single()

      if (profileError) {
        logSupabaseDB.failed('fetch_profile', 'profiles', profileError as Error, {
          component: 'usePermissions',
          userId: user!.id,
          metadata: { 
            message: (profileError as any)?.message || 'Erro desconhecido',
            code: (profileError as any)?.code || 'N/A'
          }
        });
        
        // Se o perfil não existe, criar um perfil padrão
        if (profileError.code === 'PGRST116') {
          logSupabaseDB.success('profile_not_found', 'profiles', { 
            component: 'usePermissions',
            userId: user!.id,
            metadata: { 
              message: 'Perfil não encontrado, criando perfil padrão...'
            }
          });
          
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user!.id,
              email: user!.email,
              full_name: user!.user_metadata?.full_name || user!.email?.split('@')[0] || 'Usuário',
              role: 'user',
              active: true
            })
            .select('role, active')
            .single()
          
          if (createError) {
            logSupabaseDB.failed('create_profile', 'profiles', createError as Error, {
              component: 'usePermissions',
              userId: user!.id,
              metadata: { 
                message: (createError as any)?.message || 'Erro desconhecido',
                code: (createError as any)?.code || 'N/A'
              }
            });
            
            logSupabaseAuth.failed('default_role_fallback', new Error('Failed to create profile, using default role'), {
              component: 'usePermissions',
              metadata: { reason: createError.message }
            })
            
            setUserRole({
              role: 'user',
              permissions: []
            })
            setLoading(false)
            return
          }
          
          profile = newProfile
        } else {
          // Em caso de erro de RLS ou outro, usar role padrão
          logSupabaseAuth.failed('default_role_fallback', new Error('Profile error, using default role'), {
            component: 'usePermissions',
            metadata: { reason: profileError.message }
          })
          
          setUserRole({
            role: 'user',
            permissions: []
          })
          setLoading(false)
          return
        }
      }

      if (!profile) {
        throw new Error('Perfil não encontrado')
      }

      // Verificar se o usuário está ativo
      if (!profile.active) {
        throw new Error('Usuário inativo')
      }

      logSupabaseDB.success('profile_found', 'profiles', { 
        component: 'usePermissions',
        userId: user!.id,
        metadata: { 
          operation: 'profileValidation',
          profile: profile,
          role: profile.role
        }
      })

      // Buscar permissões do role
      const { data: permissions, error: permissionsError } = await supabase
        .from('role_permissions')
        .select('module, can_view, can_create, can_edit, can_delete')
        .eq('role', profile.role)

      if (permissionsError) {
        logSupabaseDB.failed('fetch_permissions', 'profiles', permissionsError as Error, {
          component: 'usePermissions',
          userId: user!.id,
          metadata: { 
            role: profile.role,
            message: (permissionsError as any)?.message || 'Erro desconhecido'
          }
        })
        // Em caso de erro, usar permissões básicas baseadas no role
        const basicPermissions = getBasicPermissions(profile.role)
        setUserRole({
          role: profile.role as 'user' | 'gerente' | 'administrador',
          permissions: basicPermissions
        })
      } else {
        logSupabaseDB.success('permissions_loaded', 'permissions', { 
          component: 'usePermissions',
          userId: user!.id,
          metadata: { 
            operation: 'loadPermissions',
            count: permissions?.length || 0,
            role: profile.role
          }
        })
        setUserRole({
          role: profile.role as 'user' | 'gerente' | 'administrador',
          permissions: permissions || []
        })
      }
    } catch (error) {
      logSupabaseDB.failed('load_permissions', 'profiles', error as Error, {
        component: 'usePermissions',
        userId: user!.id,
        metadata: { 
          message: (error as any)?.message || 'Erro desconhecido',
          type: (error as any)?.constructor?.name || 'Unknown'
        }
      })
      // Fallback para usuário básico
      setUserRole({
        role: 'user',
        permissions: getBasicPermissions('user')
      })
    } finally {
      setLoading(false)
    }
  }

  // Função para obter permissões básicas em caso de erro
  const getBasicPermissions = (role: string): Permission[] => {
    const basicModules = ['dashboard', 'pdv', 'produtos', 'estoque']
    const allModules = [...basicModules, 'clientes', 'fornecedores', 'reports']
    const adminModules = [...allModules, 'usuarios', 'system', 'admin']

    let modules: string[] = []
    let canDelete = false

    switch (role) {
      case 'administrador':
        modules = adminModules
        canDelete = true
        break
      case 'gerente':
        modules = [...allModules, 'admin']
        canDelete = true
        break
      case 'user':
      default:
        modules = basicModules
        canDelete = false
        break
    }

    return modules.map(module => ({
      module,
      can_view: true,
      can_create: true,
      can_edit: true,
      can_delete: canDelete
    }))
  }

  const hasPermission = (module: string, action: 'view' | 'create' | 'edit' | 'delete'): boolean => {
    if (!userRole) return false
    
    const permission = userRole.permissions.find(p => p.module === module)
    if (!permission) return false
    
    switch (action) {
      case 'view':
        return permission.can_view
      case 'create':
        return permission.can_create
      case 'edit':
        return permission.can_edit
      case 'delete':
        return permission.can_delete
      default:
        return false
    }
  }

  const canAccessModule = (module: string): boolean => {
    const hasAccess = userRole?.permissions.some((permission: Permission) => 
      permission.module === module && permission.can_view
    ) || false
    
    console.log(`=== DEBUG PERMISSIONS ===`)
    console.log(`Checking module: ${module}`)
    console.log(`User role:`, userRole)
    console.log(`User permissions:`, userRole?.permissions)
    console.log(`Has access to ${module}:`, hasAccess)
    
    return hasAccess
  }

  const isAdmin = (): boolean => {
    return userRole?.role === 'administrador'
  }

  const isManager = (): boolean => {
    return userRole?.role === 'gerente' || userRole?.role === 'administrador'
  }

  const isUser = (): boolean => {
    return userRole?.role === 'user'
  }

  const getRoleDisplayName = (): string => {
    switch (userRole?.role) {
      case 'administrador':
        return 'Administrador'
      case 'gerente':
        return 'Gerente'
      case 'user':
        return 'Usuário'
      default:
        return 'Usuário'
    }
  }

  return {
    userRole,
    loading,
    hasPermission,
    canAccessModule,
    isAdmin,
    isManager,
    isUser,
    getRoleDisplayName,
    loadUserPermissions
  }
}
