'use client'

import { useState, useEffect } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import { 
  DocumentTextIcon,
  ChartBarIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UsersIcon,
  CubeIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { logSupabaseDB } from '@/lib/logger'

interface ReportType {
  id: string
  title: string
  description: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  category: string
}

interface ReportData {
  salesSummary?: {
    totalSales: number
    totalRevenue: number
    averageTicket: number
    topProducts: Array<{name: string, quantity: number, revenue: number}>
  }
  productsPerformance?: {
    totalProducts: number
    lowStockProducts: number
    topSellingProducts: Array<{name: string, quantity: number}>
    categoryDistribution: Array<{category: string, count: number}>
  }
  customersReport?: {
    totalCustomers: number
    activeCustomers: number
    topCustomers: Array<{name: string, totalPurchases: number}>
  }
  inventoryReport?: {
    totalProducts: number
    totalValue: number
    lowStockItems: Array<{name: string, stock: number, minStock: number}>
  }
  financialReport?: {
    totalRevenue: number
    totalCost: number
    profit: number
    profitMargin: number
  }
}

const reportTypes: ReportType[] = [
  {
    id: 'sales-summary',
    title: 'Resumo de Vendas',
    description: 'Relatório completo das vendas por período',
    icon: CurrencyDollarIcon,
    category: 'Vendas'
  },
  {
    id: 'products-performance',
    title: 'Performance de Produtos',
    description: 'Produtos mais vendidos e análise de performance',
    icon: CubeIcon,
    category: 'Produtos'
  },
  {
    id: 'customers-report',
    title: 'Relatório de Clientes',
    description: 'Análise de clientes e histórico de compras',
    icon: UsersIcon,
    category: 'Clientes'
  },
  {
    id: 'inventory-report',
    title: 'Relatório de Estoque',
    description: 'Status atual do estoque e movimentações',
    icon: ChartBarIcon,
    category: 'Estoque'
  },
  {
    id: 'financial-report',
    title: 'Relatório Financeiro',
    description: 'Análise financeira e fluxo de caixa',
    icon: DocumentTextIcon,
    category: 'Financeiro'
  }
]

interface CompanyData {
  razao_social: string
  nome_fantasia: string | null
  cnpj: string | null
  inscricao_estadual: string | null
  endereco: string
  telefone: string | null
  email_contato: string
}

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('30')
  const [selectedReport, setSelectedReport] = useState('')
  const [reportData, setReportData] = useState<ReportData>({})
  const [loading, setLoading] = useState(false)
  const [companyData, setCompanyData] = useState<CompanyData | null>(null)
  
  // Estados para filtros avançados
  const [filterType, setFilterType] = useState<'date' | 'period' | 'range'>('period')
  const [periodType, setPeriodType] = useState<'day' | 'month' | 'year'>('day')
  const [periodValue, setPeriodValue] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  const [tempFilters, setTempFilters] = useState({
    filterType: 'period' as 'date' | 'period' | 'range',
    selectedDate: '',
    periodType: 'day' as 'day' | 'month' | 'year',
    periodValue: '',
    startDate: '',
    endDate: '',
    categoryFilter: 'all',
    searchTerm: ''
  })

  // Carregar dados da empresa ao montar o componente
  useEffect(() => {
    loadCompanyData()
  }, [])

  const loadCompanyData = async () => {
    try {
      const { data, error } = await supabase
        .from('dados_empresa')
        .select('*')
        .single()
      
      if (error) {
        console.error('Erro ao carregar dados da empresa:', error)
        return
      }
      
      if (data) {
        setCompanyData(data)
      }
    } catch (error) {
      console.error('Erro ao carregar dados da empresa:', error)
    }
  }

  // Função para aplicar filtros
  const applyFilters = () => {
    setFilterType(tempFilters.filterType)
    setSelectedPeriod('30') // Reset para valor padrão
    setPeriodType(tempFilters.periodType)
    setPeriodValue(tempFilters.periodValue)
    setStartDate(tempFilters.startDate)
    setEndDate(tempFilters.endDate)
    setCategoryFilter(tempFilters.categoryFilter)
    setSearchTerm(tempFilters.searchTerm)
    
    toast.success('Filtros aplicados com sucesso!')
  }

  // Função para limpar filtros
  const clearFilters = () => {
    const clearedFilters = {
      filterType: 'period' as 'date' | 'period' | 'range',
      selectedDate: '',
      periodType: 'day' as 'day' | 'month' | 'year',
      periodValue: '',
      startDate: '',
      endDate: '',
      categoryFilter: 'all',
      searchTerm: ''
    }
    
    setTempFilters(clearedFilters)
    setFilterType(clearedFilters.filterType)
    setPeriodType(clearedFilters.periodType)
    setPeriodValue(clearedFilters.periodValue)
    setStartDate(clearedFilters.startDate)
    setEndDate(clearedFilters.endDate)
    setCategoryFilter(clearedFilters.categoryFilter)
    setSearchTerm(clearedFilters.searchTerm)
    setSelectedPeriod('30')
    
    toast.success('Filtros limpos!')
  }

  // Função para calcular data de início baseada no período ou filtros
  const getStartDate = (period?: string) => {
    // Se há filtros avançados aplicados, usar eles
    if (filterType === 'date' && tempFilters.selectedDate) {
      const date = new Date(tempFilters.selectedDate)
      return date.toISOString()
    } else if (filterType === 'period' && periodValue) {
      if (periodType === 'day') {
        const date = new Date(periodValue)
        return date.toISOString()
      } else if (periodType === 'month') {
        const [year, month] = periodValue.split('-')
        const date = new Date(parseInt(year), parseInt(month) - 1, 1)
        return date.toISOString()
      } else if (periodType === 'year') {
        const date = new Date(parseInt(periodValue), 0, 1)
        return date.toISOString()
      }
    } else if (filterType === 'range' && tempFilters.startDate) {
      const date = new Date(tempFilters.startDate)
      return date.toISOString()
    }
    
    // Fallback para período padrão
    const now = new Date()
    const days = parseInt(period || selectedPeriod)
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))
    return startDate.toISOString()
  }

  // Função para calcular data final (para intervalos)
  const getEndDate = () => {
    if (filterType === 'range' && endDate) {
      const date = new Date(endDate)
      date.setHours(23, 59, 59, 999) // Final do dia
      return date.toISOString()
    } else if (filterType === 'period' && periodValue) {
      if (periodType === 'month') {
        const [year, month] = periodValue.split('-')
        const date = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999) // Último dia do mês
        return date.toISOString()
      } else if (periodType === 'year') {
        const date = new Date(parseInt(periodValue), 11, 31, 23, 59, 59, 999) // 31 de dezembro
        return date.toISOString()
      }
    }
    
    return new Date().toISOString()
  }

  // Função para gerar relatório de vendas
  const generateSalesReport = async (period: string) => {
    try {
      const startDateStr = getStartDate(period)
      const endDateStr = getEndDate()
      
      // Buscar vendas do período com filtros aplicados
      let query = supabase
        .from('sales')
        .select('id, total_amount, created_at')
        .gte('created_at', startDateStr)

      // Aplicar filtro de data final se for intervalo
      if (filterType === 'range' && endDate) {
        query = query.lte('created_at', endDateStr)
      } else if (filterType === 'period' && (periodType === 'month' || periodType === 'year')) {
        query = query.lte('created_at', endDateStr)
      }

      const { data: sales, error: salesError } = await query

      if (salesError) throw salesError

      if (!sales || sales.length === 0) {
        return {
          totalSales: 0,
          totalRevenue: 0,
          averageTicket: 0,
          topProducts: []
        }
      }

      const totalSales = sales.length
      const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0)
      const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0

      // Buscar itens de venda das vendas encontradas
      const saleIds = sales.map(sale => sale.id)
      const { data: saleItems, error: saleItemsError } = await supabase
        .from('sale_items')
        .select('product_id, quantity, unit_price')
        .in('sale_id', saleIds)

      if (saleItemsError) {
        console.error('Erro ao buscar sale_items:', saleItemsError)
        // Continuar sem os produtos mais vendidos
        return {
          totalSales,
          totalRevenue,
          averageTicket,
          topProducts: []
        }
      }

      // Buscar informações dos produtos
      const productIds = [...new Set(saleItems?.map(item => item.product_id) || [])]
      let productsQuery = supabase
        .from('products')
        .select('id, name, category')
        .in('id', productIds)

      // Aplicar filtro de categoria se especificado
      if (categoryFilter !== 'all') {
        productsQuery = productsQuery.eq('category', categoryFilter)
      }

      // Aplicar filtro de busca se especificado
      if (searchTerm) {
        productsQuery = productsQuery.ilike('name', `%${searchTerm}%`)
      }

      const { data: products, error: productsError } = await productsQuery

      if (productsError) {
        console.error('Erro ao buscar products:', productsError)
        return {
          totalSales,
          totalRevenue,
          averageTicket,
          topProducts: []
        }
      }

      // Criar mapa de produtos para lookup
      const productsMap = new Map()
      products?.forEach(product => {
        productsMap.set(product.id, product)
      })

      // Calcular produtos mais vendidos
      const productSales: { [key: string]: { quantity: number, revenue: number } } = {}
      
      saleItems?.forEach(item => {
        const product = productsMap.get(item.product_id)
        if (!product) return // Pular se produto não passou nos filtros
        
        const productName = product.name || 'Produto não identificado'
        
        if (!productSales[productName]) {
          productSales[productName] = { quantity: 0, revenue: 0 }
        }
        productSales[productName].quantity += item.quantity
        productSales[productName].revenue += item.quantity * item.unit_price
      })

      const topProducts = Object.entries(productSales)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)

      return {
        totalSales,
        totalRevenue,
        averageTicket,
        topProducts
      }
    } catch (error) {
        logSupabaseDB.failed('generate_sales_report', error, {
          component: 'ReportsPage',
          metadata: {
            operation: 'generateSalesReport',
            error: error
          }
        });
        throw error
    }
  }

  // Função para gerar relatório de produtos
  const generateProductsReport = async () => {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)

      if (error) throw error

      const totalProducts = products?.length || 0
      const lowStockProducts = products?.filter(p => p.stock_quantity <= p.min_stock).length || 0
      
      // Buscar produtos mais vendidos (sem join)
      const { data: saleItems, error: saleItemsError } = await supabase
        .from('sale_items')
        .select('product_id, quantity')

      if (saleItemsError) {
        console.error('Erro ao buscar sale_items:', saleItemsError)
        return {
          totalProducts,
          lowStockProducts,
          topSellingProducts: [],
          categoryDistribution: []
        }
      }

      // Buscar informações dos produtos vendidos
      const soldProductIds = [...new Set(saleItems?.map(item => item.product_id) || [])]
      const { data: soldProducts, error: soldProductsError } = await supabase
        .from('products')
        .select('id, name, category')
        .in('id', soldProductIds)

      if (soldProductsError) {
        console.error('Erro ao buscar produtos vendidos:', soldProductsError)
        return {
          totalProducts,
          lowStockProducts,
          topSellingProducts: [],
          categoryDistribution: []
        }
      }

      // Criar mapa de produtos
      const productsMap = new Map()
      soldProducts?.forEach(product => {
        productsMap.set(product.id, product)
      })

      const productSales: { [key: string]: number } = {}
      const categoryCount: { [key: string]: number } = {}

      saleItems?.forEach((item: any) => {
        const product = productsMap.get(item.product_id)
        const productName = product?.name || 'Produto não identificado'
        const category = product?.category || 'Sem categoria'
        
        productSales[productName] = (productSales[productName] || 0) + item.quantity
        categoryCount[category] = (categoryCount[category] || 0) + 1
      })

      const topSellingProducts = Object.entries(productSales)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)

      const categoryDistribution = Object.entries(categoryCount)
        .map(([category, count]) => ({ category, count }))

      return {
        totalProducts,
        lowStockProducts,
        topSellingProducts,
        categoryDistribution
      }
    } catch (error) {
        logSupabaseDB.failed('generate_products_report', error, {
          component: 'ReportsPage',
          metadata: {
            operation: 'generateProductsReport',
            error: error
          }
        });
        throw error
    }
  }

  // Função para gerar relatório de clientes
  const generateCustomersReport = async (period: string) => {
    try {
      const startDate = getStartDate(period)
      
      // Buscar todos os clientes ativos
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('active', true)

      if (customersError) throw customersError

      // Buscar vendas do período sem join direto
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('customer_id, total_amount')
        .gte('created_at', startDate)
        .not('customer_id', 'is', null)

      if (salesError) throw salesError

      const totalCustomers = customers?.length || 0
      const activeCustomers = new Set(sales?.map(s => s.customer_id)).size

      // Criar mapa de clientes para lookup eficiente
      const customersMap = new Map()
      customers?.forEach(customer => {
        customersMap.set(customer.id, customer)
      })

      const customerPurchases: { [key: string]: { name: string, totalPurchases: number } } = {}
      
      // Combinar dados manualmente
      sales?.forEach((sale: any) => {
        if (sale.customer_id) {
          const customer = customersMap.get(sale.customer_id)
          if (customer) {
            if (!customerPurchases[sale.customer_id]) {
              customerPurchases[sale.customer_id] = {
                name: customer.name,
                totalPurchases: 0
              }
            }
            customerPurchases[sale.customer_id].totalPurchases += sale.total_amount
          }
        }
      })

      const topCustomers = Object.values(customerPurchases)
        .sort((a, b) => b.totalPurchases - a.totalPurchases)
        .slice(0, 5)

      return {
        totalCustomers,
        activeCustomers,
        topCustomers
      }
    } catch (error) {
        logSupabaseDB.failed('generate_customers_report', error, {
          component: 'ReportsPage',
          metadata: {
            operation: 'generateCustomersReport',
            error: error
          }
        });
        throw error
    }
  }

  // Função para gerar relatório de estoque
  const generateInventoryReport = async () => {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)

      if (error) throw error

      const totalProducts = products?.length || 0
      const totalValue = products?.reduce((sum, p) => sum + (p.sale_price * p.stock_quantity), 0) || 0
      const lowStockItems = products?.filter(p => p.stock_quantity <= p.min_stock)
        .map(p => ({
          name: p.name,
          stock: p.stock_quantity,
          minStock: p.min_stock
        })) || []

      return {
        totalProducts,
        totalValue,
        lowStockItems
      }
    } catch (error) {
        logSupabaseDB.failed('generate_inventory_report', error, {
          component: 'ReportsPage',
          metadata: {
            operation: 'generateInventoryReport',
            error: error
          }
        });
        throw error
    }
  }

  // Função para gerar relatório financeiro
  const generateFinancialReport = async (period: string) => {
    try {
      const startDate = getStartDate(period)
      
      // Buscar vendas do período
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('id, total_amount')
        .gte('created_at', startDate)

      if (salesError) throw salesError

      // Buscar itens de venda separadamente
      const salesIds = sales?.map(sale => sale.id) || []
      
      let saleItems: { sale_id: number; product_id: number; quantity: number; unit_price: number }[] = []
      if (salesIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from('sale_items')
          .select('sale_id, product_id, quantity, unit_price')
          .in('sale_id', salesIds)

        if (itemsError) throw itemsError
        saleItems = items || []
      }

      // Buscar produtos para obter preço de custo
      const productIds = [...new Set(saleItems.map(item => item.product_id))]
      
      let products: { id: number; cost_price: number }[] = []
      if (productIds.length > 0) {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, cost_price')
          .in('id', productIds)

        if (productsError) throw productsError
        products = productsData || []
      }

      // Criar mapa de produtos para lookup eficiente
      const productsMap = new Map()
      products.forEach(product => {
        productsMap.set(product.id, product)
      })

      const totalRevenue = sales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0
      
      let totalCost = 0
      saleItems.forEach((item: any) => {
        const product = productsMap.get(item.product_id)
        const costPrice = product?.cost_price || 0
        totalCost += item.quantity * costPrice
      })

      const profit = totalRevenue - totalCost
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0

      return {
        totalRevenue,
        totalCost,
        profit,
        profitMargin
      }
    } catch (error) {
        logSupabaseDB.failed('generate_financial_report', error, {
          component: 'ReportsPage',
          metadata: {
            operation: 'generateFinancialReport',
            error: error
          }
        });
        throw error
    }
  }

  const handleGenerateReport = async (reportId: string) => {
    setLoading(true)
    setSelectedReport(reportId)
    
    try {
      let data
      
      switch (reportId) {
        case 'sales-summary':
          data = { salesSummary: await generateSalesReport(selectedPeriod) }
          break
        case 'products-performance':
          data = { productsPerformance: await generateProductsReport() }
          break
        case 'customers-report':
          data = { customersReport: await generateCustomersReport(selectedPeriod) }
          break
        case 'inventory-report':
          data = { inventoryReport: await generateInventoryReport() }
          break
        case 'financial-report':
          data = { financialReport: await generateFinancialReport(selectedPeriod) }
          break
        default:
          throw new Error('Tipo de relatório não reconhecido')
      }
      
      setReportData(data)
      toast.success('Relatório gerado com sucesso!')
    } catch (error) {
      logSupabaseDB.failed('generate_report', 'sales', error, {
        component: 'ReportsPage',
        metadata: {
          operation: 'generateReport',
          reportType: reportId,
          error: error
        }
      });
      toast.error('Erro ao gerar relatório. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Função para formatar dados para exportação
  const formatReportData = (reportId: string) => {
    // Verificar se há dados do relatório disponíveis
    if (!reportData || Object.keys(reportData).length === 0) {
      return {
        title: 'Relatório',
        generatedAt: new Date().toLocaleString('pt-BR'),
        period: getFilterDescription(),
        data: {}
      }
    }

    const reportTitle = reportTypes.find(r => r.id === reportId)?.title || 'Relatório'
    
    let formattedData: any = {
      title: reportTitle,
      generatedAt: new Date().toLocaleString('pt-BR'),
      period: getFilterDescription(),
      data: {}
    }

    switch (reportId) {
      case 'sales-summary':
        if (reportData.salesSummary) {
          formattedData.data = {
            resumo: {
              'Total de Vendas': reportData.salesSummary.totalSales,
              'Receita Total': `R$ ${reportData.salesSummary.totalRevenue?.toFixed(2) || '0,00'}`,
              'Ticket Médio': `R$ ${reportData.salesSummary.averageTicket?.toFixed(2) || '0,00'}`
            },
            topProdutos: reportData.salesSummary.topProducts?.map((p, i) => ({
              'Posição': i + 1,
              'Produto': p.name,
              'Quantidade': p.quantity,
              'Receita': `R$ ${p.revenue.toFixed(2)}`
            })) || []
          }
        }
        break
      
      case 'products-performance':
        if (reportData.productsPerformance) {
          formattedData.data = {
            resumo: {
              'Total de Produtos': reportData.productsPerformance.totalProducts,
              'Produtos com Estoque Baixo': reportData.productsPerformance.lowStockProducts || 0
            },
            produtosMaisVendidos: reportData.productsPerformance.topSellingProducts?.map((p, i) => ({
              'Posição': i + 1,
              'Produto': p.name,
              'Quantidade Vendida': p.quantity
            })) || [],
            distribuicaoCategorias: reportData.productsPerformance.categoryDistribution?.map((c) => ({
              'Categoria': c.category,
              'Quantidade': c.count
            })) || []
          }
        }
        break
      
      case 'customers-report':
        if (reportData.customersReport) {
          formattedData.data = {
            resumo: {
              'Total de Clientes': reportData.customersReport.totalCustomers,
              'Clientes Ativos': reportData.customersReport.activeCustomers
            },
            topClientes: reportData.customersReport.topCustomers?.map((c, i) => ({
              'Posição': i + 1,
              'Cliente': c.name,
              'Total de Compras': c.totalPurchases
            })) || []
          }
        }
        break
      
      case 'inventory-report':
        if (reportData.inventoryReport) {
          formattedData.data = {
            resumo: {
              'Total de Produtos': reportData.inventoryReport.totalProducts,
              'Valor Total do Estoque': `R$ ${reportData.inventoryReport.totalValue?.toFixed(2) || '0,00'}`
            },
            estoqueBaixo: reportData.inventoryReport.lowStockItems?.map(item => ({
              'Produto': item.name,
              'Estoque Atual': item.stock,
              'Estoque Mínimo': item.minStock,
              'Status': item.stock <= item.minStock ? 'CRÍTICO' : 'BAIXO'
            })) || []
          }
        }
        break
      
      case 'financial-report':
        if (reportData.financialReport) {
          formattedData.data = {
            resumo: {
              'Receita Total': `R$ ${reportData.financialReport.totalRevenue?.toFixed(2) || '0,00'}`,
              'Custo Total': `R$ ${reportData.financialReport.totalCost?.toFixed(2) || '0,00'}`,
              'Lucro': `R$ ${reportData.financialReport.profit?.toFixed(2) || '0,00'}`,
              'Margem de Lucro': `${reportData.financialReport.profitMargin?.toFixed(2) || '0,00'}%`
            }
          }
        }
        break
    }

    return formattedData
  }

  // Função para obter descrição do filtro aplicado
  const getFilterDescription = () => {
    if (filterType === 'date' && tempFilters.selectedDate) {
      return `Data: ${new Date(tempFilters.selectedDate).toLocaleDateString('pt-BR')}`
    } else if (filterType === 'period' && periodValue) {
      if (periodType === 'day') {
        return `Dia: ${new Date(periodValue).toLocaleDateString('pt-BR')}`
      } else if (periodType === 'month') {
        const [year, month] = periodValue.split('-')
        return `Mês: ${month}/${year}`
      } else if (periodType === 'year') {
        return `Ano: ${periodValue}`
      }
    } else if (filterType === 'range' && startDate && endDate) {
      return `Período: ${new Date(startDate).toLocaleDateString('pt-BR')} até ${new Date(endDate).toLocaleDateString('pt-BR')}`
    }
    return `Últimos ${selectedPeriod} dias`
  }

  // Função principal para download de relatórios
  const handleDownloadReport = (reportId: string, format: string) => {
    try {
      const formattedData = formatReportData(reportId)
      
      if (!formattedData.data || Object.keys(formattedData.data).length === 0) {
        toast.error('Nenhum dado disponível para exportação. Gere o relatório primeiro.')
        return
      }

      switch (format) {
        case 'pdf':
          generatePDF(formattedData)
          break
        case 'excel':
          generateExcel(formattedData)
          break
        case 'print':
          printReport(formattedData)
          break
        default:
          toast.error('Formato não suportado')
      }
    } catch (error) {
      console.error('Erro ao exportar relatório:', error)
      toast.error('Erro ao exportar relatório')
    }
  }

  // Função para gerar PDF
  const generatePDF = (data: any) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Não foi possível abrir a janela de impressão')
      return
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${data.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .company-header { background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); color: white; padding: 20px; margin: -20px -20px 30px -20px; border-radius: 0; }
          .company-name { font-size: 22px; font-weight: bold; margin-bottom: 8px; }
          .company-info { font-size: 12px; opacity: 0.95; line-height: 1.6; }
          .company-info-row { margin: 3px 0; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0d9488; padding-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #0d9488; margin-bottom: 10px; }
          .info { font-size: 14px; color: #666; }
          .section { margin: 20px 0; }
          .section-title { font-size: 18px; font-weight: bold; color: #0d9488; margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
          .summary { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .summary-item { display: flex; justify-content: space-between; margin: 8px 0; }
          .summary-label { font-weight: bold; }
          .table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .table th, .table td { border: 1px solid #d1d5db; padding: 12px; text-align: left; }
          .table th { background: #0d9488; color: white; font-weight: bold; }
          .table tr:nth-child(even) { background: #f9fafb; }
          .no-data { text-align: center; color: #6b7280; font-style: italic; padding: 20px; }
          @media print {
            body { margin: 0; }
            .header { page-break-after: avoid; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        ${companyData ? `
        <div class="company-header">
          <div class="company-name">${companyData.nome_fantasia || companyData.razao_social}</div>
          <div class="company-info">
            <div class="company-info-row"><strong>Razão Social:</strong> ${companyData.razao_social}</div>
            ${companyData.cnpj ? `<div class="company-info-row"><strong>CNPJ:</strong> ${companyData.cnpj}</div>` : ''}
            ${companyData.inscricao_estadual ? `<div class="company-info-row"><strong>Inscrição Estadual:</strong> ${companyData.inscricao_estadual}</div>` : ''}
            <div class="company-info-row"><strong>Endereço:</strong> ${companyData.endereco}</div>
            ${companyData.telefone ? `<div class="company-info-row"><strong>Telefone:</strong> ${companyData.telefone}</div>` : ''}
            <div class="company-info-row"><strong>Email:</strong> ${companyData.email_contato}</div>
          </div>
        </div>
        ` : ''}
        <div class="header">
          <div class="title">${data.title}</div>
          <div class="info">Gerado em: ${data.generatedAt}</div>
          <div class="info">Período: ${data.period}</div>
        </div>
        
        ${Object.entries(data.data).map(([sectionKey, sectionData]: [string, any]) => {
          if (sectionKey === 'resumo') {
            return `
              <div class="section">
                <div class="section-title">Resumo</div>
                <div class="summary">
                  ${Object.entries(sectionData).map(([key, value]) => 
                    `<div class="summary-item">
                      <span class="summary-label">${key}:</span>
                      <span>${value}</span>
                    </div>`
                  ).join('')}
                </div>
              </div>
            `
          } else if (Array.isArray(sectionData) && sectionData.length > 0) {
            const headers = Object.keys(sectionData[0])
            return `
              <div class="section">
                <div class="section-title">${sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1).replace(/([A-Z])/g, ' $1')}</div>
                <table class="table">
                  <thead>
                    <tr>
                      ${headers.map(header => `<th>${header}</th>`).join('')}
                    </tr>
                  </thead>
                  <tbody>
                    ${sectionData.map(row => 
                      `<tr>
                        ${headers.map(header => `<td>${row[header] || '-'}</td>`).join('')}
                      </tr>`
                    ).join('')}
                  </tbody>
                </table>
              </div>
            `
          }
          return ''
        }).join('')}
      </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
    
    setTimeout(() => {
      printWindow.print()
      toast.success('PDF gerado com sucesso!')
    }, 500)
  }

  // Função para gerar Excel
  const generateExcel = (data: any) => {
    let csvContent = ''
    
    // Adicionar dados da empresa no cabeçalho
    if (companyData) {
      csvContent += `${companyData.nome_fantasia || companyData.razao_social}\n`
      csvContent += `Razão Social: ${companyData.razao_social}\n`
      if (companyData.cnpj) csvContent += `CNPJ: ${companyData.cnpj}\n`
      if (companyData.inscricao_estadual) csvContent += `Inscrição Estadual: ${companyData.inscricao_estadual}\n`
      csvContent += `Endereço: ${companyData.endereco}\n`
      if (companyData.telefone) csvContent += `Telefone: ${companyData.telefone}\n`
      csvContent += `Email: ${companyData.email_contato}\n`
      csvContent += `\n${'='.repeat(80)}\n\n`
    }
    
    csvContent += `${data.title}\n`
    csvContent += `Gerado em: ${data.generatedAt}\n`
    csvContent += `Período: ${data.period}\n\n`

    Object.entries(data.data).forEach(([sectionKey, sectionData]: [string, any]) => {
      csvContent += `${sectionKey.toUpperCase()}\n`
      
      if (sectionKey === 'resumo') {
        Object.entries(sectionData).forEach(([key, value]) => {
          csvContent += `${key};${value}\n`
        })
      } else if (Array.isArray(sectionData) && sectionData.length > 0) {
        const headers = Object.keys(sectionData[0])
        csvContent += `${headers.join(';')}\n`
        sectionData.forEach(row => {
          csvContent += `${headers.map(header => row[header] || '').join(';')}\n`
        })
      }
      csvContent += '\n'
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${data.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success('Arquivo Excel gerado com sucesso!')
  }

  // Função para impressão
  const printReport = (data: any) => {
    generatePDF(data) // Reutiliza a função PDF para impressão
  }

  return (
    <MainLayout>
      <div className="bg-gray-50 -m-4 sm:-m-6 min-h-[calc(100vh-120px)]">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-black mb-2">
              Relatórios
            </h1>
            <p className="text-black">
              Visualize e analise dados do seu negócio
            </p>
          </div>



          {/* Filtros Avançados */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-black mb-4">
              Filtros Avançados
            </h2>
            
            <div className="space-y-4">
              {/* Tipo de Filtro */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Filtro
                </label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="filterType"
                      value="date"
                      checked={tempFilters.filterType === 'date'}
                      onChange={(e) => setTempFilters({...tempFilters, filterType: e.target.value as 'date' | 'period' | 'range'})}
                      className="mr-2 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-black">Data Específica</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="filterType"
                      value="period"
                      checked={tempFilters.filterType === 'period'}
                      onChange={(e) => setTempFilters({...tempFilters, filterType: e.target.value as 'date' | 'period' | 'range'})}
                      className="mr-2 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-black">Período</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="filterType"
                      value="range"
                      checked={tempFilters.filterType === 'range'}
                      onChange={(e) => setTempFilters({...tempFilters, filterType: e.target.value as 'date' | 'period' | 'range'})}
                      className="mr-2 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-black">Intervalo de Datas</span>
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
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-black"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-black"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-black"
                        />
                      )}
                      {tempFilters.periodType === 'month' && (
                        <input
                          type="month"
                          value={tempFilters.periodValue}
                          onChange={(e) => setTempFilters({...tempFilters, periodValue: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-black"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-black placeholder-gray-400"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-black"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-black"
                      />
                    </div>
                  </>
                )}

                {/* Categoria */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <select
                    value={tempFilters.categoryFilter}
                    onChange={(e) => setTempFilters({...tempFilters, categoryFilter: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-black"
                  >
                    <option value="all">Todas as Categorias</option>
                    <option value="Vendas">Vendas</option>
                    <option value="Produtos">Produtos</option>
                    <option value="Clientes">Clientes</option>
                    <option value="Estoque">Estoque</option>
                    <option value="Financeiro">Financeiro</option>
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
                      placeholder="Nome do produto..."
                      value={tempFilters.searchTerm}
                      onChange={(e) => setTempFilters({...tempFilters, searchTerm: e.target.value})}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-black placeholder-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                <button
                  onClick={applyFilters}
                  className="flex-1 sm:flex-none px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors font-medium"
                >
                  🔍 Aplicar Filtros
                </button>
                <button
                  onClick={clearFilters}
                  className="flex-1 sm:flex-none px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors font-medium"
                >
                  🗑️ Limpar Filtros
                </button>
              </div>
            </div>
          </div>

          {/* Grid de Relatórios */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reportTypes.map((report) => {
              const Icon = report.icon
              
              return (
                <div key={report.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-teal-100 rounded-lg">
                        <Icon className="h-6 w-6 text-teal-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-black">{report.title}</h3>
                        <span className="text-xs text-teal-600 bg-teal-50 px-2 py-1 rounded-full">
                          {report.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-black mb-6">
                  {report.description}
                </p>
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => handleGenerateReport(report.id)}
                      disabled={loading}
                      className="w-full flex items-center justify-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChartBarIcon className="h-4 w-4" />
                      <span>{loading && selectedReport === report.id ? 'Gerando...' : 'Gerar Relatório'}</span>
                    </button>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDownloadReport(report.id, 'pdf')}
                        className="flex-1 flex items-center justify-center space-x-1 text-gray-600 bg-gray-100 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        <span>PDF</span>
                      </button>
                      <button
                        onClick={() => handleDownloadReport(report.id, 'excel')}
                        className="flex-1 flex items-center justify-center space-x-1 text-gray-600 bg-gray-100 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        <span>Excel</span>
                      </button>
                      <button
                        onClick={() => handleDownloadReport(report.id, 'print')}
                        className="flex-1 flex items-center justify-center space-x-1 text-gray-600 bg-gray-100 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      >
                        <PrinterIcon className="h-4 w-4" />
                        <span>Imprimir</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Exibição dos dados do relatório */}
          {selectedReport && reportData && Object.keys(reportData).length > 0 && (
            <div className="mt-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-black mb-6">
                  Dados do Relatório
                </h2>
                
                {/* Relatório de Vendas */}
                {reportData.salesSummary && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-black">Resumo de Vendas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Total de Vendas</p>
                        <p className="text-2xl font-bold text-black">{reportData.salesSummary.totalSales}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Receita Total</p>
<p className="text-2xl font-bold text-black">R$ {(reportData.salesSummary.totalRevenue || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Ticket Médio</p>
<p className="text-2xl font-bold text-black">R$ {(reportData.salesSummary.averageTicket || 0).toFixed(2)}</p>
                      </div>
                    </div>
                    
                    {reportData.salesSummary.topProducts.length > 0 && (
                      <div>
                        <h4 className="text-md font-medium text-black mb-3">Produtos Mais Vendidos</h4>
                        <div className="space-y-2">
                          {reportData.salesSummary.topProducts.map((product, index) => (
                            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <span className="text-black">{product.name}</span>
                              <div className="text-right">
                                <span className="text-black font-medium">{product.quantity} un.</span>
                                <span className="text-gray-600 text-sm ml-2">R$ {(product.revenue || 0).toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Relatório de Produtos */}
                {reportData.productsPerformance && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-black">Performance de Produtos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Total de Produtos</p>
                        <p className="text-2xl font-bold text-black">{reportData.productsPerformance.totalProducts}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Produtos com Estoque Baixo</p>
                        <p className="text-2xl font-bold text-red-600">{reportData.productsPerformance.lowStockProducts}</p>
                      </div>
                    </div>
                    
                    {reportData.productsPerformance.topSellingProducts.length > 0 && (
                      <div>
                        <h4 className="text-md font-medium text-black mb-3">Produtos Mais Vendidos</h4>
                        <div className="space-y-2">
                          {reportData.productsPerformance.topSellingProducts.map((product, index) => (
                            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <span className="text-black">{product.name}</span>
                              <span className="text-black font-medium">{product.quantity} un.</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Relatório de Clientes */}
                {reportData.customersReport && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-black">Relatório de Clientes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Total de Clientes</p>
                        <p className="text-2xl font-bold text-black">{reportData.customersReport.totalCustomers}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Clientes Ativos</p>
                        <p className="text-2xl font-bold text-green-600">{reportData.customersReport.activeCustomers}</p>
                      </div>
                    </div>
                    
                    {reportData.customersReport.topCustomers.length > 0 && (
                      <div>
                        <h4 className="text-md font-medium text-black mb-3">Melhores Clientes</h4>
                        <div className="space-y-2">
                          {reportData.customersReport.topCustomers.map((customer, index) => (
                            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <span className="text-black">{customer.name}</span>
                              <span className="text-black font-medium">R$ {(customer.totalPurchases || 0).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Relatório de Estoque */}
                {reportData.inventoryReport && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-black">Relatório de Estoque</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Total de Produtos</p>
                        <p className="text-2xl font-bold text-black">{reportData.inventoryReport.totalProducts}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Valor Total do Estoque</p>
<p className="text-2xl font-bold text-black">R$ {(reportData.inventoryReport.totalValue || 0).toFixed(2)}</p>
                      </div>
                    </div>
                    
                    {reportData.inventoryReport.lowStockItems.length > 0 && (
                      <div>
                        <h4 className="text-md font-medium text-black mb-3">Produtos com Estoque Baixo</h4>
                        <div className="space-y-2">
                          {reportData.inventoryReport.lowStockItems.map((item, index) => (
                            <div key={index} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                              <span className="text-black">{item.name}</span>
                              <div className="text-right">
                                <span className="text-red-600 font-medium">{item.stock} un.</span>
                                <span className="text-gray-600 text-sm ml-2">(mín: {item.minStock})</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Relatório Financeiro */}
                {reportData.financialReport && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-black">Relatório Financeiro</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Receita Total</p>
                        <p className="text-2xl font-bold text-green-600">R$ {(reportData.financialReport.totalRevenue || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Custo Total</p>
                        <p className="text-2xl font-bold text-red-600">R$ {(reportData.financialReport.totalCost || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Lucro</p>
                        <p className="text-2xl font-bold text-black">R$ {(reportData.financialReport.profit || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Margem de Lucro</p>
                        <p className="text-2xl font-bold text-black">{(reportData.financialReport.profitMargin || 0).toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Relatórios Recentes */}
          <div className="mt-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-black mb-4">
                Relatórios Recentes
              </h2>
              
              <div className="space-y-3">
                {[
                  { name: 'Vendas - Janeiro 2024', date: '15/01/2024', type: 'PDF', size: '2.3 MB' },
                  { name: 'Estoque - Dezembro 2023', date: '31/12/2023', type: 'Excel', size: '1.8 MB' },
                  { name: 'Clientes - Dezembro 2023', date: '30/12/2023', type: 'PDF', size: '1.2 MB' }
                ].map((report, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-black">{report.name}</p>
                  <p className="text-sm text-black">{report.date} • {report.type} • {report.size}</p>
                      </div>
                    </div>
                    <button className="text-black hover:text-gray-700 text-sm font-medium">
                      Baixar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

