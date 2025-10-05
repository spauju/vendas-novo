'use client'

import { useState, useEffect } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  CubeIcon,
  TagIcon,
  CurrencyDollarIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline'
import Image from 'next/image'
import toast from 'react-hot-toast'
import BarcodeInput from '@/components/common/BarcodeInput'
import { supabase } from '@/lib/supabase'
import { logSupabaseDB } from '@/lib/logger';

interface Product {
  id: string
  code: string
  barcode?: string
  name: string
  description?: string
  category?: string
  brand?: string
  supplier_id?: string
  cost_price: number
  sale_price: number
  profit_margin?: number
  stock_quantity: number
  min_stock: number
  image_url?: string
  active: boolean
  created_at: string
  updated_at: string
}

const categories = ['Todos', 'Bebidas', 'Padaria', 'Laticínios', 'Limpeza', 'Higiene', 'Mercearia', 'Grãos']

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    barcode: '',
    category: 'Bebidas',
    brand: '',
    cost_price: '',
    sale_price: '',
    stock_quantity: '',
    min_stock: '',
    image_url: ''
  })

  // Carregar produtos do banco de dados
  const loadProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('name')

      if (error) {
        logSupabaseDB.failed('load_products', 'products', error, {
          component: 'ProdutosPage',
          metadata: {
            operation: 'loadProducts',
            error: error
          }
        });
        toast.error('Erro ao carregar produtos')
        return
      }

      setProducts(data || [])
    } catch (error) {
      logSupabaseDB.failed('load_products_exception', 'products', error, {
        component: 'ProdutosPage',
        metadata: {
          operation: 'loadProducts',
          error: error
        }
      });
      toast.error('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  // Filtrar produtos
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.barcode && product.barcode.includes(searchTerm)) ||
                         (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         product.code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'Todos' || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Função para calcular produtos com estoque baixo
  const getLowStockProducts = () => {
    return products.filter(product => product.stock_quantity <= product.min_stock);
  };

  // Produtos com estoque baixo
  const lowStockProducts = getLowStockProducts()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.code || !formData.sale_price) {
      toast.error('Preencha os campos obrigatórios: Nome, Código e Preço de Venda')
      return
    }

    try {
      const productData = {
        code: formData.code,
        name: formData.name,
        description: formData.description || null,
        barcode: formData.barcode || null,
        category: formData.category || null,
        brand: formData.brand || null,
        cost_price: parseFloat(formData.cost_price) || 0,
        sale_price: parseFloat(formData.sale_price),
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        min_stock: parseInt(formData.min_stock) || 0,
        image_url: formData.image_url || null,
        active: true
      }

      if (editingProduct) {
        // Atualizar produto existente
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id)

        if (error) {
          if (error.code === '23505') {
            if (error.message.includes('code')) {
              toast.error('Já existe um produto com este código')
            } else if (error.message.includes('barcode')) {
              toast.error('Já existe um produto com este código de barras')
            } else {
              toast.error('Produto duplicado')
            }
          } else {
            logSupabaseDB.failed('update_product', 'products', error, {
              component: 'ProdutosPage',
              metadata: {
                operation: 'updateProduct',
                productId: editingProduct.id,
                error: error
              }
            });
            toast.error('Erro ao atualizar produto')
          }
          return
        }

        toast.success('Produto atualizado com sucesso!')
      } else {
        // Criar novo produto
        const { error } = await supabase
          .from('products')
          .insert([productData])

        if (error) {
          if (error.code === '23505') {
            if (error.message.includes('code')) {
              toast.error('Já existe um produto com este código')
            } else if (error.message.includes('barcode')) {
              toast.error('Já existe um produto com este código de barras')
            } else {
              toast.error('Produto duplicado')
            }
          } else {
            logSupabaseDB.failed('create_product', 'products', error, {
              component: 'ProdutosPage',
              metadata: {
                operation: 'createProduct',
                error: (error as any)?.message || 'Erro desconhecido'
              }
            });
            toast.error('Erro ao criar produto')
          }
          return
        }

        toast.success('Produto cadastrado com sucesso!')
      }

      resetForm()
      loadProducts() // Recarregar lista de produtos
    } catch (error) {
      logSupabaseDB.failed('save_product', 'products', error, {
        component: 'ProdutosPage',
        metadata: {
          operation: 'saveProduct',
          isEditing: !!editingProduct,
          error: error
        }
      });
      toast.error('Erro ao salvar produto')
    }
  }

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      barcode: '',
      category: 'Bebidas',
      brand: '',
      cost_price: '',
      sale_price: '',
      stock_quantity: '',
      min_stock: '',
      image_url: ''
    })
    setEditingProduct(null)
    setShowForm(false)
  }

  const handleEdit = (product: Product) => {
    setFormData({
      code: product.code,
      name: product.name,
      description: product.description || '',
      barcode: product.barcode || '',
      category: product.category || 'Bebidas',
      brand: product.brand || '',
      cost_price: product.cost_price.toString(),
      sale_price: product.sale_price.toString(),
      stock_quantity: product.stock_quantity.toString(),
      min_stock: product.min_stock.toString(),
      image_url: product.image_url || ''
    })
    setEditingProduct(product)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) {
      return
    }

    try {
      // Soft delete - marcar como inativo ao invés de deletar
      const { error } = await supabase
        .from('products')
        .update({ active: false })
        .eq('id', id)

      if (error) {
        logSupabaseDB.failed('delete_product', 'products', error, {
          component: 'ProdutosPage',
          metadata: {
            operation: 'deleteProduct',
            productId: id,
            error: error
          }
        });
        toast.error('Erro ao excluir produto')
        return
      }

      toast.success('Produto excluído com sucesso!')
      loadProducts() // Recarregar lista de produtos
    } catch (error) {
      logSupabaseDB.failed('delete_product_exception', 'products', error, {
        component: 'ProdutosPage',
        metadata: {
          operation: 'deleteProduct',
          productId: id,
          error: error
        }
      });
      toast.error('Erro ao excluir produto');
    } finally {
      setLoading(false);
    }
  }

  const getStockStatus = (product: Product) => {
    if (product.stock_quantity === 0) return { text: 'Sem estoque', color: 'text-red-600 bg-red-100' }
    if (product.stock_quantity <= product.min_stock) return { text: 'Estoque baixo', color: 'text-yellow-600 bg-yellow-100' }
    return { text: 'Em estoque', color: 'text-green-600 bg-green-100' }
  }

  if (loading) {
    return (
      <ProtectedRoute module="produtos">
        <MainLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute module="produtos">
      <MainLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black">
              Produtos
            </h1>
            <p className="text-black">
              Gerencie seu catálogo de produtos
            </p>
          </div>
          
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 shadow-lg shadow-teal-600/25"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Novo Produto</span>
          </button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <CubeIcon className="w-6 h-6 text-emerald-600" />
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
                <ArchiveBoxIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-black">Em Estoque</p>
                <p className="text-2xl font-bold text-black">
                  {products.filter(p => p.stock_quantity > 0).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <TagIcon className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-black">Estoque Baixo</p>
                <p className="text-2xl font-bold text-black">{lowStockProducts.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                <CurrencyDollarIcon className="w-6 h-6 text-teal-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-black">Valor Total</p>
                <p className="text-2xl font-bold text-black">
                  R$ {products.reduce((sum, p) => sum + ((p?.sale_price || 0) * (p?.stock_quantity || 0)), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            {/* Busca */}
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, código ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            {/* Filtro por categoria */}
            <div className="flex space-x-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de produtos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preço
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estoque
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
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product)
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                            {product.image_url ? (
                              <Image
                                src={product.image_url}
                                alt={product.name}
                                width={48}
                                height={48}
                                className="object-cover"
                              />
                            ) : (
                              <PhotoIcon className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-black">
                              {product.name}
                            </div>
                            <div className="text-sm text-black">
                              {product.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        {product.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
R$ {(product.sale_price || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        {product.stock_quantity} un.
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                          {stockStatus.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="text-black hover:text-gray-700 p-1"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-black hover:text-gray-700 p-1"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-black mb-2" style={{fontFamily: 'Arial, sans-serif'}}>
                      Nome do Produto *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                      style={{fontFamily: 'Arial, sans-serif'}}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-2" style={{fontFamily: 'Arial, sans-serif'}}>
                      Código de Barras *
                    </label>
                    <BarcodeInput
                      required
                      value={formData.barcode}
                      onChange={(value) => setFormData({...formData, barcode: value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                      style={{fontFamily: 'Arial, sans-serif'}}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-black mb-2" style={{fontFamily: 'Arial, sans-serif'}}>
                      Descrição
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                      style={{fontFamily: 'Arial, sans-serif'}}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-2" style={{fontFamily: 'Arial, sans-serif'}}>
                      Categoria
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                      style={{fontFamily: 'Arial, sans-serif'}}
                    >
                      {categories.filter(c => c !== 'Todos').map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-2" style={{fontFamily: 'Arial, sans-serif'}}>
                      Código do Produto *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                      style={{fontFamily: 'Arial, sans-serif'}}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-2" style={{fontFamily: 'Arial, sans-serif'}}>
                      Marca
                    </label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData({...formData, brand: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                      style={{fontFamily: 'Arial, sans-serif'}}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-2" style={{fontFamily: 'Arial, sans-serif'}}>
                      Preço de Venda *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.sale_price}
                      onChange={(e) => setFormData({...formData, sale_price: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                      style={{fontFamily: 'Arial, sans-serif'}}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-2" style={{fontFamily: 'Arial, sans-serif'}}>
                      Preço de Custo
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                      style={{fontFamily: 'Arial, sans-serif'}}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-2" style={{fontFamily: 'Arial, sans-serif'}}>
                      Estoque Atual
                    </label>
                    <input
                      type="number"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                      style={{fontFamily: 'Arial, sans-serif'}}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-2" style={{fontFamily: 'Arial, sans-serif'}}>
                      Estoque Mínimo
                    </label>
                    <input
                      type="number"
                      value={formData.min_stock}
                      onChange={(e) => setFormData({...formData, min_stock: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                      style={{fontFamily: 'Arial, sans-serif'}}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-black mb-2" style={{fontFamily: 'Arial, sans-serif'}}>
                      URL da Imagem
                    </label>
                    <input
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                      placeholder="https://exemplo.com/imagem.jpg"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                      style={{fontFamily: 'Arial, sans-serif'}}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all duration-200"
                  >
                    {editingProduct ? 'Atualizar' : 'Cadastrar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      </MainLayout>
    </ProtectedRoute>
  )
}

