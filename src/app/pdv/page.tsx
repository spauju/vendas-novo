'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import MainLayout from '@/components/layout/MainLayout'
import ProductCodeInput from '@/components/pdv/ProductCodeInput'
import AbrirCaixaModal from '@/components/pdv/AbrirCaixaModal'
import PaymentMethods from '@/components/pdv/PaymentMethods'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface Product {
  id: string
  name: string
  sale_price: number
  barcode: string | null
  stock_quantity: number
}

interface Customer {
  id: string
  name: string
  cpf_cnpj: string | null
}

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  barcode: string
}

export default function PDVPage() {
  const { user } = useAuth()
  
  // Estados principais
  const [barcode, setBarcode] = useState('')
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [showPayment, setShowPayment] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Estados de dados
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  
  // Estados do cliente
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null)
  const [customerCpf, setCustomerCpf] = useState('')
  const [customerName, setCustomerName] = useState('')
  
  // Estados do caixa
  const [caixaAberto, setCaixaAberto] = useState(false)
  const [valorTrocoInicial, setValorTrocoInicial] = useState(0)
  const [isAbrirCaixaModalOpen, setIsAbrirCaixaModalOpen] = useState(false)
  
  // Estados do produto atual
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null)
  const [currentQuantity, setCurrentQuantity] = useState(1)
  const [currentPrice, setCurrentPrice] = useState('')

  // Carregar estado do caixa do localStorage
  useEffect(() => {
    const savedCaixaState = localStorage.getItem('caixaAberto')
    const savedTrocoInicial = localStorage.getItem('valorTrocoInicial')
    
    if (savedCaixaState === 'true') {
      setCaixaAberto(true)
      setValorTrocoInicial(parseFloat(savedTrocoInicial || '0'))
    }
  }, [])

  // Carregar dados iniciais
  useEffect(() => {
    loadProducts()
    loadCustomers()
  }, [])

  // Buscar cliente automaticamente quando CPF for digitado
  useEffect(() => {
    if (customerCpf.length >= 14) {
      const customer = customers.find(c => 
        c.cpf_cnpj && c.cpf_cnpj.replace(/\D/g, '') === customerCpf.replace(/\D/g, '')
      )
      if (customer) {
        setCustomerName(customer.name)
        setSelectedCustomer(customer.id)
        toast.success(`Cliente encontrado: ${customer.name}`)
      } else {
        setCustomerName('')
        setSelectedCustomer(null)
        if (customerCpf.length === 14) {
          toast.error('Cliente não encontrado')
        }
      }
    } else if (customerCpf.length === 0) {
      setCustomerName('')
      setSelectedCustomer(null)
    }
  }, [customerCpf, customers])

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sale_price, barcode, stock_quantity')
        .eq('active', true)
        .order('name')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
      toast.error('Erro ao carregar produtos')
    }
  }

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, cpf_cnpj')
        .order('name')

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
      toast.error('Erro ao carregar clientes')
    }
  }

  const handleEnter = () => {
    if (!barcode) return

    // Primeiro, tentar buscar por código de barras exato
    let product = products.find(p => p.barcode === barcode)
    
    // Se não encontrou por código de barras, buscar por nome (busca parcial, case-insensitive)
    if (!product) {
      const searchTerm = barcode.toLowerCase().trim()
      const matchingProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm)
      )
      
      if (matchingProducts.length === 1) {
        // Se encontrou exatamente um produto, selecionar automaticamente
        product = matchingProducts[0]
      } else if (matchingProducts.length > 1) {
        // Se encontrou múltiplos produtos, mostrar os primeiros 3 como sugestão
        const suggestions = matchingProducts.slice(0, 3).map(p => p.name).join(', ')
        toast.error(`Múltiplos produtos encontrados: ${suggestions}. Digite mais caracteres para refinar a busca.`)
        return
      }
    }

    if (product) {
      if (product.stock_quantity <= 0) {
        toast.error('Produto sem estoque')
        return
      }
      
      setCurrentProduct(product)
      setCurrentQuantity(1)
      setCurrentPrice((product.sale_price || 0).toFixed(2).replace('.', ','))
      toast.success(`Produto encontrado: ${product.name}`)
    } else {
      toast.error('Produto não encontrado')
      setCurrentProduct(null)
      setCurrentQuantity(1)
      setCurrentPrice('')
    }
  }

  const handleAddToCart = () => {
    if (!currentProduct) {
      toast.error('Nenhum produto selecionado')
      return
    }

    if (currentQuantity <= 0) {
      toast.error('Quantidade deve ser maior que zero')
      return
    }

    const price = parseFloat(currentPrice.replace(',', '.'))
    if (isNaN(price) || price <= 0) {
      toast.error('Preço inválido')
      return
    }

    const existingItem = cartItems.find(item => item.id === currentProduct.id)
    const totalQuantity = existingItem ? existingItem.quantity + currentQuantity : currentQuantity

    if (totalQuantity > currentProduct.stock_quantity) {
      toast.error('Estoque insuficiente')
      return
    }

    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.id === currentProduct.id
          ? { ...item, quantity: totalQuantity, price: price }
          : item
      ))
    } else {
      setCartItems([...cartItems, {
        id: currentProduct.id,
        name: currentProduct.name,
        price: price,
        quantity: currentQuantity,
        barcode: currentProduct.barcode || ''
      }])
    }

    toast.success(`${currentProduct.name} adicionado ao carrinho`)
    
    // Limpar campos
    setBarcode('')
    setCurrentProduct(null)
    setCurrentQuantity(1)
    setCurrentPrice('')
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems(cartItems.filter(item => item.id !== id))
    } else {
      setCartItems(cartItems.map(item =>
        item.id === id ? { ...item, quantity } : item
      ))
    }
  }

  const getSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  const getTotal = () => {
    return getSubtotal()
  }

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11)
    
    if (numbers.length <= 3) {
      return numbers
    } else if (numbers.length <= 6) {
      return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
    } else if (numbers.length <= 9) {
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
    } else {
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`
    }
  }

  const handleCpfChange = (value: string) => {
    setCustomerCpf(formatCPF(value))
  }

  const handleFinalizeSale = () => {
    if (cartItems.length === 0) {
      toast.error('Adicione produtos ao carrinho')
      return
    }
    setShowPayment(true)
  }

  const handlePaymentComplete = async (paymentData: any) => {
    if (!user) {
      toast.error('Usuário não autenticado')
      return
    }

    setLoading(true)
    
    try {
      // Preparar dados da venda
      const saleData = {
        customer_id: selectedCustomer,
        user_id: user.id,
        total_amount: getSubtotal(),
        discount_amount: 0,
        final_amount: getTotal(),
        status: 'completed',
        payment_method: paymentData.method,
        payment_status: 'paid'
      }

      // Preparar itens da venda
      const saleItems = cartItems.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price
      }))

      // Usar função controlada para processar venda com estoque
      const { data: result, error: processError } = await supabase.rpc('process_sale_with_stock_control', {
        p_sale_data: saleData,
        p_items: saleItems
      })

      if (processError) throw processError

      if (result && result.success) {
        toast.success('Venda finalizada com sucesso!')
        
        // Verificar se houve problemas com estoque
        const stockResults = result.stock_results || []
        const stockErrors = stockResults.filter((r: any) => !r.success)
        
        if (stockErrors.length > 0) {
          console.warn('Problemas com estoque:', stockErrors)
          toast.error('Venda processada, mas houve problemas com o estoque')
        }
        
        // Limpar dados
        setCartItems([])
        setShowPayment(false)
        setCustomerCpf('')
        setCustomerName('')
        setSelectedCustomer(null)
        
        // Recarregar produtos para atualizar estoque
        await loadProducts()
      } else {
        throw new Error(result?.error || 'Erro ao processar venda')
      }
      
    } catch (error) {
      console.error('Erro ao finalizar venda:', error)
      toast.error('Erro ao finalizar venda')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmAbrirCaixa = (initialValue: number) => {
    if (initialValue < 0) {
      toast.error('O valor inicial não pode ser negativo')
      return
    }
    
    setValorTrocoInicial(initialValue)
    setCaixaAberto(true)
    setIsAbrirCaixaModalOpen(false)
    
    localStorage.setItem('caixaAberto', 'true')
    localStorage.setItem('valorTrocoInicial', initialValue.toString())
    
    toast.success(`Caixa aberto com troco inicial de R$ ${initialValue.toFixed(2).replace('.', ',')}`)
  }

  const handleFecharCaixa = () => {
    if (cartItems.length > 0) {
      toast.error('Finalize ou cancele a venda atual antes de fechar o caixa')
      return
    }
    
    setCaixaAberto(false)
    setValorTrocoInicial(0)
    
    localStorage.removeItem('caixaAberto')
    localStorage.removeItem('valorTrocoInicial')
    
    toast.success('Caixa fechado com sucesso')
  }

  return (
    <MainLayout>
      <div className="bg-gray-100 -m-4 sm:-m-6 min-h-[calc(100vh-120px)] relative">
        {/* Cabeçalho */}
        <div className="bg-emerald-600 text-white">
          <div className="px-4 sm:px-6 py-4">
            <h1 className="text-lg sm:text-2xl font-bold tracking-wide">CAIXA LIVRE - VENDA</h1>
          </div>
        </div>

        {/* Layout principal */}
        <div className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Status do Caixa */}
            {caixaAberto && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <div>
                      <h3 className="text-lg font-semibold text-emerald-800">Caixa Aberto</h3>
                      <p className="text-sm text-emerald-600">
                        Troco inicial: R$ {valorTrocoInicial.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleFecharCaixa}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Fechar Caixa
                  </button>
                </div>
              </div>
            )}

            {/* Controles superiores */}
            <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                {/* Cliente */}
                <div className="lg:col-span-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cliente (Opcional)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={customerCpf}
                      onChange={(e) => handleCpfChange(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      disabled={!caixaAberto}
                      maxLength={14}
                    />
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nome"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      disabled={!caixaAberto}
                    />
                  </div>
                </div>

                {/* Código do Produto */}
                <div className="lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código do Produto
                  </label>
                  <ProductCodeInput
                    value={barcode}
                    onChange={setBarcode}
                    onEnter={handleEnter}
                    placeholder={caixaAberto ? "Digite o código, nome do produto ou escaneie" : "Abra o caixa para começar"}
                    autoFocus={true}
                    disabled={!caixaAberto}
                  />
                </div>

                {/* Quantidade */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={currentQuantity}
                    onChange={(e) => setCurrentQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    disabled={!caixaAberto}
                  />
                </div>

                {/* Preço Unitário */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço Unitário
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={currentPrice}
                        onChange={(e) => setCurrentPrice(e.target.value)}
                        placeholder="0,00"
                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        disabled={!caixaAberto}
                      />
                      <span className="absolute left-3 top-2.5 text-gray-500 text-sm">R$</span>
                    </div>
                    <button
                      onClick={handleAddToCart}
                      disabled={!caixaAberto || !currentProduct}
                      className="px-3 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Informações do produto encontrado */}
            {currentProduct && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm text-emerald-800">
                  <strong>Produto:</strong> {currentProduct.name} | 
                  <strong> Estoque:</strong> {currentProduct.stock_quantity} unidades |
                  <strong> Preço sugerido:</strong> R$ {(currentProduct.sale_price || 0).toFixed(2).replace('.', ',')}
                </p>
              </div>
            )}

            {/* Tabela de produtos */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-700 uppercase tracking-wider">
                        Código
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-700 uppercase tracking-wider">
                        Descrição
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-700 uppercase tracking-wider w-20">
                        Qtde.
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-700 uppercase tracking-wider w-12">
                        UN
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-700 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-700 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-black">
                          {item.barcode}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-black">
                          {item.name}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-center">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                            className="w-12 sm:w-16 px-1 sm:px-2 py-1 text-center border border-gray-300 rounded text-black text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            min="1"
                          />
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm text-black">
                          UN
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm text-black">
                          R$ {(item.price || 0).toFixed(2).replace('.', ',')}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium text-black">
                          R$ {((item.price * item.quantity) || 0).toFixed(2).replace('.', ',')}
                        </td>
                      </tr>
                    ))}
                    {cartItems.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-2 sm:px-4 py-12 text-center text-black text-sm">
                          Nenhum produto adicionado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rodapé com totais e botões */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="text-sm text-gray-600">
                  Total Itens: {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 w-full lg:w-auto lg:min-w-[300px]">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span className="font-semibold">R$ {getSubtotal().toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div className="border-t border-gray-300 pt-2">
                      <div className="flex justify-between text-lg font-bold text-gray-900">
                        <span>TOTAL:</span>
                        <span>R$ {getTotal().toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex flex-col sm:flex-row gap-3 mt-4 justify-center">
                <button
                  onClick={handleFinalizeSale}
                  disabled={!caixaAberto || cartItems.length === 0 || loading}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processando...' : 'Finalizar Venda'}
                </button>
                <button
                  onClick={() => setCartItems([])}
                  disabled={!caixaAberto || cartItems.length === 0 || loading}
                  className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Cancelar Venda
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal para abrir caixa */}
        <AbrirCaixaModal 
          isOpen={isAbrirCaixaModalOpen}
          onClose={() => setIsAbrirCaixaModalOpen(false)}
          onConfirm={handleConfirmAbrirCaixa}
        />

        {/* Modal de pagamento */}
        {showPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg sm:rounded-2xl shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Finalizar Pagamento</h2>
              </div>
              
              <div className="p-4 sm:p-6">
                <PaymentMethods
                  total={getTotal()}
                  onPaymentComplete={handlePaymentComplete}
                  onCancel={() => setShowPayment(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Overlay para caixa fechado */}
        {!caixaAberto && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-60 flex flex-col items-center justify-center z-40 backdrop-blur-sm">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-3">Caixa Fechado</h2>
              <p className="text-gray-300 mb-6">Você precisa abrir o caixa para iniciar as vendas.</p>
              <button 
                onClick={() => setIsAbrirCaixaModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-transform transform hover:scale-105"
              >
                Abrir Caixa
              </button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}