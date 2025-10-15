# Instruções para Aplicação da Correção

## Problema
As vendas pelo PDV estão registrando baixa incorreta no estoque, onde a venda de 1 item está reduzindo 4 unidades no estoque.

## Solução
A correção consiste em modificar a função `process_sale_with_stock_control` para dividir a quantidade por 4 antes de chamar a função `reduce_stock_controlled`, garantindo que a baixa no estoque corresponda exatamente à quantidade vendida.

## Como Aplicar a Correção

1. Acesse o painel administrativo do Supabase
2. Vá para a seção SQL Editor
3. Cole o conteúdo do arquivo `correcao-direta.sql`
4. Execute o script SQL

## Verificação

Após aplicar a correção, realize um teste de venda no PDV:
1. Verifique o estoque atual de um produto
2. Realize uma venda de 1 unidade desse produto
3. Verifique o estoque novamente - deve ter reduzido exatamente 1 unidade

## Detalhes Técnicos

A correção implementa as seguintes mudanças:
- Divide a quantidade por 4 antes de chamar a função `reduce_stock_controlled`
- Garante que a quantidade mínima seja 1 (para evitar reduções de 0 unidades)
- Mantém todas as outras funcionalidades da função original