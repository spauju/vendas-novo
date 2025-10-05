'use client'

import { useState, useEffect } from 'react'
import { useAdmin } from '@/hooks/useAdmin'
import { FormDadosEmpresa } from '@/types/admin'
import { BuildingOfficeIcon } from '@heroicons/react/24/outline'

export default function DadosEmpresa() {
  const { carregarDadosEmpresa, salvarDadosEmpresa, isLoading } = useAdmin()
  const [formData, setFormData] = useState<FormDadosEmpresa>({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    inscricao_estadual: '',
    endereco: '',
    telefone: '',
    email_contato: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    const dados = await carregarDadosEmpresa()
    if (dados) {
      setFormData({
        razao_social: dados.razao_social || '',
        nome_fantasia: dados.nome_fantasia || '',
        cnpj: dados.cnpj || '',
        inscricao_estadual: dados.inscricao_estadual || '',
        endereco: dados.endereco || '',
        telefone: dados.telefone || '',
        email_contato: dados.email_contato || ''
      })
    }
  }

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }

  const formatTelefone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.razao_social.trim()) {
      newErrors.razao_social = 'Razão social é obrigatória'
    }

    if (!formData.endereco.trim()) {
      newErrors.endereco = 'Endereço é obrigatório'
    }

    if (!formData.email_contato.trim()) {
      newErrors.email_contato = 'Email de contato é obrigatório'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_contato)) {
      newErrors.email_contato = 'Email inválido'
    }

    if (formData.cnpj && formData.cnpj.replace(/\D/g, '').length !== 14) {
      newErrors.cnpj = 'CNPJ deve ter 14 dígitos'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    await salvarDadosEmpresa(formData)
  }

  const handleInputChange = (field: keyof FormDadosEmpresa, value: string) => {
    let formattedValue = value

    if (field === 'cnpj') {
      formattedValue = formatCNPJ(value)
    } else if (field === 'telefone') {
      formattedValue = formatTelefone(value)
    }

    setFormData(prev => ({ ...prev, [field]: formattedValue }))
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center mb-6">
        <BuildingOfficeIcon className="h-6 w-6 text-blue-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Informações da Empresa</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Razão Social *
            </label>
            <input
              type="text"
              value={formData.razao_social}
              onChange={(e) => handleInputChange('razao_social', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.razao_social ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Digite a razão social"
            />
            {errors.razao_social && (
              <p className="mt-1 text-sm text-red-600">{errors.razao_social}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Fantasia
            </label>
            <input
              type="text"
              value={formData.nome_fantasia}
              onChange={(e) => handleInputChange('nome_fantasia', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Digite o nome fantasia"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CNPJ
            </label>
            <input
              type="text"
              value={formData.cnpj}
              onChange={(e) => handleInputChange('cnpj', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.cnpj ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="00.000.000/0000-00"
              maxLength={18}
            />
            {errors.cnpj && (
              <p className="mt-1 text-sm text-red-600">{errors.cnpj}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Inscrição Estadual
            </label>
            <input
              type="text"
              value={formData.inscricao_estadual}
              onChange={(e) => handleInputChange('inscricao_estadual', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Digite a inscrição estadual"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefone
            </label>
            <input
              type="text"
              value={formData.telefone}
              onChange={(e) => handleInputChange('telefone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="(00) 00000-0000"
              maxLength={15}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email de Contato *
            </label>
            <input
              type="email"
              value={formData.email_contato}
              onChange={(e) => handleInputChange('email_contato', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email_contato ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="contato@empresa.com"
            />
            {errors.email_contato && (
              <p className="mt-1 text-sm text-red-600">{errors.email_contato}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Endereço Completo *
          </label>
          <textarea
            value={formData.endereco}
            onChange={(e) => handleInputChange('endereco', e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.endereco ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Digite o endereço completo da empresa"
          />
          {errors.endereco && (
            <p className="mt-1 text-sm text-red-600">{errors.endereco}</p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Salvando...' : 'Salvar Informações'}
          </button>
        </div>
      </form>
    </div>
  )
}
