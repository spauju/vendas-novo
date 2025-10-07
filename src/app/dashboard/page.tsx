'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import PermissionButton from '@/components/auth/PermissionButton'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { logSupabaseDB } from '@/lib/logger'
import { 
  ShoppingCartIcon,
  UsersIcon,
  CubeIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'



export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState([
    {
      name: 'Vendas Hoje',
      value: 'R$ 0,00',
      change: '0%',
      changeType: 'positive' as const,
      icon: BanknotesIcon
    },
    {
      name: 'Produtos Vendidos',
      value: '0',
      change: '0%',
      changeType: 'positive' as const,
      icon: ShoppingCartIcon
    },
    {
      name: 'Clientes Atendidos',
      value: '0',
      change: '0%',
      changeType: 'positive' as const,
      icon: UsersIcon
    },
    {
      name: 'Produtos em Estoque',
      value: '0',
      change: '0%',
      changeType: 'positive' as const,
      icon: CubeIcon
    }
  ])

  const [lowStockProducts, setLowStockProducts] = useState<any[]>([])
  const [recentSales, setRecentSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Carregar estatísticas de vendas de hoje (usando timezone local)
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      const { data: todaySales, error: salesError } = await supabase
        .from('sales')
        .select('total_amount, created_at')
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString())

      if (salesError) throw salesError

      // Calcular estatísticas
      const totalSalesToday = todaySales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0
      const salesCount = todaySales?.length || 0

      // Carregar produtos com estoque baixo
      const { data: allProducts, error: allProductsError } = await supabase
        .from('products')
        .select('name, stock_quantity, min_stock')
        .eq('active', true)
        .order('stock_quantity', { ascending: true })

      if (allProductsError) throw allProductsError

      // Filtrar produtos com estoque baixo no lado do cliente
      const products = allProducts?.filter(product => 
        product.stock_quantity <= product.min_stock
      ).slice(0, 10) || []

      // Carregar vendas recentes
      const { data: recentSalesData, error: recentSalesError } = await supabase
        .from('sales')
        .select(`
          id,
          total_amount,
          payment_method,
          created_at,
          customers (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      if (recentSalesError) throw recentSalesError

      // Contar total de produtos em estoque
      const { data: stockCount, error: stockError } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('active', true)

      if (stockError) throw stockError

      const totalStock = stockCount?.reduce((sum, product) => sum + product.stock_quantity, 0) || 0

      // Atualizar estatísticas
      setStats([
        {
          name: 'Vendas Hoje',
          value: `R$ ${(totalSalesToday || 0).toFixed(2).replace('.', ',')}`,
          change: '0%',
          changeType: 'positive' as const,
          icon: BanknotesIcon
        },
        {
          name: 'Produtos Vendidos',
          value: salesCount.toString(),
          change: '0%',
          changeType: 'positive' as const,
          icon: ShoppingCartIcon
        },
        {
          name: 'Clientes Atendidos',
          value: salesCount.toString(),
          change: '0%',
          changeType: 'positive' as const,
          icon: UsersIcon
        },
        {
          name: 'Produtos em Estoque',
          value: totalStock.toString(),
          change: '0%',
          changeType: 'positive' as const,
          icon: CubeIcon
        }
      ])

      setLowStockProducts(products || [])
      setRecentSales(recentSalesData || [])

    } catch (error) {
      logSupabaseDB.failed('load_dashboard_data', 'sales', error as Error, {
        component: 'DashboardPage',
        metadata: {
          operation: 'loadDashboardData',
          error: (error as any)?.message || 'Erro desconhecido'
        }
      });
      toast.error('Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div>
          <h1 className="text-2xl font-bold text-black">
            Dashboard
          </h1>
          <p className="text-black">
            Visão geral do seu negócio
          </p>
        </div>

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.name} className="bg-slate-800 rounded-xl p-4 sm:p-6 shadow-card border border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-slate-400 truncate">
                      {stat.name}
                    </p>
                    <p className="text-lg sm:text-2xl font-bold text-white mt-1">
                      {stat.value}
                    </p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-3">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                  </div>
                </div>
                <div className="flex items-center mt-3 sm:mt-4">
                  {stat.changeType === 'positive' ? (
                    <ArrowTrendingUpIcon className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 mr-1 flex-shrink-0" />
                  ) : (
                    <ArrowTrendingDownIcon className="w-3 h-3 sm:w-4 sm:h-4 text-red-400 mr-1 flex-shrink-0" />
                  )}
                  <span className={`text-xs sm:text-sm font-medium ${
                    stat.changeType === 'positive' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {stat.change}
                  </span>
                  <span className="text-xs sm:text-sm text-slate-400 ml-1">
                    vs. ontem
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          {/* Produtos com estoque baixo */}
          <div className="bg-slate-800 rounded-xl shadow-card border border-slate-700">
            <div className="p-4 sm:p-6 border-b border-slate-700">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 mr-2" />
                <h2 className="text-base sm:text-lg font-semibold text-white">
                  Estoque Baixo
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-black mt-1">
                Produtos que precisam de reposição
              </p>
            </div>
            <div className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {lowStockProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-black text-sm sm:text-base truncate">
                        {product.name}
                      </p>
                      <p className="text-xs sm:text-sm text-black">
                        Estoque: {product.stock_quantity} unidades (Mín: {product.min_stock})
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <span className="inline-flex items-center px-2 py-1 sm:px-2.5 sm:py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        Baixo
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Vendas recentes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-black">
                Vendas Recentes
              </h2>
              <p className="text-xs sm:text-sm text-black mt-1">
                Últimas transações realizadas
              </p>
            </div>
            <div className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-teal-100 to-teal-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs sm:text-sm font-medium text-teal-600">
                          #{sale.id}
                        </span>
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <p className="font-medium text-black text-sm sm:text-base truncate">
                          {sale.customers?.name || 'Cliente não informado'}
                        </p>
                        <p className="text-xs sm:text-sm text-black">
                          {new Date(sale.created_at).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })} - {sale.payment_method}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="font-semibold text-black text-sm sm:text-base">
                        R$ {(sale.total_amount || 0).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Ações rápidas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-black mb-4">
            Ações Rápidas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <PermissionButton
              module="pdv"
              action="create"
              onClick={() => router.push('/pdv')}
              className="flex items-center justify-center p-3 sm:p-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 shadow-lg shadow-teal-600/25"
            >
              <ShoppingCartIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="text-sm sm:text-base font-medium">Nova Venda</span>
            </PermissionButton>
            <PermissionButton
              module="clientes"
              action="create"
              onClick={() => router.push('/clientes')}
              className="flex items-center justify-center p-3 sm:p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-600/25"
            >
              <UsersIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="text-sm sm:text-base font-medium">Cadastrar Cliente</span>
            </PermissionButton>
            <PermissionButton
              module="fornecedores"
              action="create"
              onClick={() => router.push('/fornecedores')}
              className="flex items-center justify-center p-3 sm:p-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition-all duration-200 shadow-lg shadow-orange-600/25"
            >
              <BuildingOfficeIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="text-sm sm:text-base font-medium">Cadastrar Fornecedor</span>
            </PermissionButton>
            <PermissionButton
              module="produtos"
              action="create"
              onClick={() => router.push('/produtos')}
              className="flex items-center justify-center p-3 sm:p-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg shadow-purple-600/25"
            >
              <CubeIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="text-sm sm:text-base font-medium">Adicionar Produto</span>
            </PermissionButton>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

