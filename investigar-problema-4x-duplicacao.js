const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pktmkpxvhuhfhirjhmjb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrdG1rcHh2aHVoZmhpcmpobWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzU5NzcsImV4cCI6MjA1MDU1MTk3N30.Ej8JQGFjLJGJaGlJme8QcMhdGUCaA8vgSsmedJGHJJE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigarProblema4xDuplicacao() {
    console.log('🔍 INVESTIGAÇÃO: Problema de 4x Duplication no Estoque');
    console.log('=' .repeat(60));

    try {
        // 1. Verificar se as funções de controle ainda existem
        console.log('\n1. Verificando funções de controle de estoque...');
        const { data: functions, error: funcError } = await supabase
            .rpc('exec_sql', {
                sql_query: `
                    SELECT routine_name, routine_type 
                    FROM information_schema.routines 
                    WHERE routine_schema = 'public' 
                    AND routine_name IN ('reduce_stock_controlled', 'process_sale_with_stock_control')
                    ORDER BY routine_name;
                `
            });

        if (funcError) {
            console.log('❌ Erro ao verificar funções:', funcError.message);
        } else {
            console.log('✅ Funções encontradas:', functions);
        }

        // 2. Verificar produto de teste
        console.log('\n2. Verificando produto de teste...');
        let { data: products, error: prodError } = await supabase
            .from('products')
            .select('*')
            .eq('name', 'Produto Teste Estoque')
            .limit(1);

        if (prodError) {
            console.log('❌ Erro ao buscar produto:', prodError.message);
            return;
        }

        let testProduct;
        if (!products || products.length === 0) {
            console.log('📦 Criando produto de teste...');
            const { data: newProduct, error: createError } = await supabase
                .from('products')
                .insert({
                    name: 'Produto Teste Estoque',
                    price: 10.00,
                    stock_quantity: 100,
                    min_stock: 5,
                    code: 'TEST-4X-' + Date.now()
                })
                .select()
                .single();

            if (createError) {
                console.log('❌ Erro ao criar produto:', createError.message);
                return;
            }
            testProduct = newProduct;
        } else {
            testProduct = products[0];
            // Resetar estoque para 100
            await supabase
                .from('products')
                .update({ stock_quantity: 100 })
                .eq('id', testProduct.id);
            testProduct.stock_quantity = 100;
        }

        console.log('✅ Produto de teste:', testProduct);

        // 3. Verificar estoque inicial
        console.log('\n3. Verificando estoque inicial...');
        const { data: initialStock } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', testProduct.id)
            .single();

        console.log(`📊 Estoque inicial: ${initialStock.stock_quantity} unidades`);

        // 4. Simular venda de 1 item usando o método atual do PDV
        console.log('\n4. Simulando venda de 1 item...');
        
        // Primeiro, vamos ver como o PDV atual está fazendo as vendas
        console.log('🔍 Verificando método atual do PDV...');
        
        // Simular inserção de venda
        const saleData = {
            user_id: '00000000-0000-0000-0000-000000000000', // UUID padrão para teste
            total_amount: 10.00,
            payment_method: 'cash',
            payment_status: 'completed'
        };

        const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert(saleData)
            .select()
            .single();

        if (saleError) {
            console.log('❌ Erro ao criar venda:', saleError.message);
            return;
        }

        console.log('✅ Venda criada:', sale);

        // Verificar estoque após criação da venda (antes dos itens)
        const { data: stockAfterSale } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', testProduct.id)
            .single();

        console.log(`📊 Estoque após venda (antes dos itens): ${stockAfterSale.stock_quantity} unidades`);

        // Simular inserção de item da venda
        const itemData = {
            sale_id: sale.id,
            product_id: testProduct.id,
            quantity: 1,
            unit_price: 10.00,
            total_price: 10.00
        };

        console.log('📝 Inserindo item da venda:', itemData);

        const { data: item, error: itemError } = await supabase
            .from('sale_items')
            .insert(itemData)
            .select()
            .single();

        if (itemError) {
            console.log('❌ Erro ao criar item:', itemError.message);
        } else {
            console.log('✅ Item criado:', item);
        }

        // 5. Verificar estoque final
        console.log('\n5. Verificando estoque final...');
        const { data: finalStock } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', testProduct.id)
            .single();

        console.log(`📊 Estoque final: ${finalStock.stock_quantity} unidades`);

        // 6. Calcular diferença
        const reduction = initialStock.stock_quantity - finalStock.stock_quantity;
        console.log(`\n📈 RESULTADO:`);
        console.log(`   Quantidade vendida: 1 unidade`);
        console.log(`   Redução real: ${reduction} unidades`);
        console.log(`   Multiplicação: ${reduction}x`);

        if (reduction === 1) {
            console.log('✅ CORRETO: Redução corresponde à quantidade vendida');
        } else {
            console.log(`❌ PROBLEMA: Redução de ${reduction}x detectada!`);
        }

        // 7. Verificar movimentações de estoque
        console.log('\n6. Verificando movimentações de estoque...');
        const { data: movements } = await supabase
            .from('stock_movements')
            .select('*')
            .eq('product_id', testProduct.id)
            .order('created_at', { ascending: false })
            .limit(10);

        console.log('📋 Últimas movimentações:', movements);

        // 8. Verificar triggers ativos
        console.log('\n7. Verificando triggers ativos...');
        const { data: triggers } = await supabase
            .rpc('exec_sql', {
                sql_query: `
                    SELECT 
                        trigger_name,
                        event_manipulation,
                        event_object_table,
                        action_statement,
                        action_timing
                    FROM information_schema.triggers 
                    WHERE event_object_table IN ('sale_items', 'sales', 'products')
                    ORDER BY event_object_table, trigger_name;
                `
            });

        console.log('🔧 Triggers ativos:', triggers);

        // 9. Limpeza
        console.log('\n8. Limpeza...');
        await supabase.from('sale_items').delete().eq('sale_id', sale.id);
        await supabase.from('sales').delete().eq('id', sale.id);
        
        console.log('✅ Limpeza concluída');

    } catch (error) {
        console.error('❌ Erro na investigação:', error);
    }
}

// Executar investigação
investigarProblema4xDuplicacao();