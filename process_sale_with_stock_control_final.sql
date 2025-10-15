-- Função para processar venda pelo PDV (baixa automática via trigger)
CREATE OR REPLACE FUNCTION process_sale_with_stock_control(
  p_sale_data JSON,
  p_items JSON[]
)
RETURNS JSON AS $$
DECLARE
  sale_id UUID;
  item JSON;
  results JSON[] := '{}';
  final_result JSON;
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
  
  -- Inserir cada item vendido (trigger faz a baixa automática)
  FOREACH item IN ARRAY p_items
  LOOP
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
    results := results || json_build_object('success', true, 'product_id', (item->>'product_id'), 'quantity', (item->>'quantity'));
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

-- O trigger em sale_items fará a baixa automática de estoque.
-- O módulo de estoque pode continuar permitindo baixas e inclusões manuais diretamente na tabela products.