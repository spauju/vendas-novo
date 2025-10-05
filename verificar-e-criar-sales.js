const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verificarECriarTabelas() {
  console.log('🔍 Verificando existência das tabelas...\n');

  try {
    // 1. Verificar se a tabela sales existe
    console.log('1️⃣ Verificando tabela sales...');
    const { data: salesCheck, error: salesError } = await supabase
      .from('sales')
      .select('count')
      .limit(1);

    if (salesError && salesError.code === 'PGRST205') {
      console.log('❌ Tabela sales não existe, criando...');
      await criarTabelaSales();
    } else if (salesError) {
      console.error('❌ Erro ao verificar tabela sales:', salesError);
    } else {
      console.log('✅ Tabela sales já existe');
    }

    // 2. Verificar se a tabela sale_items existe
    console.log('\n2️⃣ Verificando tabela sale_items...');
    const { data: itemsCheck, error: itemsError } = await supabase
      .from('sale_items')
      .select('count')
      .limit(1);

    if (itemsError && itemsError.code === 'PGRST205') {
      console.log('❌ Tabela sale_items não existe, criando...');
      await criarTabelaSaleItems();
    } else if (itemsError) {
      console.error('❌ Erro ao verificar tabela sale_items:', itemsError);
    } else {
      console.log('✅ Tabela sale_items já existe');
    }

    // 3. Verificar políticas RLS
    console.log('\n3️⃣ Verificando políticas RLS...');
    await verificarPoliticasRLS();

    // 4. Testar inserção de dados de exemplo
    console.log('\n4️⃣ Testando funcionalidade das tabelas...');
    await testarTabelas();

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

async function criarTabelaSales() {
  const sqlSales = `
    -- Criar tabela sales
    CREATE TABLE IF NOT EXISTS public.sales (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
      total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      discount_amount DECIMAL(10,2) DEFAULT 0,
      final_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      payment_method VARCHAR(50) DEFAULT 'dinheiro',
      status VARCHAR(20) DEFAULT 'completed',
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Criar índices
    CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales(user_id);
    CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);
    CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);
    CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);

    -- Trigger para updated_at
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_sales_updated_at 
      BEFORE UPDATE ON public.sales 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- Habilitar RLS
    ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

    -- Políticas RLS para sales
    DROP POLICY IF EXISTS "Users can view their own sales" ON public.sales;
    CREATE POLICY "Users can view their own sales" ON public.sales
      FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can insert their own sales" ON public.sales;
    CREATE POLICY "Users can insert their own sales" ON public.sales
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can update their own sales" ON public.sales;
    CREATE POLICY "Users can update their own sales" ON public.sales
      FOR UPDATE USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Admins can view all sales" ON public.sales;
    CREATE POLICY "Admins can view all sales" ON public.sales
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role IN ('administrador', 'gerente')
        )
      );

    DROP POLICY IF EXISTS "Admins can delete sales" ON public.sales;
    CREATE POLICY "Admins can delete sales" ON public.sales
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role = 'administrador'
        )
      );
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: sqlSales });
    if (error) {
      console.error('❌ Erro ao criar tabela sales:', error);
      return false;
    }
    console.log('✅ Tabela sales criada com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao executar SQL para sales:', error);
    return false;
  }
}

async function criarTabelaSaleItems() {
  const sqlSaleItems = `
    -- Criar tabela sale_items
    CREATE TABLE IF NOT EXISTS public.sale_items (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
      product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price DECIMAL(10,2) NOT NULL,
      total_price DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Criar índices
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items(product_id);

    -- Trigger para updated_at
    CREATE TRIGGER update_sale_items_updated_at 
      BEFORE UPDATE ON public.sale_items 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- Habilitar RLS
    ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

    -- Políticas RLS para sale_items
    DROP POLICY IF EXISTS "Users can view their own sale items" ON public.sale_items;
    CREATE POLICY "Users can view their own sale items" ON public.sale_items
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.sales 
          WHERE id = sale_id AND user_id = auth.uid()
        )
      );

    DROP POLICY IF EXISTS "Users can insert their own sale items" ON public.sale_items;
    CREATE POLICY "Users can insert their own sale items" ON public.sale_items
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.sales 
          WHERE id = sale_id AND user_id = auth.uid()
        )
      );

    DROP POLICY IF EXISTS "Users can update their own sale items" ON public.sale_items;
    CREATE POLICY "Users can update their own sale items" ON public.sale_items
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.sales 
          WHERE id = sale_id AND user_id = auth.uid()
        )
      );

    DROP POLICY IF EXISTS "Admins can view all sale items" ON public.sale_items;
    CREATE POLICY "Admins can view all sale items" ON public.sale_items
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role IN ('administrador', 'gerente')
        )
      );

    DROP POLICY IF EXISTS "Admins can delete sale items" ON public.sale_items;
    CREATE POLICY "Admins can delete sale items" ON public.sale_items
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role = 'administrador'
        )
      );
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: sqlSaleItems });
    if (error) {
      console.error('❌ Erro ao criar tabela sale_items:', error);
      return false;
    }
    console.log('✅ Tabela sale_items criada com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao executar SQL para sale_items:', error);
    return false;
  }
}

async function verificarPoliticasRLS() {
  try {
    // Verificar se RLS está habilitado
    const { data: rlsCheck, error: rlsError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT schemaname, tablename, rowsecurity 
          FROM pg_tables 
          WHERE tablename IN ('sales', 'sale_items') 
          AND schemaname = 'public';
        `
      });

    if (rlsError) {
      console.error('❌ Erro ao verificar RLS:', rlsError);
    } else {
      console.log('✅ Status RLS verificado');
    }

    // Verificar políticas existentes
    const { data: policies, error: policiesError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
          FROM pg_policies 
          WHERE tablename IN ('sales', 'sale_items') 
          AND schemaname = 'public';
        `
      });

    if (policiesError) {
      console.error('❌ Erro ao verificar políticas:', policiesError);
    } else {
      console.log('✅ Políticas RLS verificadas');
    }

  } catch (error) {
    console.error('❌ Erro ao verificar RLS:', error);
  }
}

async function testarTabelas() {
  try {
    // Testar consulta básica na tabela sales
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('count')
      .limit(1);

    if (salesError) {
      console.error('❌ Erro ao testar tabela sales:', salesError);
    } else {
      console.log('✅ Tabela sales funcionando corretamente');
    }

    // Testar consulta básica na tabela sale_items
    const { data: itemsData, error: itemsError } = await supabase
      .from('sale_items')
      .select('count')
      .limit(1);

    if (itemsError) {
      console.error('❌ Erro ao testar tabela sale_items:', itemsError);
    } else {
      console.log('✅ Tabela sale_items funcionando corretamente');
    }

  } catch (error) {
    console.error('❌ Erro ao testar tabelas:', error);
  }
}

// Executar o script
verificarECriarTabelas()
  .then(() => {
    console.log('\n🎉 Verificação e criação de tabelas concluída!');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Verifique se as tabelas foram criadas corretamente');
    console.log('2. Teste o dashboard para ver se o erro foi resolvido');
    console.log('3. Se ainda houver problemas, execute o SQL manualmente no Supabase SQL Editor');
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });