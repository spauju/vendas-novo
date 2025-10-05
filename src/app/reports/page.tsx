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
  PrinterIcon
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

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('30')
  const [selectedReport, setSelectedReport] = useState('')
  const [reportData, setReportData] = useState<ReportData>({})
  const [loading, setLoading] = useState(false)

  // Função para calcular data de início baseada no período
  const getStartDate = (period: string) => {
    const now = new Date()
    const days = parseInt(period)
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))
    return startDate.toISOString()
  }

  // Função para gerar relatório de vendas
  const generateSalesReport = async (period: string) => {
    try {
      const startDate = getStartDate(period)
      
      // Buscar vendas do período (sem join)
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('id, total_amount, created_at')
        .gte('created_at', startDate)

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
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, category')
        .in('id', productIds)

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
        const productName = product?.name || 'Produto não identificado'
        
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

  const handleDownloadReport = (reportId: string, format: string) => {
    // Implementação futura para download de relatórios
    toast(`Download de ${format.toUpperCase()} será implementado em breve`)
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

          {/* Filtros */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
                <label className="text-sm font-medium text-black" style={{fontFamily: 'Arial, sans-serif'}}>
                  Período:
                </label>
              </div>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                style={{color: 'black', fontFamily: 'Arial, sans-serif'}}
              >
                <option value="7">Últimos 7 dias</option>
                <option value="30">Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
                <option value="365">Último ano</option>
                <option value="custom">Período personalizado</option>
              </select>
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

