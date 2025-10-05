const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function corrigirErrosSistema() {
  console.log('🔧 CORREÇÃO DE ERROS DO SISTEMA')
  console.log('=' .repeat(60))
  
  try {
    // 1. Verificar e corrigir estrutura da tabela products
    console.log('\n1️⃣ VERIFICANDO TABELA PRODUCTS...')
    await verificarECorrigirProducts()
    
    // 2. Verificar e corrigir estrutura da tabela customers
    console.log('\n2️⃣ VERIFICANDO TABELA CUSTOMERS...')
    await verificarECorrigirCustomers()
    
    // 3. Criar tabela suppliers se não existir
    console.log('\n3️⃣ VERIFICANDO TABELA SUPPLIERS...')
    await verificarECriarSuppliers()
    
    // 4. Verificar configuração do Supabase
    console.log('\n4️⃣ VERIFICANDO CONFIGURAÇÃO SUPABASE...')
    await verificarConfiguracaoSupabase()
    
    console.log('\n🎉 CORREÇÃO CONCLUÍDA COM SUCESSO!')
    
  } catch (error) {
    console.error('❌ Erro durante a correção:', error.message)
  }
}

async function verificarECorrigirProducts() {
  try {
    // Verificar se a coluna sale_price existe
    const { data, error } = await supabase
      .from('products')
      .select('sale_price')
      .limit(1)
    
    if (error && error.code === '42703') {
      console.log('⚠️ Coluna sale_price não encontrada, adicionando...')
      
      // Adicionar coluna sale_price
      const { error: alterError } = await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE products 
          ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2) DEFAULT 0.00;
          
          -- Atualizar produtos existentes com sale_price baseado no cost_price
          UPDATE products 
          SET sale_price = COALESCE(cost_price * 1.3, 0.00)
          WHERE sale_price IS NULL OR sale_price = 0;
        `
      })
      
      if (alterError) {
        console.error('❌ Erro ao adicionar sale_price:', alterError.message)
      } else {
        console.log('✅ Coluna sale_price adicionada com sucesso')
      }
    } else {
      console.log('✅ Coluna sale_price já existe')
    }
    
    // Verificar outras colunas necessárias
    const colunasNecessarias = [
      { nome: 'cost_price', tipo: 'DECIMAL(10,2)', padrao: '0.00' },
      { nome: 'profit_margin', tipo: 'DECIMAL(5,2)', padrao: '30.00' },
      { nome: 'min_stock', tipo: 'INTEGER', padrao: '0' },
      { nome: 'barcode', tipo: 'VARCHAR(255)', padrao: 'NULL' },
      { nome: 'category', tipo: 'VARCHAR(100)', padrao: "'Geral'" },
      { nome: 'active', tipo: 'BOOLEAN', padrao: 'true' }
    ]
    
    for (const coluna of colunasNecessarias) {
      const { error: checkError } = await supabase
        .from('products')
        .select(coluna.nome)
        .limit(1)
      
      if (checkError && checkError.code === '42703') {
        console.log(`⚠️ Coluna ${coluna.nome} não encontrada, adicionando...`)
        
        const { error: alterError } = await supabase.rpc('exec_sql', {
          sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS ${coluna.nome} ${coluna.tipo} DEFAULT ${coluna.padrao};`
        })
        
        if (alterError) {
          console.error(`❌ Erro ao adicionar ${coluna.nome}:`, alterError.message)
        } else {
          console.log(`✅ Coluna ${coluna.nome} adicionada`)
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar products:', error.message)
  }
}

async function verificarECorrigirCustomers() {
  try {
    // Verificar se a coluna cpf_cnpj existe
    const { data, error } = await supabase
      .from('customers')
      .select('cpf_cnpj')
      .limit(1)
    
    if (error && error.code === '42703') {
      console.log('⚠️ Coluna cpf_cnpj não encontrada, adicionando...')
      
      const { error: alterError } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE customers ADD COLUMN IF NOT EXISTS cpf_cnpj VARCHAR(20);`
      })
      
      if (alterError) {
        console.error('❌ Erro ao adicionar cpf_cnpj:', alterError.message)
      } else {
        console.log('✅ Coluna cpf_cnpj adicionada com sucesso')
      }
    } else {
      console.log('✅ Coluna cpf_cnpj já existe')
    }
    
    // Verificar outras colunas necessárias para customers
    const colunasCustomers = [
      { nome: 'birth_date', tipo: 'DATE', padrao: 'NULL' },
      { nome: 'phone', tipo: 'VARCHAR(20)', padrao: 'NULL' },
      { nome: 'whatsapp', tipo: 'VARCHAR(20)', padrao: 'NULL' },
      { nome: 'address', tipo: 'TEXT', padrao: 'NULL' },
      { nome: 'city', tipo: 'VARCHAR(100)', padrao: 'NULL' },
      { nome: 'state', tipo: 'VARCHAR(2)', padrao: 'NULL' },
      { nome: 'zip_code', tipo: 'VARCHAR(10)', padrao: 'NULL' },
      { nome: 'delivery_notes', tipo: 'TEXT', padrao: 'NULL' },
      { nome: 'marketing_consent', tipo: 'BOOLEAN', padrao: 'false' }
    ]
    
    for (const coluna of colunasCustomers) {
      const { error: checkError } = await supabase
        .from('customers')
        .select(coluna.nome)
        .limit(1)
      
      if (checkError && checkError.code === '42703') {
        console.log(`⚠️ Coluna ${coluna.nome} não encontrada, adicionando...`)
        
        const { error: alterError } = await supabase.rpc('exec_sql', {
          sql: `ALTER TABLE customers ADD COLUMN IF NOT EXISTS ${coluna.nome} ${coluna.tipo} DEFAULT ${coluna.padrao};`
        })
        
        if (alterError) {
          console.error(`❌ Erro ao adicionar ${coluna.nome}:`, alterError.message)
        } else {
          console.log(`✅ Coluna ${coluna.nome} adicionada`)
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar customers:', error.message)
  }
}

async function verificarECriarSuppliers() {
  try {
    // Verificar se a tabela suppliers existe
    const { data, error } = await supabase
      .from('suppliers')
      .select('id')
      .limit(1)
    
    if (error && error.code === 'PGRST205') {
      console.log('⚠️ Tabela suppliers não encontrada, criando...')
      
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.suppliers (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            company_name VARCHAR(255),
            cnpj VARCHAR(18),
            contact_person VARCHAR(255),
            phone VARCHAR(20),
            whatsapp VARCHAR(20),
            email VARCHAR(255),
            website VARCHAR(255),
            address TEXT,
            city VARCHAR(100),
            state VARCHAR(2),
            zip_code VARCHAR(10),
            notes TEXT,
            active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          -- Criar índices
          CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
          CREATE INDEX IF NOT EXISTS idx_suppliers_cnpj ON suppliers(cnpj);
          CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(active);
          
          -- Inserir fornecedor padrão
          INSERT INTO suppliers (name, company_name, active) 
          VALUES ('Fornecedor Padrão', 'Fornecedor Padrão Ltda', true)
          ON CONFLICT DO NOTHING;
        `
      })
      
      if (createError) {
        console.error('❌ Erro ao criar tabela suppliers:', createError.message)
      } else {
        console.log('✅ Tabela suppliers criada com sucesso')
      }
    } else {
      console.log('✅ Tabela suppliers já existe')
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar suppliers:', error.message)
  }
}

async function verificarConfiguracaoSupabase() {
  try {
    // Verificar se as variáveis de ambiente estão configuradas
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('🔍 Verificando variáveis de ambiente...')
    console.log(`   SUPABASE_URL: ${supabaseUrl ? '✅ Configurada' : '❌ Não encontrada'}`)
    console.log(`   SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Configurada' : '❌ Não encontrada'}`)
    console.log(`   SUPABASE_SERVICE_KEY: ${supabaseServiceKey ? '✅ Configurada' : '❌ Não encontrada'}`)
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Variáveis de ambiente do Supabase não configuradas!')
      console.log('📝 Verifique o arquivo .env.local')
      return false
    }
    
    // Testar conexão
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (error) {
      console.error('❌ Erro de conexão com Supabase:', error.message)
      return false
    }
    
    console.log('✅ Conexão com Supabase funcionando')
    return true
    
  } catch (error) {
    console.error('❌ Erro ao verificar configuração:', error.message)
    return false
  }
}

// Executar correções
corrigirErrosSistema()