'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { logSupabaseDB } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import MainLayout from '@/components/layout/MainLayout';
import { 
  UserIcon, 
  PhoneIcon, 
  EnvelopeIcon,
  MapPinIcon,
  DocumentTextIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

// Função para formatar CPF
const formatCPF = (value: string) => {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 11) {
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  return value
}

// Função para formatar CEP
const formatCEP = (value: string) => {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 8) {
    return numbers.replace(/(\d{5})(\d{3})/, '$1-$2')
  }
  return value
}

// Lista completa dos estados brasileiros
const brazilianStates = [
  { code: 'AC', name: 'Acre' },
  { code: 'AL', name: 'Alagoas' },
  { code: 'AP', name: 'Amapá' },
  { code: 'AM', name: 'Amazonas' },
  { code: 'BA', name: 'Bahia' },
  { code: 'CE', name: 'Ceará' },
  { code: 'DF', name: 'Distrito Federal' },
  { code: 'ES', name: 'Espírito Santo' },
  { code: 'GO', name: 'Goiás' },
  { code: 'MA', name: 'Maranhão' },
  { code: 'MT', name: 'Mato Grosso' },
  { code: 'MS', name: 'Mato Grosso do Sul' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'PA', name: 'Pará' },
  { code: 'PB', name: 'Paraíba' },
  { code: 'PR', name: 'Paraná' },
  { code: 'PE', name: 'Pernambuco' },
  { code: 'PI', name: 'Piauí' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'RN', name: 'Rio Grande do Norte' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'RO', name: 'Rondônia' },
  { code: 'RR', name: 'Roraima' },
  { code: 'SC', name: 'Santa Catarina' },
  { code: 'SP', name: 'São Paulo' },
  { code: 'SE', name: 'Sergipe' },
  { code: 'TO', name: 'Tocantins' }
]

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpf: string;
  birthDate?: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  createdAt?: string;
  totalPurchases?: number;
  lastPurchase?: string;
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    birthDate: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: ''
  });

  // Carregar clientes do banco de dados
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, phone, cpf_cnpj, birth_date, address, city, state, zip_code, created_at')
        .order('name');

      if (error) throw error;

      const mapped: Customer[] = (data as any[] || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        email: r.email || '',
        phone: r.phone || '',
        cpf: r.cpf_cnpj || '',
        birthDate: r.birth_date || '',
        address: {
          street: r.address || '',
          number: '',
          complement: '',
          neighborhood: '',
          city: r.city || '',
          state: r.state || '',
          zipCode: r.zip_code || ''
        },
        createdAt: r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : '',
        totalPurchases: 0,
        lastPurchase: undefined
      }));

      setCustomers(mapped);
    } catch (error) {
      logSupabaseDB.failed('load_customers', error, {
        component: 'ClientesPage',
        metadata: {
          operation: 'loadCustomers',
          error: (error as any)?.message || 'Erro desconhecido'
        }
      });
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (customer.cpf && customer.cpf.includes(searchTerm)) ||
    (customer.phone && customer.phone.includes(searchTerm))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Compor um endereço em string para salvar no campo address do banco
    const composedAddress = [
      formData.street,
      formData.number ? `, ${formData.number}` : '',
      formData.neighborhood ? ` - ${formData.neighborhood}` : '',
      formData.city ? `, ${formData.city}` : '',
      formData.state ? `/${formData.state}` : '',
      formData.zipCode ? ` CEP: ${formData.zipCode}` : ''
    ].join('');

    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            cpf_cnpj: formData.cpf,
            birth_date: formData.birthDate || null,
            address: composedAddress || null,
            city: formData.city || null,
            state: formData.state || null,
            zip_code: formData.zipCode || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCustomer.id);

        if (error) throw error;
        toast.success('Cliente atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('customers')
          .insert([
            {
              name: formData.name,
              email: formData.email,
              phone: formData.phone,
              cpf_cnpj: formData.cpf,
              birth_date: formData.birthDate || null,
              address: composedAddress || null,
              city: formData.city || null,
              state: formData.state || null,
              zip_code: formData.zipCode || null,
            },
          ]);

        if (error) throw error;
        toast.success('Cliente cadastrado com sucesso');
      }

      await loadCustomers();
      resetForm();
    } catch (error) {
      logSupabaseDB.failed('save_customer', error, {
        component: 'ClientesPage',
        metadata: {
          operation: 'saveCustomer',
          isEditing: !!editingCustomer,
          error: (error as any)?.message || 'Erro desconhecido'
        }
      });
      toast.error('Erro ao salvar cliente');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', email: '', phone: '', cpf: '', birthDate: '',
      street: '', number: '', complement: '', neighborhood: '',
      city: '', state: '', zipCode: ''
    });
    setShowForm(false);
    setEditingCustomer(null);
  };

  const handleEdit = (customer: Customer) => {
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      cpf: customer.cpf || '',
      birthDate: customer.birthDate || '',
      street: customer.address?.street || '',
      number: customer.address?.number || '',
      complement: customer.address?.complement || '',
      neighborhood: customer.address?.neighborhood || '',
      city: customer.address?.city || '',
      state: customer.address?.state || '',
      zipCode: customer.address?.zipCode || ''
    });
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
      toast.success('Cliente excluído com sucesso');
      await loadCustomers();
    } catch (error) {
      logSupabaseDB.failed('delete_customer', error, {
        component: 'ClientesPage',
        metadata: {
          operation: 'deleteCustomer',
          customerId: id,
          error: (error as any)?.message || 'Erro desconhecido'
        }
      });
      toast.error('Erro ao excluir cliente');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">
            Clientes
          </h1>
          <p className="text-black">
            Gerencie seus clientes e relacionamentos
          </p>
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-2xl shadow-card p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, email, CPF ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-xl hover:bg-teal-700 transition-colors font-medium"
            >
              <PlusIcon className="h-5 w-5" />
              Novo Cliente
            </button>
          </div>
        </div>

        {/* Customer Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
                </h2>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <UserIcon className="h-5 w-5" />
                    Informações Pessoais
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-2" style={{fontFamily: 'Arial, sans-serif'}}>
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                        style={{fontFamily: 'Arial, sans-serif'}}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-2" style={{fontFamily: 'Arial, sans-serif'}}>
                        CPF *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="000.000.000-00"
                        value={formData.cpf}
                        onChange={(e) => setFormData({...formData, cpf: formatCPF(e.target.value)})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                        style={{fontFamily: 'Arial, sans-serif'}}
                        maxLength={14}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-2" style={{fontFamily: 'Arial, sans-serif'}}>
                        Data de Nascimento
                      </label>
                      <input
                        type="date"
                        value={formData.birthDate}
                        onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                        style={{fontFamily: 'Arial, sans-serif'}}
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <PhoneIcon className="h-5 w-5" />
                    Contato
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-2" style={{fontFamily: 'Arial, sans-serif'}}>
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                        style={{fontFamily: 'Arial, sans-serif'}}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-2" style={{fontFamily: 'Arial, sans-serif'}}>
                        Telefone *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="(00) 00000-0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                        style={{fontFamily: 'Arial, sans-serif'}}
                      />
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPinIcon className="h-5 w-5" />
                    Endereço
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-black mb-2" style={{fontFamily: 'Arial, sans-serif'}}>
                        Rua/Avenida
                      </label>
                      <input
                        type="text"
                        value={formData.street}
                        onChange={(e) => setFormData({...formData, street: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                        style={{fontFamily: 'Arial, sans-serif'}}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-2" style={{fontFamily: 'Arial, sans-serif'}}>
                        Número
                      </label>
                      <input
                        type="text"
                        value={formData.number}
                        onChange={(e) => setFormData({...formData, number: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                        style={{fontFamily: 'Arial, sans-serif'}}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-2" style={{fontFamily: 'Arial, sans-serif'}}>
                        Complemento
                      </label>
                      <input
                        type="text"
                        value={formData.complement}
                        onChange={(e) => setFormData({...formData, complement: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                        style={{fontFamily: 'Arial, sans-serif'}}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-2" style={{fontFamily: 'Arial, sans-serif'}}>
                        Bairro
                      </label>
                      <input
                        type="text"
                        value={formData.neighborhood}
                        onChange={(e) => setFormData({...formData, neighborhood: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                        style={{fontFamily: 'Arial, sans-serif'}}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-2" style={{fontFamily: 'Arial, sans-serif'}}>
                        Cidade
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                        style={{fontFamily: 'Arial, sans-serif'}}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-2" style={{fontFamily: 'Arial, sans-serif'}}>
                        Estado
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          list="states-list"
                          value={formData.state}
                          onChange={(e) => setFormData({...formData, state: e.target.value})}
                          placeholder="Digite ou selecione o estado"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                          style={{fontFamily: 'Arial, sans-serif'}}
                        />
                        <datalist id="states-list">
                          {brazilianStates.map((state) => (
                            <option key={state.code} value={state.code}>
                              {state.name}
                            </option>
                          ))}
                        </datalist>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-2" style={{fontFamily: 'Arial, sans-serif'}}>
                        CEP
                      </label>
                      <input
                        type="text"
                        placeholder="00000-000"
                        value={formData.zipCode}
                        onChange={(e) => setFormData({...formData, zipCode: formatCEP(e.target.value)})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                        style={{fontFamily: 'Arial, sans-serif'}}
                        maxLength={9}
                      />
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex gap-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors font-medium"
                  >
                    {editingCustomer ? 'Atualizar' : 'Cadastrar'} Cliente
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Customer Details Modal */}
        {viewingCustomer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">
                  Detalhes do Cliente
                </h2>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Informações Pessoais</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Nome:</span> {viewingCustomer.name}</p>
                      <p><span className="font-medium">CPF:</span> {viewingCustomer.cpf}</p>
                      <p><span className="font-medium">Nascimento:</span> {formatDate(viewingCustomer.birthDate)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Contato</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Email:</span> {viewingCustomer.email}</p>
                      <p><span className="font-medium">Telefone:</span> {viewingCustomer.phone}</p>
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <h3 className="font-semibold text-gray-900 mb-3">Endereço</h3>
                    <div className="text-sm">
                      <p>
                        {viewingCustomer.address.street}, {viewingCustomer.address.number}
                        {viewingCustomer.address.complement && `, ${viewingCustomer.address.complement}`}
                      </p>
                      <p>{viewingCustomer.address.neighborhood} - {viewingCustomer.address.city}/{viewingCustomer.address.state}</p>
                      <p>CEP: {viewingCustomer.address.zipCode}</p>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-3">Histórico de Compras</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Total em Compras:</span> {formatCurrency(viewingCustomer.totalPurchases ?? 0)}</p>
                      {viewingCustomer.lastPurchase && (
                        <p><span className="font-medium">Última Compra:</span> {formatDate(viewingCustomer.lastPurchase)}</p>
                      )}
                      <p><span className="font-medium">Cliente desde:</span> {formatDate(viewingCustomer.createdAt)}</p>
                    </div>
                    <div className="flex gap-4 pt-6 border-t border-gray-200">
                      <button
                        onClick={() => setViewingCustomer(null)}
                        className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                      >
                        Fechar
                      </button>
                      <button
                        onClick={() => {
                          setViewingCustomer(null);
                          if (viewingCustomer) handleEdit(viewingCustomer);
                        }}
                        className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors font-medium"
                      >
                        Editar Cliente
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Customers List */}
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-black">
              Clientes Cadastrados ({filteredCustomers.length})
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Contato
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Total Compras
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Última Compra
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-black">
                          {customer.name}
                        </div>
                        <div className="text-sm text-black">
                          CPF: {customer.cpf}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">{customer.email}</div>
                      <div className="text-sm text-black">{customer.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(customer.totalPurchases ?? 0)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                      {customer.lastPurchase ? formatDate(customer.lastPurchase) : 'Nenhuma compra'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setViewingCustomer(customer)}
                          className="text-black hover:text-gray-700 p-1 rounded"
                          title="Ver detalhes"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(customer)}
                          className="text-black hover:text-gray-700 p-1 rounded"
                          title="Editar"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
                          className="text-black hover:text-gray-700 p-1 rounded"
                          title="Excluir"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredCustomers.length === 0 && (
              <div className="text-center py-12">
                <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Nenhum cliente encontrado
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Tente ajustar os termos de busca.' : 'Comece cadastrando seu primeiro cliente.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}


