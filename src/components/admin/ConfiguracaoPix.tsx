'use client'

import { useState, useEffect } from 'react'
import { useAdmin } from '@/hooks/useAdmin'
import { FormConfiguracaoPix } from '@/types/admin'
import { CreditCardIcon } from '@heroicons/react/24/outline'

export default function ConfiguracaoPix() {
  const { carregarConfiguracaoPix, salvarConfiguracaoPix, isLoading } = useAdmin()
  const [formData, setFormData] = useState<FormConfiguracaoPix>({
    tipo_chave: 'Email',
    chave_pix: '',
    nome_beneficiario: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    const dados = await carregarConfiguracaoPix()
    if (dados) {
      setFormData({
        tipo_chave: dados.tipo_chave,
        chave_pix: dados.chave_pix || '',
        nome_beneficiario: dados.nome_beneficiario || ''
      })
    }
  }

  const validateChave = (chave: string, tipo: string): boolean => {
    switch (tipo) {
      case 'Email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(chave)
      case 'Telefone':
        const phone = chave.replace(/\D/g, '')
        return phone.length >= 10 && phone.length <= 11
      case 'CNPJ':
        const cnpj = chave.replace(/\D/g, '')
        return cnpj.length === 14
      case 'Chave Aleatória':
        return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(chave)
      default:
        return false
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.chave_pix.trim()) {
      newErrors.chave_pix = 'Chave PIX é obrigatória'
    } else if (!validateChave(formData.chave_pix, formData.tipo_chave)) {
      newErrors.chave_pix = `Chave PIX inválida para o tipo ${formData.tipo_chave}`
    }

    if (!formData.nome_beneficiario.trim()) {
      newErrors.nome_beneficiario = 'Nome do beneficiário é obrigatório'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    await salvarConfiguracaoPix(formData)
  }

  const handleInputChange = (field: keyof FormConfiguracaoPix, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const getPlaceholder = (tipo: string): string => {
    switch (tipo) {
      case 'Email':
        return 'exemplo@email.com'
      case 'Telefone':
        return '(11) 99999-9999'
      case 'CNPJ':
        return '00.000.000/0000-00'
      case 'Chave Aleatória':
        return 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      default:
        return ''
    }
  }

  const formatChave = (value: string, tipo: string): string => {
    switch (tipo) {
      case 'Telefone':
        const numbers = value.replace(/\D/g, '')
        if (numbers.length <= 10) {
          return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
        }
        return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
      case 'CNPJ':
        const cnpjNumbers = value.replace(/\D/g, '')
        return cnpjNumbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
      default:
        return value
    }
  }

  const handleChaveChange = (value: string) => {
    const formattedValue = formatChave(value, formData.tipo_chave)
    handleInputChange('chave_pix', formattedValue)
  }

  const tiposChave = [
    { value: 'Email', label: 'Email' },
    { value: 'Telefone', label: 'Telefone' },
    { value: 'CNPJ', label: 'CNPJ' },
    { value: 'Chave Aleatória', label: 'Chave Aleatória' }
  ]

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center mb-6">
        <CreditCardIcon className="h-6 w-6 text-green-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Configuração de Recebimento via PIX</h3>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-green-800">
          Configure aqui a chave PIX que será utilizada para receber pagamentos. 
          Esta configuração será usada para gerar QR codes e identificar sua conta nos recebimentos.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Chave *
            </label>
            <select
              value={formData.tipo_chave}
              onChange={(e) => handleInputChange('tipo_chave', e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {tiposChave.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chave PIX *
            </label>
            <input
              type="text"
              value={formData.chave_pix}
              onChange={(e) => handleChaveChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                errors.chave_pix ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder={getPlaceholder(formData.tipo_chave)}
            />
            {errors.chave_pix && (
              <p className="mt-1 text-sm text-red-600">{errors.chave_pix}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome do Beneficiário *
          </label>
          <input
            type="text"
            value={formData.nome_beneficiario}
            onChange={(e) => handleInputChange('nome_beneficiario', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
              errors.nome_beneficiario ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Nome que aparecerá como beneficiário do PIX"
          />
          {errors.nome_beneficiario && (
            <p className="mt-1 text-sm text-red-600">{errors.nome_beneficiario}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Este nome aparecerá para quem for fazer o pagamento via PIX
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Salvando...' : 'Salvar Configuração PIX'}
          </button>
        </div>
      </form>
    </div>
  )
}
