// PIX utility functions (sem integração com Mercado Pago)

// Validate PIX key format
export const validatePixKey = (key: string, type: 'email' | 'phone' | 'cpf' | 'cnpj' | 'random'): boolean => {
  switch (type) {
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)
    case 'phone':
      return /^\+?[1-9]\d{1,14}$/.test(key.replace(/\s/g, ''))
    case 'cpf':
      return /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(key) || /^\d{11}$/.test(key)
    case 'cnpj':
      return /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(key) || /^\d{14}$/.test(key)
    case 'random':
      return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(key)
    default:
      return false
  }
}

// Format PIX key for display
export const formatPixKey = (key: string, type: 'email' | 'phone' | 'cpf' | 'cnpj' | 'random'): string => {
  switch (type) {
    case 'cpf':
      return key.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    case 'cnpj':
      return key.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    case 'phone':
      return key.replace(/(\d{2})(\d{5})(\d{4})/, '+55 ($1) $2-$3')
    default:
      return key
  }
}

// Generate random PIX key
export const generateRandomPixKey = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

