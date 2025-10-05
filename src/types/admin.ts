// Tipos para o módulo de administração

export interface Usuario {
  id: string
  full_name: string
  email: string
  funcao: 'usuario' | 'gerente' | 'administrador'
  created_at: string
}

export interface DadosEmpresa {
  id: number
  razao_social: string
  nome_fantasia: string
  cnpj: string
  inscricao_estadual?: string
  endereco: string
  telefone: string
  email_contato: string
  updated_at: string
}

export interface ConfiguracaoPix {
  id: number
  tipo_chave: 'CNPJ' | 'Email' | 'Telefone' | 'Chave Aleatória'
  chave_pix: string
  nome_beneficiario: string
  updated_at: string
}

export interface NovoUsuario {
  full_name: string
  email: string
  senha: string
}

export interface FormDadosEmpresa {
  razao_social: string
  nome_fantasia: string
  cnpj: string
  inscricao_estadual: string
  endereco: string
  telefone: string
  email_contato: string
}

export interface FormConfiguracaoPix {
  tipo_chave: 'CNPJ' | 'Email' | 'Telefone' | 'Chave Aleatória'
  chave_pix: string
  nome_beneficiario: string
}
