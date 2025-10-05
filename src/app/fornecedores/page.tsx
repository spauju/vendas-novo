'use client'

import { useState, useEffect } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PermissionButton from '@/components/auth/PermissionButton'
import SupplierForm from '@/components/fornecedores/SupplierForm'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { logSupabaseDB } from '@/lib/logger';
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'

interface Supplier {
  id: string
  name: string
  cnpj: string | null
  contact_person: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  website: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  notes: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export default function FornecedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)

  useEffect(() => {
    loadSuppliers()
  }, [])

  const loadSuppliers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true })

      if (error) throw error
      setSuppliers(data || [])
    } catch (error) {
      logSupabaseDB.failed('load_suppliers', 'suppliers', error, {
        component: 'FornecedoresPage',
        metadata: {
          operation: 'loadSuppliers',
          error: error
        }
      });
      toast.error('Erro ao carregar fornecedores')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este fornecedor?')) return

    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ active: false })
        .eq('id', id)

      if (error) throw error

      toast.success('Fornecedor excluído com sucesso!')
      loadSuppliers()
    } catch (error) {
      logSupabaseDB.failed('delete_supplier', 'suppliers', error, {
        component: 'FornecedoresPage',
        metadata: {
          operation: 'deleteSupplier',
          supplierId: id,
          error: error
        }
      });
      toast.error('Erro ao excluir fornecedor')
    }
  }

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.cnpj?.includes(searchTerm) ||
    supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <ProtectedRoute module="fornecedores">
      <MainLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-black">Fornecedores</h1>
            <p className="text-black">Gerencie seus fornecedores</p>
          </div>
          <PermissionButton
            module="fornecedores"
            action="create"
            onClick={() => {
              setEditingSupplier(null)
              setShowModal(true)
            }}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 shadow-lg shadow-teal-600/25"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Novo Fornecedor
          </PermissionButton>
        </div>

        {/* Barra de pesquisa */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar fornecedores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Lista de fornecedores */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-black">
              Lista de Fornecedores ({filteredSuppliers.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              <p className="mt-2 text-gray-600">Carregando fornecedores...</p>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="p-8 text-center">
              <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum fornecedor encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Tente ajustar sua pesquisa' : 'Comece adicionando um novo fornecedor'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredSuppliers.map((supplier) => (
                <div key={supplier.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center mb-2">
                        <BuildingOfficeIcon className="w-5 h-5 text-teal-600 mr-2 flex-shrink-0" />
                        <h3 className="text-lg font-medium text-black truncate">
                          {supplier.name}
                        </h3>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-gray-600">
                        {supplier.cnpj && (
                          <div className="flex items-center">
                            <span className="font-medium mr-2">CNPJ:</span>
                            {supplier.cnpj}
                          </div>
                        )}
                        {supplier.contact_person && (
                          <div className="flex items-center">
                            <span className="font-medium mr-2">Contato:</span>
                            {supplier.contact_person}
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center">
                            <PhoneIcon className="w-4 h-4 mr-1" />
                            {supplier.phone}
                          </div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center">
                            <EnvelopeIcon className="w-4 h-4 mr-1" />
                            {supplier.email}
                          </div>
                        )}
                        {supplier.city && supplier.state && (
                          <div className="flex items-center">
                            <MapPinIcon className="w-4 h-4 mr-1" />
                            {supplier.city}, {supplier.state}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <PermissionButton
                        module="fornecedores"
                        action="edit"
                        onClick={() => {
                          setEditingSupplier(supplier)
                          setShowModal(true)
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </PermissionButton>
                      <PermissionButton
                        module="fornecedores"
                        action="delete"
                        onClick={() => handleDelete(supplier.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </PermissionButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de formulário */}
      {showModal && (
        <SupplierForm
          supplier={editingSupplier}
          onClose={() => setShowModal(false)}
          onSuccess={loadSuppliers}
        />
      )}
      </MainLayout>
    </ProtectedRoute>
  )
}


