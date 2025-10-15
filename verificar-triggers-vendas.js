require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verificarTriggersVendas() {
  console.log('🔍 Verificando triggers relacionados às vendas...');
  
  try {
    // Verificar se existem funções relacionadas a vendas
    console.log('\n1️⃣ Verificando funções do banco...');
    
    const { data: functions, error: funcError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            routine_name,
            routine_type,
            routine_definition
          FROM information_schema.routines 
          WHERE routine_schema = 'public' 
          AND (
            routine_name ILIKE '%sale%' OR 
            routine_name ILIKE '%venda%' OR 
            routine_name ILIKE '%stock%' OR
            routine_name ILIKE '%estoque%'
          )
          ORDER BY routine_name;
        `
      });

    if (funcError) {
      console.log('❌ Erro ao verificar funções (tentativa 1):', funcError.message);
      
      // Tentar método alternativo
      const { data: altFunctions, error: altError } = await supabase
        .from('pg_proc')
        .select('proname')
        .ilike('proname', '%sale%');
        
      if (altError) {
        console.log('❌ Erro ao verificar funções (tentativa 2):', altError.message);
      } else {
        console.log('✅ Funções encontradas (método alternativo):', altFunctions);
      }
    } else {
      console.log('✅ Funções encontradas:', functions);
    }

    // Verificar triggers
    console.log('\n2️⃣ Verificando triggers...');
    
    const { data: triggers, error: trigError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            trigger_name,
            event_manipulation,
            event_object_table,
            action_statement,
            action_timing
          FROM information_schema.triggers 
          WHERE trigger_schema = 'public'
          AND (
            event_object_table IN ('sales', 'sale_items') OR
            trigger_name ILIKE '%sale%' OR
            trigger_name ILIKE '%stock%' OR
            trigger_name ILIKE '%estoque%'
          )
          ORDER BY event_object_table, trigger_name;
        `
      });

    if (trigError) {
      console.log('❌ Erro ao verificar triggers:', trigError.message);
    } else {
      console.log('✅ Triggers encontrados:', triggers);
      
      if (!triggers || triggers.length === 0) {
        console.log('⚠️ PROBLEMA IDENTIFICADO: Nenhum trigger encontrado para vendas!');
      }
    }

    // Verificar se a função update_stock_on_sale existe
    console.log('\n3️⃣ Verificando função específica update_stock_on_sale...');
    
    const { data: stockFunction, error: stockFuncError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT EXISTS(
            SELECT 1 FROM pg_proc 
            WHERE proname = 'update_stock_on_sale'
          ) as function_exists;
        `
      });

    if (stockFuncError) {
      console.log('❌ Erro ao verificar função update_stock_on_sale:', stockFuncError.message);
    } else {
      console.log('📋 Função update_stock_on_sale existe:', stockFunction?.[0]?.function_exists || false);
    }

    // Verificar se a função reduce_stock_on_sale existe
    console.log('\n4️⃣ Verificando função específica reduce_stock_on_sale...');
    
    const { data: reduceFunction, error: reduceFuncError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT EXISTS(
            SELECT 1 FROM pg_proc 
            WHERE proname = 'reduce_stock_on_sale'
          ) as function_exists;
        `
      });

    if (reduceFuncError) {
      console.log('❌ Erro ao verificar função reduce_stock_on_sale:', reduceFuncError.message);
    } else {
      console.log('📋 Função reduce_stock_on_sale existe:', reduceFunction?.[0]?.function_exists || false);
    }

    // Listar todas as funções disponíveis
    console.log('\n5️⃣ Listando todas as funções disponíveis...');
    
    const { data: allFunctions, error: allFuncError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT proname as function_name
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public'
          AND proname NOT LIKE 'pg_%'
          ORDER BY proname;
        `
      });

    if (allFuncError) {
      console.log('❌ Erro ao listar funções:', allFuncError.message);
    } else {
      console.log('📋 Todas as funções disponíveis:');
      allFunctions?.forEach(func => {
        console.log(`   - ${func.function_name}`);
      });
    }

    // Verificar se há triggers na tabela sale_items
    console.log('\n6️⃣ Verificando triggers específicos na tabela sale_items...');
    
    const { data: saleItemsTriggers, error: saleItemsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            t.trigger_name,
            t.event_manipulation,
            t.action_timing,
            t.action_statement
          FROM information_schema.triggers t
          WHERE t.event_object_table = 'sale_items'
          AND t.trigger_schema = 'public';
        `
      });

    if (saleItemsError) {
      console.log('❌ Erro ao verificar triggers de sale_items:', saleItemsError.message);
    } else {
      console.log('📋 Triggers na tabela sale_items:');
      if (!saleItemsTriggers || saleItemsTriggers.length === 0) {
        console.log('   ⚠️ NENHUM TRIGGER ENCONTRADO na tabela sale_items!');
        console.log('   📝 Isso explica por que o estoque não está sendo reduzido.');
      } else {
        saleItemsTriggers.forEach(trigger => {
          console.log(`   - ${trigger.trigger_name}: ${trigger.event_manipulation} ${trigger.action_timing}`);
          console.log(`     Ação: ${trigger.action_statement}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

verificarTriggersVendas();