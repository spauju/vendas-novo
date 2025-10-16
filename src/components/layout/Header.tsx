'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  UserCircleIcon, 
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  Bars3Icon
} from '@heroicons/react/24/outline'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import toast from 'react-hot-toast'

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, profile, signOut } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await signOut()
      toast.success('Logout realizado com sucesso!')
      // Redirecionar para a página de login após logout
      router.replace('/auth')
    } catch (error) {
      toast.error('Erro ao fazer logout')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm backdrop-blur-sm bg-white/80">
      {/* Menu mobile e logo */}
      <div className="flex items-center space-x-4">
        {/* Botão menu mobile */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-primary hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>


      </div>

      {/* Informações do usuário e menu */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Data e hora atual */}
        <div className="hidden md:block text-right">
          <p className="text-xs sm:text-sm font-medium text-gray-900">
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'short',
              day: 'numeric',
              month: 'short'
            })}
          </p>
          <p className="text-xs text-gray-500">
            {new Date().toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>

        <Menu as="div" className="relative">
          <Menu.Button className="flex items-center space-x-2 sm:space-x-3 p-2 rounded-xl hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 hover:shadow-sm">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-primary to-primary-dark rounded-full flex items-center justify-center">
              <UserCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-900 group-hover:text-primary transition-colors">
                {profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário'}
              </p>
              <p className="text-xs text-gray-500 group-hover:text-primary/80 transition-colors capitalize">
                {profile?.role === 'administrador' ? 'Administrador' : 
                 profile?.role === 'gerente' ? 'Gerente' : 
                 profile?.role === 'user' ? 'Usuário' : 'Usuário'}
              </p>
            </div>
            <ChevronDownIcon className="w-4 h-4 text-gray-500 hidden sm:block" aria-hidden="true" />
          </Menu.Button>
          
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-white rounded-xl shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-100 overflow-hidden backdrop-blur-sm bg-white/95">
              <div className="p-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => router.push('/perfil')}
                      className={`${
                        active ? 'bg-gray-50 text-primary' : 'text-gray-700'
                      } group flex w-full items-center rounded-lg px-3 py-2.5 text-sm transition-all duration-200`}
                    >
                      <UserCircleIcon className="mr-3 h-5 w-5 text-gray-500" />
                      Meu Perfil
                    </button>
                  )}
                </Menu.Item>

                <div className="my-1 border-t border-gray-100" />
                
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleSignOut}
                      disabled={isLoading}
                      className={`${
                        active ? 'bg-red-50 text-red-600' : 'text-red-500'
                      } group flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-50`}
                    >
                      <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
                      {isLoading ? 'Saindo...' : 'Sair'}
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
    </header>
  )
}