'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/contexts/AuthContext'
import { 
  HomeIcon,
  ShoppingCartIcon,
  UsersIcon,
  CubeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  ShoppingCartIcon as ShoppingCartIconSolid,
  UsersIcon as UsersIconSolid,
  CubeIcon as CubeIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  BuildingOfficeIcon as BuildingOfficeIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid
} from '@heroicons/react/24/solid'

interface MenuItem {
  name: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  iconActive: React.ComponentType<React.SVGProps<SVGSVGElement>>
  description: string
  module: string
}

const menuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    iconActive: HomeIconSolid,
    description: 'Visão geral do sistema',
    module: 'dashboard'
  },
  {
    name: 'PDV',
    href: '/pdv',
    icon: ShoppingCartIcon,
    iconActive: ShoppingCartIconSolid,
    description: 'Ponto de Venda',
    module: 'pdv'
  },
  {
    name: 'Clientes',
    href: '/clientes',
    icon: UsersIcon,
    iconActive: UsersIconSolid,
    description: 'Cadastro de clientes',
    module: 'clientes'
  },
  {
    name: 'Fornecedores',
    href: '/fornecedores',
    icon: BuildingOfficeIcon,
    iconActive: BuildingOfficeIconSolid,
    description: 'Cadastro de fornecedores',
    module: 'fornecedores'
  },
  {
    name: 'Produtos',
    href: '/produtos',
    icon: CubeIcon,
    iconActive: CubeIconSolid,
    description: 'Gestão de produtos',
    module: 'produtos'
  },
  {
    name: 'Estoque',
    href: '/estoque',
    icon: ChartBarIcon,
    iconActive: ChartBarIconSolid,
    description: 'Controle de estoque',
    module: 'estoque'
  },
  {
    name: 'Relatórios',
    href: '/reports',
    icon: DocumentTextIcon,
    iconActive: DocumentTextIconSolid,
    description: 'Relatórios e análises',
    module: 'reports'
  },
  {
    name: 'Usuários',
    href: '/usuarios',
    icon: UserGroupIcon,
    iconActive: UserGroupIconSolid,
    description: 'Gerenciar usuários',
    module: 'users'
  },
  {
    name: 'Configurações Gerais',
    href: '/admin/configuracoes',
    icon: Cog6ToothIcon,
    iconActive: Cog6ToothIconSolid,
    description: 'Administração do sistema',
    module: 'settings'
  }
]

export default function Sidebar() {
  const pathname = usePathname()
  const { canAccessModule, loading } = usePermissions()
  const { user } = useAuth()

  // Filtrar itens do menu baseado nas permissões
  const visibleMenuItems = menuItems.filter(item => canAccessModule(item.module))

  if (loading) {
    return (
      <aside className="w-64 bg-gradient-to-b from-primary to-primary-dark border-r border-primary/20 flex flex-col h-full shadow-xl">
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white"></div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-64 bg-gradient-to-b from-primary to-primary-dark text-white flex flex-col h-full shadow-xl transition-all duration-300">
      {/* Cabeçalho */}
      <div className="p-4 border-b border-white/10 bg-primary-dark/30">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-lg shadow-md">
            <img src="/pvn.svg" alt="Logo PVN" className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">PVN</h1>
            <p className="text-xs text-white/80">Sistema de Vendas</p>
          </div>
        </div>
      </div>
      
      {/* Menu de navegação */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {visibleMenuItems.map((item) => {
          const isActive = pathname.startsWith(item.href) && item.href !== '/'
          const Icon = isActive ? item.iconActive : item.icon
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg mx-2
                transition-all duration-200 transform
                ${isActive 
                  ? 'bg-white/20 text-white shadow-md backdrop-blur-sm' 
                  : 'text-white/80 hover:bg-white/10 hover:text-white hover:translate-x-1 hover:shadow-md'
                }
              `}
              title={item.description}
            >
              <Icon
                className={`
                  mr-3 h-5 w-5 flex-shrink-0
                  ${isActive ? 'text-white' : 'text-white/80 group-hover:text-white'}
                `}
                aria-hidden="true"
              />
              {item.name}
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 bg-white rounded-full"></span>
              )}
            </Link>
          )
        })}
      </nav>
      
      {/* Perfil do usuário */}
      <div className="p-4 border-t border-white/10 bg-primary-dark/50 backdrop-blur-sm">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <UsersIcon className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="ml-3 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">
              {user?.user_metadata?.full_name || 'Usuário'}
            </p>
            <p className="text-xs text-white/70 truncate">
              {user?.email || 'usuario@exemplo.com'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Rodapé */}
      <div className="p-4 border-t border-white/10 bg-primary-dark/30">
        <div className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-md">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-white">
                Sistema de Vendas
              </p>
              <p className="text-xs text-white/60">
                v1.0.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}