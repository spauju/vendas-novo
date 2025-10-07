const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Configuração do Supabase com Service Role Key para contornar RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testarMovimentacoesEstoque() {
  console.log('🧪 Iniciando teste de movimentações de estoque...\n')

  try {
    // 1. Verificar produtos existentes
    console.log('1. Verificando produtos existentes...')
    const { data: produtos, error: produtosError } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .limit(5)

    if (produtosError) {
      console.error('❌ Erro ao buscar produtos:', produtosError)
      return
    }

    if (!produtos || produtos.length === 0) {
      console.log('⚠️ Nenhum produto encontrado. Criando produto de teste...')
      
      const { data: novoProduto, error: criarError } = await supabase
          .from('products')
          .insert([{
            name: 'Produto Teste Estoque',
            code: `TESTE${Date.now()}`,
            sale_price: 10.00,
            stock_quantity: 100
          }])
          .select()

      if (criarError) {
        console.error('❌ Erro ao criar produto:', criarError)
        return
      }

      produtos.push(novoProduto[0])
      console.log('✅ Produto de teste criado:', novoProduto[0])
    }

    const produto = produtos[0]
    console.log(`✅ Usando produto: ${produto.name} (ID: ${produto.id}, Estoque atual: ${produto.stock_quantity})\n`)

    // 2. Testar movimentação de entrada
    console.log('2. Testando movimentação de ENTRADA (+10 unidades)...')
    const { data: movEntrada, error: entradaError } = await supabase
      .from('stock_movements')
      .insert([{
        product_id: produto.id,
        movement_type: 'entrada',
        quantity: 10,
        notes: 'Teste de entrada manual'
      }])
      .select()

    if (entradaError) {
      console.error('❌ Erro na movimentação de entrada:', entradaError)
    } else {
      console.log('✅ Movimentação de entrada registrada:', movEntrada[0])
    }

    // 3. Verificar estoque após entrada
    const { data: produtoAposEntrada } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', produto.id)
      .single()

    console.log(`📊 Estoque após entrada: ${produtoAposEntrada.stock_quantity}\n`)

    // 4. Testar movimentação de saída
    console.log('3. Testando movimentação de SAÍDA (-5 unidades)...')
    const { data: movSaida, error: saidaError } = await supabase
      .from('stock_movements')
      .insert([{
        product_id: produto.id,
        movement_type: 'saida',
        quantity: 5,
        notes: 'Teste de saída manual'
      }])
      .select()

    if (saidaError) {
      console.error('❌ Erro na movimentação de saída:', saidaError)
    } else {
      console.log('✅ Movimentação de saída registrada:', movSaida[0])
    }

    // 5. Verificar estoque após saída
    const { data: produtoAposSaida } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', produto.id)
      .single()

    console.log(`📊 Estoque após saída: ${produtoAposSaida.stock_quantity}\n`)

    // 6. Testar movimentação de ajuste
    console.log('4. Testando movimentação de AJUSTE (definir para 20 unidades)...')
    const { data: movAjuste, error: ajusteError } = await supabase
      .from('stock_movements')
      .insert([{
        product_id: produto.id,
        movement_type: 'ajuste',
        quantity: 20,
        notes: 'Teste de ajuste manual'
      }])
      .select()

    if (ajusteError) {
      console.error('❌ Erro na movimentação de ajuste:', ajusteError)
    } else {
      console.log('✅ Movimentação de ajuste registrada:', movAjuste[0])
    }

    // 7. Verificar estoque final
    const { data: produtoFinal } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', produto.id)
      .single()

    console.log(`📊 Estoque final: ${produtoFinal.stock_quantity}\n`)

    // 8. Listar todas as movimentações do produto
    console.log('5. Listando todas as movimentações do produto...')
    const { data: movimentacoes } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', produto.id)
      .order('created_at', { ascending: false })
      .limit(10)

    console.log('📋 Movimentações registradas:')
    movimentacoes.forEach((mov, index) => {
      console.log(`   ${index + 1}. ${mov.movement_type.toUpperCase()} - Qtd: ${mov.quantity} - Motivo: ${mov.notes} - Data: ${new Date(mov.created_at).toLocaleString()}`)
    })

    console.log('\n✅ Teste de movimentações concluído com sucesso!')

  } catch (error) {
    console.error('❌ Erro geral no teste:', error)
  }
}

// Executar o teste
testarMovimentacoesEstoque()