require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verificarTriggersSaleItems() {
  console.log('🔍 VERIFICANDO TRIGGERS NA TABELA SALE_ITEMS');
  console.log('='.repeat(60));
  
  try {
    // 1. Verificar triggers específicos da tabela sale_items
    console.log('\n1️⃣ Triggers na tabela sale_items:');
    
    const { data: triggers, error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          t.tgname as trigger_name,
          p.proname as function_name,
          CASE t.tgenabled 
            WHEN 'O' THEN 'enabled'
            WHEN 'D' THEN 'disabled'
            WHEN 'R' THEN 'replica'
            WHEN 'A' THEN 'always'
            ELSE 'unknown'
          END as status,
          CASE t.tgtype & 2
            WHEN 0 THEN 'BEFORE'
            ELSE 'AFTER'
          END as timing,
          CASE t.tgtype & 28
            WHEN 4 THEN 'INSERT'
            WHEN 8 THEN 'DELETE'
            WHEN 16 THEN 'UPDATE'
            WHEN 12 THEN 'INSERT OR DELETE'
            WHEN 20 THEN 'INSERT OR UPDATE'
            WHEN 24 THEN 'DELETE OR UPDATE'
            WHEN 28 THEN 'INSERT OR DELETE OR UPDATE'
            ELSE 'UNKNOWN'
          END as events
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE n.nspname = 'public'
        AND c.relname = 'sale_items'
        AND NOT t.tgisinternal
        ORDER BY t.tgname;
      `
    });

    if (triggerError) {
      console.error('❌ Erro ao verificar triggers:', triggerError);
      return;
    }

    if (triggers && triggers.length > 0) {
      console.log(`📊 Total de triggers encontrados: ${triggers.length}`);
      
      triggers.forEach((trigger, index) => {
        console.log(`\n${index + 1}. ${trigger.trigger_name}`);
        console.log(`   Função: ${trigger.function_name}`);
        console.log(`   Status: ${trigger.status}`);
        console.log(`   Timing: ${trigger.timing}`);
        console.log(`   Eventos: ${trigger.events}`);
        
        if (trigger.function_name.includes('stock') || trigger.function_name.includes('sale')) {
          console.log('   🚨 ESTE TRIGGER AFETA ESTOQUE!');
        }
      });
      
      // Verificar se há duplicação
      const stockTriggers = triggers.filter(t => 
        t.function_name.includes('stock') || 
        t.function_name.includes('sale') ||
        t.events.includes('INSERT')
      );
      
      if (stockTriggers.length > 1) {
        console.log(`\n⚠️ PROBLEMA IDENTIFICADO: ${stockTriggers.length} triggers que podem afetar estoque!`);
        stockTriggers.forEach((trigger, index) => {
          console.log(`   ${index + 1}. ${trigger.trigger_name} → ${trigger.function_name}`);
        });
      }
      
    } else {
      console.log('❌ Nenhum trigger encontrado na tabela sale_items');
    }

    // 2. Verificar código das funções relacionadas a estoque
    console.log('\n2️⃣ Código das funções de estoque:');
    
    const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          proname as function_name,
          prosrc as function_body
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND (
          proname LIKE '%stock%' OR 
          proname LIKE '%sale%' OR
          prosrc LIKE '%stock_quantity%'
        )
        AND prokind = 'f'
        ORDER BY proname;
      `
    });

    if (funcError) {
      console.error('❌ Erro ao verificar funções:', funcError);
    } else if (functions && functions.length > 0) {
      console.log(`📊 Funções encontradas: ${functions.length}`);
      
      functions.forEach((func, index) => {
        console.log(`\n${index + 1}. ${func.function_name}`);
        
        // Verificar se a função modifica stock_quantity
        if (func.function_body.includes('stock_quantity')) {
          console.log('   🎯 MODIFICA ESTOQUE!');
          
          // Extrair linhas que modificam estoque
          const lines = func.function_body.split('\n');
          const stockLines = lines.filter(line => 
            line.includes('stock_quantity') && 
            (line.includes('UPDATE') || line.includes('SET'))
          );
          
          if (stockLines.length > 0) {
            console.log('   Operações de estoque:');
            stockLines.forEach(line => {
              console.log(`     ${line.trim()}`);
            });
          }
        }
      });
    }

    // 3. Teste específico de duplicação
    console.log('\n3️⃣ Teste de duplicação em tempo real:');
    
    // Buscar produto para teste
    const { data: testProduct, error: productError } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .gt('stock_quantity', 10)
      .limit(1)
      .single();

    if (productError || !testProduct) {
      console.log('❌ Não foi possível encontrar produto para teste');
      return;
    }

    console.log(`📦 Produto teste: ${testProduct.name} (Estoque: ${testProduct.stock_quantity})`);
    
    const estoqueInicial = testProduct.stock_quantity;
    const quantidadeTeste = 2;
    
    // Criar venda de teste
    const { data: testSale, error: saleError } = await supabase
      .from('sales')
      .insert({
        total_amount: 20.00,
        payment_method: 'cash',
        status: 'completed',
        payment_status: 'paid'
      })
      .select()
      .single();

    if (saleError) {
      console.error('❌ Erro ao criar venda teste:', saleError);
      return;
    }

    console.log(`✅ Venda teste criada: ${testSale.id}`);
    
    // Inserir item (isso deve disparar os triggers)
    const { data: testItem, error: itemError } = await supabase
      .from('sale_items')
      .insert({
        sale_id: testSale.id,
        product_id: testProduct.id,
        quantity: quantidadeTeste,
        unit_price: 10.00
      })
      .select()
      .single();

    if (itemError) {
      console.error('❌ Erro ao inserir item teste:', itemError);
      return;
    }

    console.log(`✅ Item inserido: ${quantidadeTeste} unidades`);
    
    // Aguardar processamento
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verificar estoque após inserção
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    if (updateError) {
      console.error('❌ Erro ao verificar estoque:', updateError);
    } else {
      const estoqueFinal = updatedProduct.stock_quantity;
      const reducaoReal = estoqueInicial - estoqueFinal;
      
      console.log(`📊 Estoque inicial: ${estoqueInicial}`);
      console.log(`📊 Estoque final: ${estoqueFinal}`);
      console.log(`📊 Redução esperada: ${quantidadeTeste}`);
      console.log(`📊 Redução real: ${reducaoReal}`);
      
      if (reducaoReal === quantidadeTeste) {
        console.log('✅ ESTOQUE CORRETO - Sem duplicação');
      } else if (reducaoReal > quantidadeTeste) {
        console.log(`❌ DUPLICAÇÃO DETECTADA - Excesso de ${reducaoReal - quantidadeTeste} unidades`);
        console.log(`   Multiplicador: ${reducaoReal / quantidadeTeste}x`);
      } else {
        console.log(`⚠️ REDUÇÃO INSUFICIENTE - Faltam ${quantidadeTeste - reducaoReal} unidades`);
      }
    }
    
    // Limpeza
    await supabase.from('sale_items').delete().eq('id', testItem.id);
    await supabase.from('sales').delete().eq('id', testSale.id);
    
    // Restaurar estoque
    await supabase
      .from('products')
      .update({ stock_quantity: estoqueInicial })
      .eq('id', testProduct.id);
    
    console.log('🧹 Limpeza concluída');

  } catch (error) {
    console.error('❌ Erro durante verificação:', error);
  }
}

// Executar verificação
verificarTriggersSaleItems();