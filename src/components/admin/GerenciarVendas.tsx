'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  ShoppingCartIcon, 
  PencilIcon, 
  TrashIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface Sale {
  id: string
  customer_id: string | null
  user_id: string
  total_amount: number
  discount_amount: number
  final_amount: number
  status: 'pending' | 'completed' | 'cancelled'
  payment_method: string
  payment_status: 'pending' | 'paid' | 'refunded'
  notes: string | null
  created_at: string
  updated_at: string
  customers?: {
    name: string
    cpf_cnpj: string
  } | null
  profiles?: {
    full_name: string
  } | null
}

interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  products?: {
    name: string
    code: string
  } | null
}

export default function GerenciarVendas() {
  const [sales, setSales] = useState<Sale[]>([])
  const [filteredSales, setFilteredSales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  
  // Novos estados para seleção múltipla
  const [selectedSales, setSelectedSales] = useState<string[]>([])
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  
  // Novos estados para filtros avançados
  const [filterType, setFilterType] = useState<'date' | 'period' | 'range'>('date')
  const [periodType, setPeriodType] = useState<'day' | 'month' | 'year'>('day')
  const [periodValue, setPeriodValue] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [tempFilters, setTempFilters] = useState({
    filterType: 'date' as 'date' | 'period' | 'range',
    selectedDate: '',
    periodType: 'day' as 'day' | 'month' | 'year',
    periodValue: '',
    startDate: '',
    endDate: '',
    statusFilter: 'all',
    searchTerm: ''
  })

  // Removido: const supabase = createClientComponentClient()

  useEffect(() => {
    loadSales()
  }, [])

  // Função para aplicar filtros
  const applyFilters = () => {
    setFilterType(tempFilters.filterType)
    setSelectedDate(tempFilters.selectedDate)
    setPeriodType(tempFilters.periodType)
    setPeriodValue(tempFilters.periodValue)
    setStartDate(tempFilters.startDate)
    setEndDate(tempFilters.endDate)
    setStatusFilter(tempFilters.statusFilter)
    setSearchTerm(tempFilters.searchTerm)
    
    // Recarregar dados com os novos filtros
    setTimeout(() => loadSales(), 100)
  }

  // Função para limpar filtros
  const clearFilters = () => {
    const clearedFilters = {
      filterType: 'date' as 'date' | 'period' | 'range',
      selectedDate: '',
      periodType: 'day' as 'day' | 'month' | 'year',
      periodValue: '',
      startDate: '',
      endDate: '',
      statusFilter: 'all',
      searchTerm: ''
    }
    
    setTempFilters(clearedFilters)
    setFilterType(clearedFilters.filterType)
    setSelectedDate(clearedFilters.selectedDate)
    setPeriodType(clearedFilters.periodType)
    setPeriodValue(clearedFilters.periodValue)
    setStartDate(clearedFilters.startDate)
    setEndDate(clearedFilters.endDate)
    setStatusFilter(clearedFilters.statusFilter)
    setSearchTerm(clearedFilters.searchTerm)
    
    // Recarregar todos os dados
    setTimeout(() => loadSales(), 100)
  }

  const loadSales = async () => {
    try {
      setIsLoading(true)
      console.log('🔄 Carregando vendas...')
      
      let query = supabase
        .from('sales')
        .select(`
          *,
          customers (
            name,
            cpf_cnpj
          )
        `)
        .order('created_at', { ascending: false })

      // Aplicar filtros de data baseado no tipo de filtro apenas se houver valores
      if (filterType === 'date' && selectedDate) {
        const startOfDay = new Date(selectedDate + 'T00:00:00.000Z')
        const endOfDay = new Date(selectedDate + 'T23:59:59.999Z')
        query = query
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString())
      } else if (filterType === 'period' && periodValue) {
        const now = new Date()
        let startOfPeriod: Date
        let endOfPeriod: Date

        if (periodType === 'day') {
          // Filtrar por dia específico
          startOfPeriod = new Date(periodValue + 'T00:00:00.000Z')
          endOfPeriod = new Date(periodValue + 'T23:59:59.999Z')
        } else if (periodType === 'month') {
          // Filtrar por mês específico (formato: YYYY-MM)
          const [year, month] = periodValue.split('-')
          startOfPeriod = new Date(parseInt(year), parseInt(month) - 1, 1)
          endOfPeriod = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)
        } else if (periodType === 'year') {
          // Filtrar por ano específico
          const year = parseInt(periodValue)
          startOfPeriod = new Date(year, 0, 1)
          endOfPeriod = new Date(year, 11, 31, 23, 59, 59, 999)
        }

        if (startOfPeriod! && endOfPeriod!) {
          query = query
            .gte('created_at', startOfPeriod.toISOString())
            .lte('created_at', endOfPeriod.toISOString())
        }
      } else if (filterType === 'range' && startDate && endDate) {
        const startOfRange = new Date(startDate + 'T00:00:00.000Z')
        const endOfRange = new Date(endDate + 'T23:59:59.999Z')
        query = query
          .gte('created_at', startOfRange.toISOString())
          .lte('created_at', endOfRange.toISOString())
      }

      console.log('📊 Executando query com filtros:', {
        filterType,
        selectedDate,
        periodType,
        periodValue,
        startDate,
        endDate
      })

      const { data, error } = await query

      if (error) {
        console.error('❌ Erro ao carregar vendas:', error)
        toast.error(`Erro ao carregar vendas: ${error.message}`)
        setSales([])
        setFilteredSales([])
        return
      }

      console.log('✅ Vendas carregadas:', data?.length || 0)
      
      if (!data || data.length === 0) {
        console.log('ℹ️ Nenhuma venda encontrada para os filtros aplicados')
        setSales([])
        setFilteredSales([])
        return
      }

      setSales(data)
      
      // Aplicar filtros de status e busca
      let filtered = data

      if (statusFilter !== 'all') {
        filtered = filtered.filter(sale => sale.status === statusFilter)
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim()
        filtered = filtered.filter(sale => 
          sale.id.toLowerCase().includes(term) ||
          sale.customers?.name?.toLowerCase().includes(term) ||
          sale.customers?.cpf_cnpj?.toLowerCase().includes(term) ||
          sale.notes?.toLowerCase().includes(term)
        )
      }

      setFilteredSales(filtered)
      
    } catch (error) {
      console.error('❌ Erro geral ao carregar vendas:', error)
      toast.error('Erro inesperado ao carregar vendas')
      setSales([])
      setFilteredSales([])
    } finally {
      setIsLoading(false)
    }
  }

  const loadSaleItems = async (saleId: string) => {
    try {
      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          *,
          products (
            name,
            code
          )
        `)
        .eq('sale_id', saleId)

      if (error) throw error

      setSaleItems(data || [])
    } catch (error) {
      console.error('Erro ao carregar itens da venda:', error)
      toast.error('Erro ao carregar itens da venda')
    }
  }

  const handleViewDetails = async (sale: Sale) => {
    setSelectedSale(sale)
    await loadSaleItems(sale.id)
    setShowDetailsModal(true)
  }

  const handleDeleteSale = (sale: Sale) => {
    setSelectedSale(sale)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!selectedSale) return

    try {
      // Primeiro excluir os sale_items relacionados
      const { error: itemsError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', selectedSale.id)

      if (itemsError) {
        console.error('Erro ao excluir sale_items:', itemsError)
        throw new Error(`Erro ao excluir itens da venda: ${itemsError.message}`)
      }

      // Agora excluir a venda
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', selectedSale.id)

      if (error) throw error

      toast.success('Venda excluída com sucesso!')
      setShowDeleteModal(false)
      setSelectedSale(null)
      loadSales()
    } catch (error: any) {
      console.error('Erro ao excluir venda:', error)
      toast.error(`Erro ao excluir venda: ${error?.message || 'Erro desconhecido'}`)
    }
  }

  // Funções para seleção múltipla
  const handleSelectSale = (saleId: string) => {
    setSelectedSales(prev => 
      prev.includes(saleId) 
        ? prev.filter(id => id !== saleId)
        : [...prev, saleId]
    )
  }

  const handleSelectAll = () => {
    if (selectedSales.length === filteredSales.length) {
      setSelectedSales([])
    } else {
      setSelectedSales(filteredSales.map(sale => sale.id))
    }
  }

  const confirmBulkDelete = async () => {
    if (selectedSales.length === 0) return

    try {
      console.log('Tentando excluir vendas:', selectedSales)
      
      // Primeiro, vamos verificar se há sale_items relacionados e excluí-los
      for (const saleId of selectedSales) {
        const { error: itemsError } = await supabase
          .from('sale_items')
          .delete()
          .eq('sale_id', saleId)
        
        if (itemsError) {
          console.error('Erro ao excluir sale_items para venda', saleId, ':', itemsError)
          throw new Error(`Erro ao excluir itens da venda ${saleId}: ${itemsError.message}`)
        }
      }
      
      // Agora excluir as vendas
      const { data, error } = await supabase
        .from('sales')
        .delete()
        .in('id', selectedSales)

      console.log('Resultado da exclusão:', { data, error })

      if (error) {
        console.error('Erro detalhado:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      toast.success(`${selectedSales.length} venda(s) excluída(s) com sucesso!`)
      setShowBulkDeleteModal(false)
      setSelectedSales([])
      loadSales()
    } catch (error: any) {
      console.error('Erro ao excluir vendas:', {
        message: error?.message || 'Erro desconhecido',
        details: error?.details || 'Sem detalhes',
        hint: error?.hint || 'Sem dica',
        code: error?.code || 'Sem código',
        fullError: error
      })
      toast.error(`Erro ao excluir vendas: ${error?.message || 'Erro desconhecido'}`)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: 'Concluída', color: 'bg-green-100 text-green-800' },
      pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
      cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-800' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { label: 'Pago', color: 'bg-green-100 text-green-800' },
      pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
      refunded: { label: 'Reembolsado', color: 'bg-gray-100 text-gray-800' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  const getTotalSales = () => {
    return filteredSales.reduce((sum, sale) => sum + sale.final_amount, 0)
  }

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <ShoppingCartIcon className="h-6 w-6 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Gerenciar Vendas</h3>
        </div>

        {/* Filtros Avançados */}
        <div className="space-y-4 mb-6">
          {/* Tipo de Filtro */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Filtro
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="filterType"
                  value="date"
                  checked={tempFilters.filterType === 'date'}
                  onChange={(e) => setTempFilters({...tempFilters, filterType: e.target.value as 'date' | 'period' | 'range'})}
                  className="mr-2"
                />
                Data Específica
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="filterType"
                  value="period"
                  checked={tempFilters.filterType === 'period'}
                  onChange={(e) => setTempFilters({...tempFilters, filterType: e.target.value as 'date' | 'period' | 'range'})}
                  className="mr-2"
                />
                Período
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="filterType"
                  value="range"
                  checked={tempFilters.filterType === 'range'}
                  onChange={(e) => setTempFilters({...tempFilters, filterType: e.target.value as 'date' | 'period' | 'range'})}
                  className="mr-2"
                />
                Intervalo de Datas
              </label>
            </div>
          </div>

          {/* Filtros Condicionais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Data Específica */}
            {tempFilters.filterType === 'date' && (
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data
                </label>
                <div className="relative">
                  <CalendarIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="date"
                    value={tempFilters.selectedDate}
                    onChange={(e) => setTempFilters({...tempFilters, selectedDate: e.target.value})}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Filtro por Período */}
            {tempFilters.filterType === 'period' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Período
                  </label>
                  <select
                    value={tempFilters.periodType}
                    onChange={(e) => setTempFilters({...tempFilters, periodType: e.target.value as 'day' | 'month' | 'year', periodValue: ''})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="day">Dia</option>
                    <option value="month">Mês</option>
                    <option value="year">Ano</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {tempFilters.periodType === 'day' && 'Selecionar Dia'}
                    {tempFilters.periodType === 'month' && 'Selecionar Mês'}
                    {tempFilters.periodType === 'year' && 'Selecionar Ano'}
                  </label>
                  {tempFilters.periodType === 'day' && (
                    <input
                      type="date"
                      value={tempFilters.periodValue}
                      onChange={(e) => setTempFilters({...tempFilters, periodValue: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  {tempFilters.periodType === 'month' && (
                    <input
                      type="month"
                      value={tempFilters.periodValue}
                      onChange={(e) => setTempFilters({...tempFilters, periodValue: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  {tempFilters.periodType === 'year' && (
                    <input
                      type="number"
                      min="2020"
                      max="2030"
                      placeholder="Ex: 2024"
                      value={tempFilters.periodValue}
                      onChange={(e) => setTempFilters({...tempFilters, periodValue: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              </>
            )}

            {/* Intervalo de Datas */}
            {tempFilters.filterType === 'range' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Inicial
                  </label>
                  <input
                    type="date"
                    value={tempFilters.startDate}
                    onChange={(e) => setTempFilters({...tempFilters, startDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Final
                  </label>
                  <input
                    type="date"
                    value={tempFilters.endDate}
                    onChange={(e) => setTempFilters({...tempFilters, endDate: e.target.value})}
                    min={tempFilters.startDate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={tempFilters.statusFilter}
                onChange={(e) => setTempFilters({...tempFilters, statusFilter: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos os Status</option>
                <option value="completed">Concluída</option>
                <option value="pending">Pendente</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>

            {/* Busca */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ID, cliente, CPF..."
                  value={tempFilters.searchTerm}
                  onChange={(e) => setTempFilters({...tempFilters, searchTerm: e.target.value})}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              onClick={applyFilters}
              className="flex-1 sm:flex-none px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-medium"
            >
              🔍 Buscar
            </button>
            <button
              onClick={clearFilters}
              className="flex-1 sm:flex-none px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors font-medium"
            >
              🗑️ Limpar
            </button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingCartIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-600">Total de Vendas</p>
                <p className="text-2xl font-semibold text-blue-900">{filteredSales.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">R$</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-600">Valor Total</p>
                <p className="text-2xl font-semibold text-green-900">{formatCurrency(getTotalSales())}</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-yellow-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">⏳</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-yellow-600">Pendentes</p>
                <p className="text-2xl font-semibold text-yellow-900">
                  {filteredSales.filter(sale => sale.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">✓</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-600">Concluídas</p>
                <p className="text-2xl font-semibold text-purple-900">
                  {filteredSales.filter(sale => sale.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de vendas */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Barra de ações para seleção múltipla */}
        {selectedSales.length > 0 && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm font-medium text-blue-900">
                  {selectedSales.length} venda(s) selecionada(s)
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowBulkDeleteModal(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <TrashIcon className="h-4 w-4 mr-1" />
                  Excluir Selecionadas
                </button>
                <button
                  onClick={() => setSelectedSales([])}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Versão Desktop */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedSales.length === filteredSales.length && filteredSales.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID / Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pagamento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    Carregando vendas...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    Nenhuma venda encontrada para os filtros aplicados
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className={`hover:bg-gray-50 ${selectedSales.includes(sale.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedSales.includes(sale.id)}
                        onChange={() => handleSelectSale(sale.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        #{sale.id.slice(-8)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDateTime(sale.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {sale.customers?.name || 'Cliente não informado'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {sale.customers?.cpf_cnpj || 'CPF não informado'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        Vendedor não informado
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(sale.final_amount)}
                      </div>
                      {sale.discount_amount > 0 && (
                        <div className="text-sm text-gray-500">
                          Desc: {formatCurrency(sale.discount_amount)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">
                        {sale.payment_method}
                      </div>
                      <div className="mt-1">
                        {getPaymentStatusBadge(sale.payment_status)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(sale.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setSelectedSale(sale)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50"
                          title="Ver detalhes"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSale(sale)}
                          className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                          title="Excluir venda"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Versão Mobile/Tablet */}
        <div className="lg:hidden">
          {isLoading ? (
            <div className="p-6 text-center text-gray-500">
              Carregando vendas...
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Nenhuma venda encontrada para os filtros aplicados
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredSales.map((sale) => (
                <div key={sale.id} className={`p-4 hover:bg-gray-50 ${selectedSales.includes(sale.id) ? 'bg-blue-50' : ''}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedSales.includes(sale.id)}
                        onChange={() => handleSelectSale(sale.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          #{sale.id.slice(-8)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDateTime(sale.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedSale(sale)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50"
                        title="Ver detalhes"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSale(sale)}
                        className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                        title="Excluir venda"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase">Cliente</div>
                      <div className="text-sm text-gray-900">
                        {sale.customers?.name || 'Cliente não informado'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {sale.customers?.cpf_cnpj || 'CPF não informado'}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase">Valor</div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(sale.final_amount)}
                      </div>
                      {sale.discount_amount > 0 && (
                        <div className="text-xs text-gray-500">
                          Desc: {formatCurrency(sale.discount_amount)}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase">Pagamento</div>
                      <div className="text-sm text-gray-900 capitalize">
                        {sale.payment_method}
                      </div>
                      <div className="mt-1">
                        {getPaymentStatusBadge(sale.payment_status)}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase">Status</div>
                      <div className="mt-1">
                        {getStatusBadge(sale.status)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmação de exclusão */}
      {showDeleteModal && selectedSale && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">
                Confirmar Exclusão
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Tem certeza que deseja excluir a venda #{selectedSale.id.slice(-8)}?
                  Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalhes da venda */}
      {showDetailsModal && selectedSale && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Detalhes da Venda #{selectedSale.id.slice(-8)}
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Fechar</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Informações da Venda</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Data:</strong> {formatDateTime(selectedSale.created_at)}</div>
                  <div><strong>Cliente:</strong> {selectedSale.customers?.name || 'Não informado'}</div>
                  <div><strong>CPF:</strong> {selectedSale.customers?.cpf_cnpj || 'Não informado'}</div>
                  <div><strong>Vendedor:</strong> Não informado</div>
                  <div><strong>Método de Pagamento:</strong> {selectedSale.payment_method}</div>
                  <div><strong>Status:</strong> {getStatusBadge(selectedSale.status)}</div>
                  <div><strong>Status do Pagamento:</strong> {getPaymentStatusBadge(selectedSale.payment_status)}</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Valores</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Subtotal:</strong> {formatCurrency(selectedSale.total_amount)}</div>
                  <div><strong>Desconto:</strong> {formatCurrency(selectedSale.discount_amount)}</div>
                  <div className="text-lg font-bold">
                    <strong>Total Final:</strong> {formatCurrency(selectedSale.final_amount)}
                  </div>
                </div>
                {selectedSale.notes && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Observações</h4>
                    <p className="text-sm text-gray-600">{selectedSale.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-4">Itens da Venda</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Produto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Código
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qtd
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Preço Unit.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {saleItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.products?.name || 'Produto não encontrado'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.products?.code || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(item.total_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão em lote */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">
                Confirmar Exclusão em Lote
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Tem certeza que deseja excluir {selectedSales.length} venda(s) selecionada(s)?
                  Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowBulkDeleteModal(false)}
                    className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmBulkDelete}
                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                  >
                    Excluir {selectedSales.length} Venda(s)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}