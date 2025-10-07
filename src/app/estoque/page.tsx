'use client'

import { useState, useEffect } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import { supabase } from '@/lib/supabase'
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  MinusIcon,
  ClockIcon,
  CubeIcon,
  TagIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface StockMovement {
  id: string
  product_id: string
  productName: string
  movement_type: 'entrada' | 'saida' | 'ajuste'
  quantity: number
  notes: string | null
  created_at: string
  user_id: string
  userName?: string
}

interface Product {
  id: string
  name: string
  barcode: string | null
  category: string | null
  stock_quantity: number
  min_stock: number
  cost_price: number
  sale_price: number
  updated_at: string
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('7')
  const [showMovementForm, setShowMovementForm] = useState(false)
  const [movementForm, setMovementForm] = useState({
    productId: '',
    movement_type: 'entrada' as 'entrada' | 'saida' | 'ajuste',
    quantity: 1,
    notes: ''
  })

  // Carregar produtos do Supabase
  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('name')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
      toast.error('Erro ao carregar produtos')
    }
  }

  // Carregar movimentações do Supabase
  const loadMovements = async () => {
    try {
      console.log('Iniciando carregamento de movimentações...')
      
      // Primeiro, tentar query simples sem join
      const { data: simpleData, error: simpleError } = await supabase
        .from('stock_movements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      console.log('Query simples - Resposta do Supabase:', { data: simpleData, error: simpleError })

      if (simpleError) {
        console.error('Erro na query simples:', simpleError)
        toast.error(`Erro ao carregar movimentações: ${simpleError.message}`)
        setMovements([])
        return
      }
      
      // Se não há dados, define array vazio
      if (!simpleData || simpleData.length === 0) {
        console.log('Nenhuma movimentação encontrada - tabela vazia')
        setMovements([])
        return
      }

      // Agora buscar os nomes dos produtos separadamente
      console.log('Buscando nomes dos produtos...')
      const productIds = [...new Set(simpleData.map(movement => movement.product_id))]
      
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name')
        .in('id', productIds)

      console.log('Produtos encontrados:', { data: productsData, error: productsError })

      // Criar mapa de produtos para facilitar o lookup
      const productsMap = new Map()
      if (productsData && !productsError) {
        productsData.forEach(product => {
          productsMap.set(product.id, product.name)
        })
      }
      
      // Combinar dados de movimentações com nomes dos produtos
      const movementsWithProductName = simpleData.map(movement => ({
        ...movement,
        productName: productsMap.get(movement.product_id) || 'Produto não encontrado'
      }))
      
      console.log('Movimentações processadas:', movementsWithProductName)
      setMovements(movementsWithProductName)
    } catch (error) {
      console.error('Erro ao carregar movimentações:', error)
      console.error('Tipo do erro:', typeof error)
      console.error('Erro stringificado:', JSON.stringify(error, null, 2))
      toast.error(`Erro ao carregar movimentações: ${(error as any)?.message || 'Erro desconhecido'}`)
      setMovements([])
    }
  }

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([loadProducts(), loadMovements()])
      setLoading(false)
    }
    loadData()
  }, [])

  // Filtrar produtos
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.barcode && product.barcode.includes(searchTerm))
  )

  // Produtos com estoque baixo
  const lowStockProducts = products.filter(product => product.stock_quantity <= product.min_stock)

  // Produtos sem estoque
  const outOfStockProducts = products.filter(product => product.stock_quantity === 0)

  // Valor total do estoque
  const totalStockValue = products.reduce((sum, product) => 
    sum + (product.stock_quantity * product.cost_price), 0
  )

  // Calcular movimentações recentes
  const recentMovements = movements
    .filter(movement => {
      const movementDate = new Date(movement.created_at)
      const daysAgo = parseInt(selectedPeriod)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo)
      return movementDate >= cutoffDate
    })
    .slice(0, 10)

  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!movementForm.productId || !movementForm.quantity || !movementForm.notes) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    try {
      const quantity = parseInt(movementForm.quantity.toString())
      
      // Inserir movimentação no Supabase
      const { error } = await supabase
        .from('stock_movements')
        .insert({
          product_id: movementForm.productId,
          movement_type: movementForm.movement_type,
          quantity: Math.abs(quantity),
          notes: movementForm.notes
          // user_id será null por enquanto até implementarmos autenticação
        })

      if (error) throw error

      toast.success('Movimentação registrada com sucesso!')
      setShowMovementForm(false)
      setMovementForm({
        productId: '',
        movement_type: 'entrada',
        quantity: 1,
        notes: ''
      })

      // Recarregar dados
      await Promise.all([loadProducts(), loadMovements()])
    } catch (error) {
      console.error('Erro ao registrar movimentação:', {
        error,
        message: (error as any)?.message || 'Erro desconhecido',
        details: (error as any)?.details || 'Sem detalhes',
        hint: (error as any)?.hint || 'Sem dica',
        code: (error as any)?.code || 'Sem código'
      })
      
      // Mostrar mensagem de erro mais específica
      const errorMessage = (error as any)?.message || 'Erro desconhecido ao registrar movimentação'
      toast.error(`Erro: ${errorMessage}`)
    }
  }

  const getMovementIcon = (movement_type: string) => {
    switch (movement_type) {
      case 'entrada':
        return <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />
      case 'saida':
        return <ArrowTrendingDownIcon className="w-4 h-4 text-red-600" />
      case 'ajuste':
        return <DocumentTextIcon className="w-4 h-4 text-blue-600" />
      default:
        return <ClockIcon className="w-4 h-4 text-gray-600" />
    }
  }

  const getMovementColor = (movement_type: string) => {
    switch (movement_type) {
      case 'entrada':
        return 'text-green-600 bg-green-100'
      case 'saida':
        return 'text-red-600 bg-red-100'
      case 'ajuste':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getMovementTypeText = (movement_type: string) => {
    switch (movement_type) {
      case 'entrada':
        return 'Entrada'
      case 'saida':
        return 'Saída'
      case 'ajuste':
        return 'Ajuste'
      default:
        return movement_type
    }
  }

  const getStockStatus = (product: Product) => {
    if (product.stock_quantity === 0) {
      return { text: 'Sem estoque', color: 'text-red-600 bg-red-100' }
    }
    if (product.stock_quantity <= product.min_stock) {
      return { text: 'Estoque baixo', color: 'text-yellow-600 bg-yellow-100' }
    }
    return { text: 'Normal', color: 'text-green-600 bg-green-100' }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black">
              Controle de Estoque
            </h1>
            <p className="text-black">
              Monitore e gerencie seu estoque
            </p>
          </div>
          
          <button
            onClick={() => setShowMovementForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 shadow-lg shadow-teal-600/25"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Nova Movimentação</span>
          </button>
        </div>

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CubeIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-black">Total de Produtos</p>
                <p className="text-2xl font-bold text-black">{products.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-black">Valor do Estoque</p>
                <p className="text-2xl font-bold text-black">
                  R$ {((totalStockValue || 0) || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-black">Estoque Baixo</p>
                <p className="text-2xl font-bold text-black">{lowStockProducts.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <TagIcon className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-black">Sem Estoque</p>
                <p className="text-2xl font-bold text-black">{outOfStockProducts.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alertas de estoque baixo */}
        {lowStockProducts.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 mr-2" />
              <h3 className="text-lg font-semibold text-yellow-800">
                Produtos com Estoque Baixo
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-lg p-4 border border-yellow-200">
                  <h4 className="font-medium text-black">{product.name}</h4>
                <p className="text-sm text-black">Estoque atual: {product.stock_quantity}</p>
                <p className="text-sm text-black">Estoque mínimo: {product.min_stock}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista de produtos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-black">
              Produtos em Estoque
            </h3>
              </div>
              
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              <div className="divide-y divide-gray-200">
                {filteredProducts.map((product) => {
                  const status = getStockStatus(product)
                  return (
                    <div key={product.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-black">{product.name}</h4>
                          <p className="text-sm text-black">{product.category || 'Sem categoria'}</p>
                          <div className="flex items-center mt-1 space-x-4">
                            <span className="text-sm text-gray-500">
                              Atual: {product.stock_quantity}
                            </span>
                            <span className="text-sm text-gray-500">
                              Mín: {product.min_stock}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                            {status.text}
                          </span>
                          <p className="text-sm text-gray-600 mt-1">
                            R$ {(product.stock_quantity * product.cost_price).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Movimentações recentes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Movimentações Recentes
                </h3>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="7">Últimos 7 dias</option>
                  <option value="30">Últimos 30 dias</option>
                  <option value="90">Últimos 90 dias</option>
                </select>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              <div className="divide-y divide-gray-200">
                {recentMovements.map((movement) => (
                  <div key={movement.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="mt-1">
                          {getMovementIcon(movement.movement_type)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {movement.productName}
                          </h4>
                          <p className="text-sm text-gray-600">{movement.notes}</p>
                          <div className="flex items-center mt-1 space-x-4">
                            <span className="text-xs text-gray-500">
                              {new Date(movement.created_at).toLocaleDateString('pt-BR')}
                            </span>
                            <span className="text-xs text-gray-500">
                              por {movement.userName || 'Sistema'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMovementColor(movement.movement_type)}`}>
                          {movement.movement_type === 'entrada' ? '+' : movement.movement_type === 'saida' ? '-' : '±'}{movement.quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de nova movimentação */}
      {showMovementForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Nova Movimentação
                </h2>
                <button
                  onClick={() => setShowMovementForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleMovementSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Produto *
                  </label>
                  <select
                    required
                    value={movementForm.productId}
                    onChange={(e) => setMovementForm({...movementForm, productId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">Selecione um produto</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} (Estoque: {product.stock_quantity})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Movimentação *
                  </label>
                  <select
                    value={movementForm.movement_type}
                    onChange={(e) => setMovementForm({...movementForm, movement_type: e.target.value as 'entrada' | 'saida' | 'ajuste'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                    <option value="ajuste">Ajuste</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantidade *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={movementForm.quantity}
                    onChange={(e) => setMovementForm({...movementForm, quantity: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo
                  </label>
                  <textarea
                    value={movementForm.notes}
                    onChange={(e) => setMovementForm({...movementForm, notes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Descreva o motivo da movimentação..."
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowMovementForm(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all duration-200"
                  >
                    Registrar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}