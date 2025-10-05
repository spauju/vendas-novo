'use client'

import { useState } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import SimpleAccessControl from '@/components/admin/SimpleAccessControl'
import CadastroUsuarios from '@/components/admin/CadastroUsuarios'
import DadosEmpresa from '@/components/admin/DadosEmpresa'
import ConfiguracaoPix from '@/components/admin/ConfiguracaoPix'
import UserDebug from '@/components/debug/UserDebug'
import { Toaster } from 'react-hot-toast'
import { 
  UserPlusIcon, 
  BuildingOfficeIcon, 
  CreditCardIcon 
} from '@heroicons/react/24/outline'

type TabType = 'usuarios' | 'empresa' | 'pix'

interface Tab {
  id: TabType
  name: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

const tabs: Tab[] = [
  {
    id: 'usuarios',
    name: 'Cadastro de Usuários',
    icon: UserPlusIcon
  },
  {
    id: 'empresa',
    name: 'Dados da Empresa',
    icon: BuildingOfficeIcon
  },
  {
    id: 'pix',
    name: 'Configuração de PIX',
    icon: CreditCardIcon
  }
]

export default function ConfiguracoesGeraisPage() {
  const [activeTab, setActiveTab] = useState<TabType>('usuarios')

  const renderTabContent = () => {
    switch (activeTab) {
      case 'usuarios':
        return <CadastroUsuarios />
      case 'empresa':
        return <DadosEmpresa />
      case 'pix':
        return <ConfiguracaoPix />
      default:
        return <CadastroUsuarios />
    }
  }

  return (
    <SimpleAccessControl>
      <MainLayout>
        <Toaster position="top-right" />
        <div className="bg-gray-50 -m-4 sm:-m-6 min-h-[calc(100vh-120px)]">
          <div className="max-w-7xl mx-auto p-6">
            {/* Componente de Debug Temporário */}
            <UserDebug />
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Configurações Gerais
              </h1>
              <p className="text-gray-600">
                Gerencie usuários, dados da empresa e configurações de pagamento
              </p>
            </div>

            {/* Tabs Navigation */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6" aria-label="Tabs">
                  {tabs.map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                          flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                          ${isActive
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }
                        `}
                      >
                        <Icon className={`h-5 w-5 mr-2 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                        {tab.name}
                      </button>
                    )
                  })}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {renderTabContent()}
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    </SimpleAccessControl>
  )
}
