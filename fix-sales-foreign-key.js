const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixSalesForeignKey() {
  try {
    console.log('=== Corrigindo Foreign Key da tabela SALES ===\n');
    
    // 1. Verificar estrutura atual da tabela sales
    console.log('1. Verificando estrutura atual da tabela sales:');
    const { data: tableInfo, error: tableError } = await supabase.rpc('get_table_info', {
      table_name: 'sales'
    });
    
    if (tableError) {
      console.log('Usando query alternativa para verificar estrutura...');
      
      // Query SQL direta para verificar a estrutura
      const sqlQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sales'
        ORDER BY ordinal_position;
      `;
      
      const { data: columns, error: columnsError } = await supabase.rpc('exec_sql', {
        sql: sqlQuery
      });
      
      if (columnsError) {
        console.log('❌ Erro ao verificar estrutura:', columnsError);
      } else {
        console.log('✅ Estrutura da tabela sales:', columns);
      }
    }
    
    // 2. Verificar foreign keys existentes
    console.log('\n2. Verificando foreign keys existentes:');
    const fkQuery = `
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'sales';
    `;
    
    const { data: fkData, error: fkError } = await supabase.rpc('exec_sql', {
      sql: fkQuery
    });
    
    if (fkError) {
      console.log('❌ Erro ao verificar foreign keys:', fkError);
    } else {
      console.log('✅ Foreign keys encontradas:', fkData);
    }
    
    // 3. Adicionar foreign key para profiles se não existir
    console.log('\n3. Adicionando foreign key para profiles:');
    const addFkSql = `
      -- Primeiro, verificar se a coluna user_id existe
      DO $$
      BEGIN
        -- Adicionar foreign key constraint se não existir
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'sales_user_id_fkey' 
          AND table_name = 'sales'
        ) THEN
          -- Tentar adicionar constraint para profiles
          BEGIN
            ALTER TABLE public.sales 
            ADD CONSTRAINT sales_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES public.profiles(id);
            
            RAISE NOTICE 'Foreign key para profiles adicionada com sucesso';
          EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao adicionar FK para profiles: %', SQLERRM;
            
            -- Se falhar, tentar para auth.users
            BEGIN
              ALTER TABLE public.sales 
              ADD CONSTRAINT sales_user_id_fkey 
              FOREIGN KEY (user_id) REFERENCES auth.users(id);
              
              RAISE NOTICE 'Foreign key para auth.users adicionada com sucesso';
            EXCEPTION WHEN OTHERS THEN
              RAISE NOTICE 'Erro ao adicionar FK para auth.users: %', SQLERRM;
            END;
          END;
        ELSE
          RAISE NOTICE 'Foreign key já existe';
        END IF;
      END $$;
    `;
    
    const { data: addFkResult, error: addFkError } = await supabase.rpc('exec_sql', {
      sql: addFkSql
    });
    
    if (addFkError) {
      console.log('❌ Erro ao adicionar foreign key:', addFkError);
    } else {
      console.log('✅ Resultado:', addFkResult);
    }
    
    // 4. Testar novamente o join
    console.log('\n4. Testando join após correção:');
    const { data: testData, error: testError } = await supabase
      .from('sales')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          email
        )
      `)
      .limit(1);
    
    if (testError) {
      console.log('❌ Join ainda não funciona:', testError);
    } else {
      console.log('✅ Join com profiles agora funciona!');
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

fixSalesForeignKey();