'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { QrCodeIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline'
import { QRCodeSVG } from 'qrcode.react'
import { createStaticPix } from 'pix-utils'

interface PixQRCodeProps {
  amount: number
  onClose: () => void
}

interface PixConfig {
  tipo_chave: string
  chave_pix: string
  nome_beneficiario: string
}

export default function PixQRCode({ amount, onClose }: PixQRCodeProps) {
  const [pixConfig, setPixConfig] = useState<PixConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [pixPayload, setPixPayload] = useState<string>('')

  useEffect(() => {
    loadPixConfig()
  }, [])

  useEffect(() => {
    if (pixConfig) {
      generatePixPayload()
    }
  }, [pixConfig, amount])

  const loadPixConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracao_pix')
        .select('*')
        .eq('id', 1)
        .single()

      if (error) throw error

      if (data) {
        setPixConfig(data)
      }
    } catch (error) {
      console.error('Erro ao carregar configuração PIX:', error)
    } finally {
      setLoading(false)
    }
  }

  const generatePixPayload = () => {
    if (!pixConfig) return

    try {
      console.log('=== Gerando Payload PIX com pix-utils ===')
      console.log('Configuração PIX:', pixConfig)
      console.log('Valor:', amount)
      
      // Limpar chave PIX - remover formatação de CPF/CNPJ/Telefone
      let cleanKey = pixConfig.chave_pix
      
      // Se for CPF, CNPJ ou Telefone, remover pontos, traços e parênteses
      if (pixConfig.tipo_chave === 'CPF' || 
          pixConfig.tipo_chave === 'CNPJ' || 
          pixConfig.tipo_chave === 'Telefone') {
        cleanKey = pixConfig.chave_pix.replace(/[^\d]/g, '')
        console.log('Chave PIX limpa (sem formatação):', cleanKey)
      }
      
      // Gerar payload PIX usando biblioteca validada pix-utils
      const pixObject = createStaticPix({
        merchantName: pixConfig.nome_beneficiario || 'Vendedor',
        merchantCity: 'SAO PAULO',
        pixKey: cleanKey,
        infoAdicional: 'Pagamento PDV',
        transactionAmount: amount
      })
      
      // Verificar se houve erro
      if ('error' in pixObject) {
        console.error('Erro ao gerar PIX:', pixObject.error)
        return
      }
      
      const payload = pixObject.toBRCode()
      
      console.log('Payload Final (pix-utils):', payload)
      console.log('Tamanho do Payload:', payload.length)
      console.log('Chave usada:', cleanKey)
      console.log('Objeto PIX:', pixObject)
      setPixPayload(payload)
    } catch (error) {
      console.error('Erro ao gerar payload PIX:', error)
    }
  }

  // Função antiga removida - agora usa pix-utils
  /* 
  const createPixPayload = (key: string, name: string, city: string, value: number): string => {
    const ID_PAYLOAD_FORMAT_INDICATOR = '00'
    const ID_MERCHANT_ACCOUNT_INFORMATION = '26'
    const ID_MERCHANT_ACCOUNT_INFORMATION_GUI = '00'
    const ID_MERCHANT_ACCOUNT_INFORMATION_KEY = '01'
    const ID_MERCHANT_CATEGORY_CODE = '52'
    const ID_TRANSACTION_CURRENCY = '53'
    const ID_TRANSACTION_AMOUNT = '54'
    const ID_COUNTRY_CODE = '58'
    const ID_MERCHANT_NAME = '59'
    const ID_MERCHANT_CITY = '60'
    const ID_ADDITIONAL_DATA_FIELD_TEMPLATE = '62'
    const ID_ADDITIONAL_DATA_FIELD_TEMPLATE_TXID = '05'
    const ID_CRC16 = '63'

    const PAYLOAD_FORMAT_INDICATOR = '01'
    const MERCHANT_CATEGORY_CODE = '0000'
    const TRANSACTION_CURRENCY = '986' // BRL
    const COUNTRY_CODE = 'BR'
    const GUI = 'br.gov.bcb.pix'

    // Formatar valores - remover acentos e caracteres especiais
    const removeAccents = (str: string) => {
      return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    }
    
    const merchantName = removeAccents(name).substring(0, 25).toUpperCase().trim()
    const merchantCity = removeAccents(city).substring(0, 15).toUpperCase().trim()
    const transactionAmount = value.toFixed(2)
    // TXID deve ter no máximo 25 caracteres
    const txid = ('***' + Date.now().toString()).substring(0, 25)

    // Construir campos
    const addEMVTag = (id: string, value: string) => {
      const size = value.length.toString().padStart(2, '0')
      return `${id}${size}${value}`
    }

    // Merchant Account Information
    const merchantAccountInfo = 
      addEMVTag(ID_MERCHANT_ACCOUNT_INFORMATION_GUI, GUI) +
      addEMVTag(ID_MERCHANT_ACCOUNT_INFORMATION_KEY, key)
    
    // Additional Data Field
    const additionalDataField = addEMVTag(ID_ADDITIONAL_DATA_FIELD_TEMPLATE_TXID, txid)

    // Montar payload sem CRC - ordem correta conforme padrão EMV
    // Nome e cidade são opcionais - só adiciona se tiverem valor
    let payload = 
      addEMVTag(ID_PAYLOAD_FORMAT_INDICATOR, PAYLOAD_FORMAT_INDICATOR) +
      addEMVTag(ID_MERCHANT_ACCOUNT_INFORMATION, merchantAccountInfo) +
      addEMVTag(ID_MERCHANT_CATEGORY_CODE, MERCHANT_CATEGORY_CODE) +
      addEMVTag(ID_TRANSACTION_CURRENCY, TRANSACTION_CURRENCY) +
      addEMVTag(ID_TRANSACTION_AMOUNT, transactionAmount) +
      addEMVTag(ID_COUNTRY_CODE, COUNTRY_CODE)
    
    // Adicionar nome e cidade apenas se fornecidos
    if (merchantName) {
      payload += addEMVTag(ID_MERCHANT_NAME, merchantName)
    }
    if (merchantCity) {
      payload += addEMVTag(ID_MERCHANT_CITY, merchantCity)
    }
    
    payload += addEMVTag(ID_ADDITIONAL_DATA_FIELD_TEMPLATE, additionalDataField) +
      ID_CRC16 + '04'
    
    console.log('PIX Payload (sem CRC):', payload)
    console.log('Chave PIX:', key)
    console.log('Nome:', merchantName)
    console.log('Cidade:', merchantCity)
    console.log('Valor:', transactionAmount)

    // Calcular CRC16
    const crc = calculateCRC16(payload)
    payload += crc

    return payload
  }

  // Função para calcular CRC16 CCITT
  const calculateCRC16 = (payload: string): string => {
    let crc = 0xFFFF
    const polynomial = 0x1021

    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = (crc << 1) ^ polynomial
        } else {
          crc = crc << 1
        }
      }
    }

    crc = crc & 0xFFFF
    return crc.toString(16).toUpperCase().padStart(4, '0')
  }
  */

  const copyToClipboard = async () => {
    if (!pixPayload) return
    
    try {
      await navigator.clipboard.writeText(pixPayload)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Erro ao copiar:', error)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <p className="text-center text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!pixConfig) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <QrCodeIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              PIX não configurado
            </h3>
            <p className="text-gray-600 mb-4">
              Configure a chave PIX nas configurações gerais para aceitar pagamentos via PIX.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-6 rounded-t-xl">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center">
              <QrCodeIcon className="w-8 h-8 mr-3" />
              <div>
                <h3 className="text-xl font-bold">Pagamento via PIX</h3>
                <p className="text-sm text-teal-100">Escaneie o QR Code</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-teal-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Valor */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600 mb-1">Valor a pagar</p>
            <p className="text-3xl font-bold text-gray-900">
              R$ {amount.toFixed(2).replace('.', ',')}
            </p>
          </div>

          {/* QR Code */}
          <div className="bg-white border-4 border-teal-500 rounded-xl p-4 mb-6 flex items-center justify-center">
            {pixPayload ? (
              <QRCodeSVG
                value={pixPayload}
                size={280}
                level="M"
                includeMargin={false}
              />
            ) : (
              <div className="w-[280px] h-[280px] flex items-center justify-center">
                <p className="text-gray-400">Gerando QR Code...</p>
              </div>
            )}
          </div>

          {/* Informações */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Beneficiário:</span>
                <span className="font-medium text-gray-900">{pixConfig.nome_beneficiario}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tipo de Chave:</span>
                <span className="font-medium text-gray-900">{pixConfig.tipo_chave}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Chave:</span>
                <span className="font-medium text-gray-900 truncate ml-2">{pixConfig.chave_pix}</span>
              </div>
            </div>
          </div>

          {/* Botão Copiar */}
          <button
            onClick={copyToClipboard}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
          >
            {copied ? (
              <>
                <CheckIcon className="w-5 h-5 mr-2" />
                Código Copiado!
              </>
            ) : (
              <>
                <ClipboardDocumentIcon className="w-5 h-5 mr-2" />
                Copiar Código PIX
              </>
            )}
          </button>

          {/* Instruções */}
          <div className="mt-4 text-center text-sm text-gray-600">
            <p>Abra o app do seu banco e escaneie o QR Code</p>
            <p>ou copie o código PIX para colar no app</p>
          </div>
        </div>
      </div>
    </div>
  )
}
