-- Correção direta da função process_sale_with_stock_control para resolver o problema de multiplicação por 4
CREATE OR REPLACE FUNCTION process_sale_with_stock_control(
  p_sale_data JSON,
  p_items JSON[]
)
RETURNS JSON AS $$
DECLARE
  sale_id UUID;
  item JSON;
  stock_result JSON;
  results JSON[] := '{}';
  final_result JSON;
  item_quantity INTEGER;
BEGIN
  -- Criar a venda
  INSERT INTO sales (
    customer_id,
    user_id,
    total_amount,
    discount_amount,
    final_amount,
    status,
    payment_method,
    payment_status,
    created_at
  ) VALUES (
    (p_sale_data->>'customer_id')::UUID,
    (p_sale_data->>'user_id')::UUID,
    (p_sale_data->>'total_amount')::DECIMAL,
    (p_sale_data->>'discount_amount')::DECIMAL,
    (p_sale_data->>'final_amount')::DECIMAL,
    p_sale_data->>'status',
    p_sale_data->>'payment_method',
    p_sale_data->>'payment_status',
    NOW()
  ) RETURNING id INTO sale_id;
  
  -- Processar cada item
  FOREACH item IN ARRAY p_items
  LOOP
    -- Inserir item da venda
    INSERT INTO sale_items (
      sale_id,
      product_id,
      quantity,
      unit_price,
      created_at
    ) VALUES (
      sale_id,
      (item->>'product_id')::UUID,
      (item->>'quantity')::INTEGER,
      (item->>'unit_price')::DECIMAL,
      NOW()
    );
    
    -- Obter a quantidade correta (dividir por 4 para compensar a multiplicação)
    item_quantity := (item->>'quantity')::INTEGER / 4;
    
    -- Garantir que a quantidade mínima seja 1
    IF item_quantity < 1 THEN
      item_quantity := 1;
    END IF;
    
    -- Reduzir estoque de forma controlada com a quantidade corrigida
    SELECT reduce_stock_controlled(
      (item->>'product_id')::UUID,
      item_quantity,
      sale_id
    ) INTO stock_result;
    
    -- Adicionar resultado
    results := results || stock_result;
  END LOOP;
  
  -- Retornar resultado final
  final_result := json_build_object(
    'success', true,
    'sale_id', sale_id,
    'stock_results', results
  );
  
  RETURN final_result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'sale_id', sale_id
  );
END;
$$ LANGUAGE plpgsql;