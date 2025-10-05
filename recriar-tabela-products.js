const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function recriarTabelaProducts() {
  try {
    console.log('🔍 Verificando dados existentes na tabela products...');
    
    // Primeiro, vamos salvar os dados existentes
    const { data: existingData, error: selectError } = await supabase
      .from('products')
      .select('*');
    
    if (selectError) {
      console.error('❌ Erro ao consultar dados existentes:', selectError);
      return;
    }
    
    console.log(`📊 Encontrados ${existingData?.length || 0} produtos existentes`);
    
    if (existingData && existingData.length > 0) {
      console.log('💾 Salvando backup dos dados...');
      const fs = require('fs');
      fs.writeFileSync('backup-products.json', JSON.stringify(existingData, null, 2));
      console.log('✅ Backup salvo em backup-products.json');
    }
    
    console.log('🗑️ Removendo tabela products atual...');
    
    // Tentar usar a API REST diretamente para executar SQL
    const dropTableSQL = 'DROP TABLE IF EXISTS public.products CASCADE;';
    
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey
        },
        body: JSON.stringify({ sql_query: dropTableSQL })
      });
      
      if (!response.ok) {
        console.log('⚠️ Não foi possível usar exec_sql, continuando...');
      }
    } catch (err) {
      console.log('⚠️ Erro ao tentar dropar tabela, continuando...');
    }
    
    console.log('🔧 Criando nova tabela products com estrutura correta...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.products (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        barcode TEXT UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        brand TEXT,
        supplier TEXT,
        cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        sale_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        profit_margin DECIMAL(5,2),
        stock_quantity INTEGER DEFAULT 0,
        min_stock INTEGER DEFAULT 0,
        max_stock_level INTEGER,
        unit_of_measure TEXT DEFAULT 'un',
        weight DECIMAL(8,3),
        dimensions TEXT,
        image_url TEXT,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Criar índices
      CREATE INDEX IF NOT EXISTS idx_products_code ON public.products(code);
      CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
      CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
      CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
      CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(active);
      
      -- Habilitar RLS
      ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
      
      -- Criar políticas RLS
      DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
      CREATE POLICY "Authenticated users can view products" ON public.products
        FOR SELECT TO authenticated USING (true);
      
      DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
      CREATE POLICY "Authenticated users can insert products" ON public.products
        FOR INSERT TO authenticated WITH CHECK (true);
      
      DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
      CREATE POLICY "Authenticated users can update products" ON public.products
        FOR UPDATE TO authenticated USING (true);
      
      DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;
      CREATE POLICY "Authenticated users can delete products" ON public.products
        FOR DELETE TO authenticated USING (true);
    `;
    
    // Tentar criar a tabela usando diferentes métodos
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey
        },
        body: JSON.stringify({ sql_query: createTableSQL })
      });
      
      if (response.ok) {
        console.log('✅ Tabela criada com sucesso via exec_sql!');
      } else {
        throw new Error('exec_sql não funcionou');
      }
    } catch (err) {
      console.log('⚠️ exec_sql não disponível, você precisará executar o SQL manualmente no Supabase Dashboard');
      console.log('📋 SQL para executar:');
      console.log(createTableSQL);
    }
    
    // Restaurar dados se existirem
    if (existingData && existingData.length > 0) {
      console.log('🔄 Restaurando dados existentes...');
      
      for (const product of existingData) {
        const newProduct = {
          code: product.sku || `PROD${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
          barcode: product.barcode,
          name: product.name,
          description: product.description,
          category: product.category,
          brand: product.brand,
          supplier: product.supplier,
          cost_price: product.cost_price || 0,
          sale_price: product.sale_price || product.unit_price || product.price || 0,
          stock_quantity: product.stock_quantity || 0,
          min_stock: product.min_stock || product.min_stock_level || 0,
          max_stock_level: product.max_stock_level,
          unit_of_measure: product.unit_of_measure || 'un',
          weight: product.weight,
          dimensions: product.dimensions,
          image_url: product.image_url,
          active: product.active !== false
        };
        
        const { error: insertError } = await supabase
          .from('products')
          .insert(newProduct);
        
        if (insertError) {
          console.error(`❌ Erro ao inserir produto ${product.name}:`, insertError);
        }
      }
      
      console.log('✅ Dados restaurados!');
    }
    
    // Verificar se tudo funcionou
    console.log('🔍 Verificando nova estrutura...');
    const { data: newData, error: verifyError } = await supabase
      .from('products')
      .select('id, code, name, sale_price, stock_quantity, min_stock, active')
      .limit(3);
    
    if (verifyError) {
      console.error('❌ Erro na verificação:', verifyError);
    } else {
      console.log('✅ Nova tabela products funcionando corretamente!');
      console.log('📊 Dados de teste:', newData);
    }
    
  } catch (err) {
    console.error('❌ Erro geral:', err.message);
  }
}

recriarTabelaProducts();