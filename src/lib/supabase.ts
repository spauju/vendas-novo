import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import { logSupabaseConfig } from '@/lib/logger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Validação das variáveis de ambiente
if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = []
  if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  
  logSupabaseConfig.missing(missingVars, {
    module: 'supabase-client',
    component: 'lib/supabase'
  })
  
  throw new Error(`Supabase configuration missing: ${missingVars.join(', ')}`)
} else {
  logSupabaseConfig.valid({
    module: 'supabase-client',
    component: 'lib/supabase'
  })
}

// Client para uso no browser
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client para SSR
export function createSupabaseClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Tipos do banco de dados
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: 'administrador' | 'gerente' | 'user'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'administrador' | 'gerente' | 'user'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'administrador' | 'gerente' | 'user'
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          name: string
          cpf_cnpj: string | null
          birth_date: string | null
          phone: string | null
          whatsapp: string | null
          email: string | null
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          delivery_notes: string | null
          marketing_consent: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          cpf_cnpj?: string | null
          birth_date?: string | null
          phone?: string | null
          whatsapp?: string | null
          email?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          delivery_notes?: string | null
          marketing_consent?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          cpf_cnpj?: string | null
          birth_date?: string | null
          phone?: string | null
          whatsapp?: string | null
          email?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          delivery_notes?: string | null
          marketing_consent?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          code: string
          barcode: string | null
          name: string
          description: string | null
          category: string | null
          brand: string | null
          cost_price: number
          sale_price: number
          profit_margin: number
          stock_quantity: number
          min_stock: number
          image_url: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          barcode?: string | null
          name: string
          description?: string | null
          category?: string | null
          brand?: string | null
          cost_price: number
          sale_price: number
          profit_margin?: number
          stock_quantity?: number
          min_stock?: number
          image_url?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          barcode?: string | null
          name?: string
          description?: string | null
          category?: string | null
          brand?: string | null
          cost_price?: number
          sale_price?: number
          profit_margin?: number
          stock_quantity?: number
          min_stock?: number
          image_url?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          customer_id: string | null
          user_id: string
          total_amount: number
          discount_amount: number
          final_amount: number
          status: 'pending' | 'completed' | 'cancelled'
          payment_method: string
          payment_status: 'pending' | 'paid' | 'refunded'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id?: string | null
          user_id: string
          total_amount: number
          discount_amount?: number
          final_amount: number
          status?: 'pending' | 'completed' | 'cancelled'
          payment_method: string
          payment_status?: 'pending' | 'paid' | 'refunded'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string | null
          user_id?: string
          total_amount?: number
          discount_amount?: number
          final_amount?: number
          status?: 'pending' | 'completed' | 'cancelled'
          payment_method?: string
          payment_status?: 'pending' | 'paid' | 'refunded'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          product_id: string
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          sale_id: string
          product_id: string
          quantity: number
          unit_price: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          sale_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          created_at?: string
        }
      }
      stock_movements: {
        Row: {
          id: string
          product_id: string
          type: 'in' | 'out' | 'adjustment'
          quantity: number
          reason: string | null
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          type: 'in' | 'out' | 'adjustment'
          quantity: number
          reason?: string | null
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          type?: 'in' | 'out' | 'adjustment'
          quantity?: number
          reason?: string | null
          user_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}