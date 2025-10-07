const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Definida' : 'Não definida');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? 'Definida' : 'Não definida');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarStockMovements() {
  console.log('🔍 Verificando tabela stock_movements...');
  console.log('📡 URL Supabase:', supabaseUrl);
  
  try {
    // 1. Tentar fazer uma query simples na tabela
    console.log('\n1️⃣ Testando acesso à tabela...');
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao acessar tabela stock_movements:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      // Se a tabela não existe, vamos tentar criar
      if (error.code === 'PGRST106' || error.message.includes('does not exist')) {
        console.log('\n2️⃣ Tabela não existe. Tentando criar...');
        await criarTabelaStockMovements();
      }
    } else {
      console.log('✅ Tabela stock_movements existe e é acessível');
      if (data && data.length > 0) {
        console.log('📊 Exemplo de dados:', data[0]);
      } else {
        console.log('📊 Tabela existe mas está vazia');
      }
    }
    
    // 2. Testar inserção de dados
    console.log('\n3️⃣ Testando inserção de dados...');
    await testarInsercao();
    
  } catch (err) {
    console.error('❌ Erro geral:', err.message);
  }
}

async function criarTabelaStockMovements() {
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.stock_movements (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
          user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
          movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('entrada', 'saida', 'ajuste')),
          quantity INTEGER NOT NULL,
          previous_stock INTEGER NOT NULL DEFAULT 0,
          new_stock INTEGER NOT NULL DEFAULT 0,
          unit_cost DECIMAL(10,2),
          reference_id UUID,
          reference_type VARCHAR(50),
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Índices
        CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements(product_id);
        CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at);
        CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON public.stock_movements(movement_type);
        
        -- RLS
        ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
        
        -- Políticas
        CREATE POLICY IF NOT EXISTS "Authenticated users can view stock movements" ON public.stock_movements
        FOR SELECT TO authenticated USING (true);
        
        CREATE POLICY IF NOT EXISTS "Authenticated users can insert stock movements" ON public.stock_movements
        FOR INSERT TO authenticated WITH CHECK (true);
      `
    });
    
    if (error) {
      console.error('❌ Erro ao criar tabela:', error);
    } else {
      console.log('✅ Tabela stock_movements criada com sucesso');
    }
  } catch (err) {
    console.error('❌ Erro ao executar SQL:', err.message);
  }
}

async function testarInsercao() {
  try {
    // Primeiro, vamos buscar um produto para usar como teste
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id')
      .limit(1);
    
    if (productsError || !products || products.length === 0) {
      console.log('⚠️ Nenhum produto encontrado para teste');
      return;
    }
    
    const productId = products[0].id;
    
    // Tentar inserir uma movimentação de teste
    const { data, error } = await supabase
      .from('stock_movements')
      .insert({
        product_id: productId,
        movement_type: 'entrada',
        quantity: 1,
        notes: 'Teste de inserção',
        user_id: '00000000-0000-0000-0000-000000000000' // UUID temporário para teste
      })
      .select();
    
    if (error) {
      console.error('❌ Erro ao inserir movimentação de teste:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
    } else {
      console.log('✅ Inserção de teste bem-sucedida:', data);
      
      // Limpar o registro de teste
      if (data && data[0]) {
        await supabase
          .from('stock_movements')
          .delete()
          .eq('id', data[0].id);
        console.log('🧹 Registro de teste removido');
      }
    }
  } catch (err) {
    console.error('❌ Erro no teste de inserção:', err.message);
  }
}

verificarStockMovements();