require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Criar cliente com logging detalhado
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  },
  global: {
    headers: {
      'x-debug-mode': 'true'
    }
  }
});

async function investigarClientSupabase() {
  console.log('🔍 INVESTIGANDO CLIENTE SUPABASE E INTERCEPTADORES');
  console.log('='.repeat(60));
  
  try {
    // 1. Verificar configuração do cliente
    console.log('\n1️⃣ Verificando configuração do cliente Supabase...');
    console.log(`📊 URL: ${supabaseUrl}`);
    console.log(`📊 Service Key: ${supabaseServiceKey ? 'Configurada' : 'Não configurada'}`);
    
    // 2. Interceptar chamadas HTTP para detectar duplicação
    console.log('\n2️⃣ Configurando interceptação de chamadas HTTP...');
    
    const originalFetch = global.fetch;
    const httpCalls = [];
    let callCount = 0;
    
    global.fetch = async function(...args) {
      callCount++;
      const [url, options] = args;
      
      // Log apenas chamadas para o Supabase
      if (url && url.includes(supabaseUrl)) {
        const method = options?.method || 'GET';
        const body = options?.body;
        
        httpCalls.push({
          id: callCount,
          timestamp: new Date().toISOString(),
          method,
          url: url.replace(supabaseUrl, ''),
          body: body ? JSON.parse(body) : null,
          headers: options?.headers || {}
        });
        
        console.log(`   📡 HTTP ${callCount}: ${method} ${url.replace(supabaseUrl, '')}`);
        if (body && method !== 'GET') {
          console.log(`      Body: ${body.substring(0, 100)}${body.length > 100 ? '...' : ''}`);
        }
      }
      
      return originalFetch.apply(this, args);
    };

    // 3. Teste com monitoramento de chamadas
    console.log('\n3️⃣ Executando teste com monitoramento...');
    
    // Buscar produto
    const { data: testProduct, error: productError } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .gt('stock_quantity', 20)
      .limit(1)
      .single();

    if (productError || !testProduct) {
      console.log('❌ Produto não encontrado');
      return;
    }

    const estoqueInicial = testProduct.stock_quantity;
    console.log(`📦 Produto: ${testProduct.name} (Estoque: ${estoqueInicial})`);
    
    // Resetar contador de chamadas
    const initialCallCount = callCount;
    httpCalls.length = 0;

    // Criar venda
    console.log('\n📝 Criando venda...');
    const { data: testSale, error: saleError } = await supabase
      .from('sales')
      .insert({
        total_amount: 35.00,
        payment_method: 'cash',
        status: 'completed',
        payment_status: 'paid'
      })
      .select()
      .single();

    if (saleError) {
      console.error('❌ Erro ao criar venda:', saleError);
      return;
    }

    console.log(`✅ Venda criada: ${testSale.id}`);
    
    // Contar chamadas para criar venda
    const saleCallCount = callCount - initialCallCount;
    console.log(`📊 Chamadas HTTP para criar venda: ${saleCallCount}`);

    // Resetar para monitorar inserção do item
    const beforeItemCallCount = callCount;
    httpCalls.length = 0;

    // Inserir item com monitoramento detalhado
    console.log('\n📝 Inserindo item da venda...');
    const quantidadeTeste = 5;
    
    const { data: testItem, error: itemError } = await supabase
      .from('sale_items')
      .insert({
        sale_id: testSale.id,
        product_id: testProduct.id,
        quantity: quantidadeTeste,
        unit_price: 7.00
      })
      .select()
      .single();

    if (itemError) {
      console.error('❌ Erro ao inserir item:', itemError);
      return;
    }

    console.log(`✅ Item inserido: ${testItem.id}`);
    
    // Analisar chamadas HTTP para inserção do item
    const itemCallCount = callCount - beforeItemCallCount;
    console.log(`📊 Chamadas HTTP para inserir item: ${itemCallCount}`);
    
    console.log('\n📋 Detalhes das chamadas HTTP:');
    httpCalls.forEach((call, index) => {
      console.log(`   ${index + 1}. ${call.method} ${call.url}`);
      console.log(`      Timestamp: ${call.timestamp}`);
      if (call.body) {
        console.log(`      Body: ${JSON.stringify(call.body, null, 2).substring(0, 200)}...`);
      }
      
      // Detectar chamadas duplicadas
      const duplicates = httpCalls.filter(c => 
        c.method === call.method && 
        c.url === call.url && 
        JSON.stringify(c.body) === JSON.stringify(call.body) &&
        c.id !== call.id
      );
      
      if (duplicates.length > 0) {
        console.log(`      🚨 CHAMADA DUPLICADA! ${duplicates.length} duplicatas encontradas`);
      }
    });

    // Aguardar processamento
    console.log('\n⏳ Aguardando processamento...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verificar estoque
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    if (!updateError && updatedProduct) {
      const reducaoReal = estoqueInicial - updatedProduct.stock_quantity;
      console.log(`📊 Redução esperada: ${quantidadeTeste}`);
      console.log(`📊 Redução real: ${reducaoReal}`);
      
      if (reducaoReal !== quantidadeTeste) {
        console.log(`❌ DUPLICAÇÃO CONFIRMADA: ${reducaoReal / quantidadeTeste}x`);
        
        // Analisar se a duplicação vem das chamadas HTTP
        if (itemCallCount === 1) {
          console.log('   🔍 Apenas 1 chamada HTTP detectada - duplicação não vem do cliente');
          console.log('   🔍 Problema está no lado do servidor (triggers, funções, etc.)');
        } else if (itemCallCount > 1) {
          console.log(`   🔍 ${itemCallCount} chamadas HTTP detectadas - possível duplicação no cliente`);
        }
      } else {
        console.log('✅ Sem duplicação detectada');
      }
    }

    // 4. Verificar se há listeners ou hooks ativos
    console.log('\n4️⃣ Verificando listeners e hooks...');
    
    // Verificar se há subscriptions ativas
    const channels = supabase.getChannels();
    console.log(`📊 Channels ativos: ${channels.length}`);
    
    channels.forEach((channel, index) => {
      console.log(`   ${index + 1}. ${channel.topic}`);
      console.log(`      Estado: ${channel.state}`);
      console.log(`      Bindings: ${channel.bindings.length}`);
    });

    // 5. Testar com cliente limpo (sem interceptadores)
    console.log('\n5️⃣ Testando com cliente limpo...');
    
    // Restaurar fetch original
    global.fetch = originalFetch;
    
    // Criar novo cliente
    const cleanSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Teste rápido com cliente limpo
    const { data: cleanTestProduct, error: cleanProductError } = await cleanSupabase
      .from('products')
      .select('id, name, stock_quantity')
      .gt('stock_quantity', 25)
      .limit(1)
      .single();

    if (!cleanProductError && cleanTestProduct) {
      const cleanEstoqueInicial = cleanTestProduct.stock_quantity;
      
      // Criar venda com cliente limpo
      const { data: cleanSale, error: cleanSaleError } = await cleanSupabase
        .from('sales')
        .insert({
          total_amount: 15.00,
          payment_method: 'cash',
          status: 'completed',
          payment_status: 'paid'
        })
        .select()
        .single();

      if (!cleanSaleError) {
        // Inserir item com cliente limpo
        const { data: cleanItem, error: cleanItemError } = await cleanSupabase
          .from('sale_items')
          .insert({
            sale_id: cleanSale.id,
            product_id: cleanTestProduct.id,
            quantity: 2,
            unit_price: 7.50
          })
          .select()
          .single();

        if (!cleanItemError) {
          // Aguardar e verificar
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const { data: cleanFinalProduct } = await cleanSupabase
            .from('products')
            .select('stock_quantity')
            .eq('id', cleanTestProduct.id)
            .single();

          if (cleanFinalProduct) {
            const cleanReducao = cleanEstoqueInicial - cleanFinalProduct.stock_quantity;
            console.log(`📊 Cliente limpo - Redução: ${cleanReducao} (esperado: 2)`);
            
            if (cleanReducao !== 2) {
              console.log('❌ Duplicação persiste mesmo com cliente limpo');
              console.log('   🔍 Problema definitivamente no servidor');
            } else {
              console.log('✅ Cliente limpo funciona corretamente');
              console.log('   🔍 Problema pode estar nos interceptadores');
            }
          }

          // Limpeza do teste limpo
          await cleanSupabase.from('sale_items').delete().eq('id', cleanItem.id);
          await cleanSupabase.from('sales').delete().eq('id', cleanSale.id);
          await cleanSupabase
            .from('products')
            .update({ stock_quantity: cleanEstoqueInicial })
            .eq('id', cleanTestProduct.id);
        }
      }
    }

    // Limpeza principal
    console.log('\n🧹 Limpando dados de teste...');
    await supabase.from('sale_items').delete().eq('id', testItem.id);
    await supabase.from('sales').delete().eq('id', testSale.id);
    
    // Restaurar estoque
    await supabase
      .from('products')
      .update({ stock_quantity: estoqueInicial })
      .eq('id', testProduct.id);

    console.log('✅ Limpeza concluída');

    // 6. Análise final
    console.log('\n6️⃣ ANÁLISE FINAL...');
    console.log(`📊 Total de chamadas HTTP monitoradas: ${callCount}`);
    console.log(`📊 Chamadas para inserção de item: ${itemCallCount}`);
    
    if (itemCallCount === 1) {
      console.log('✅ Cliente Supabase não está duplicando chamadas');
      console.log('🔍 Problema está no servidor (banco de dados)');
    } else {
      console.log('❌ Cliente pode estar fazendo chamadas duplicadas');
      console.log('🔍 Verificar interceptadores, middleware ou configurações');
    }

  } catch (error) {
    console.error('❌ Erro durante investigação:', error);
  } finally {
    // Restaurar fetch original se ainda não foi restaurado
    if (global.fetch !== originalFetch) {
      global.fetch = originalFetch;
    }
  }
}

// Executar investigação
investigarClientSupabase();