-- =====================================================
-- SCRIPT PARA CRIAR TRIGGERS DE BAIXA AUTOMÁTICA NO ESTOQUE
-- =====================================================
-- Este script cria triggers que automaticamente reduzem o estoque
-- quando um item é vendido (inserido na tabela sale_items)
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 INICIANDO CRIAÇÃO DE TRIGGERS PARA BAIXA AUTOMÁTICA NO ESTOQUE';
    RAISE NOTICE '====================================================================';
END $$;

-- 1. Função para reduzir estoque quando um item de venda é inserido
CREATE OR REPLACE FUNCTION update_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar se o produto existe
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = NEW.product_id) THEN
        RAISE EXCEPTION 'Produto com ID % não encontrado', NEW.product_id;
    END IF;
    
    -- Reduzir o estoque
    UPDATE public.products 
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.product_id;
    
    -- Verificar se há estoque suficiente (após a redução)
    IF (SELECT stock_quantity FROM public.products WHERE id = NEW.product_id) < 0 THEN
        RAISE EXCEPTION 'Estoque insuficiente para o produto ID %. Quantidade disponível: %', 
            NEW.product_id, 
            (SELECT stock_quantity + NEW.quantity FROM public.products WHERE id = NEW.product_id);
    END IF;
    
    -- Registrar movimento de estoque
    INSERT INTO public.stock_movements (
        product_id,
        movement_type,
        quantity,
        notes,
        user_id,
        created_at
    ) VALUES (
        NEW.product_id,
        'saida',
        NEW.quantity,
        'Venda - Sale ID: ' || NEW.sale_id,
        (SELECT user_id FROM public.sales WHERE id = NEW.sale_id),
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Função para reverter estoque quando um item de venda é deletado
CREATE OR REPLACE FUNCTION revert_stock_on_sale_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar se o produto existe
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = OLD.product_id) THEN
        RAISE EXCEPTION 'Produto com ID % não encontrado', OLD.product_id;
    END IF;
    
    -- Reverter o estoque (adicionar de volta)
    UPDATE public.products 
    SET stock_quantity = stock_quantity + OLD.quantity
    WHERE id = OLD.product_id;
    
    -- Registrar movimento de estoque
    INSERT INTO public.stock_movements (
        product_id,
        movement_type,
        quantity,
        notes,
        user_id,
        created_at
    ) VALUES (
        OLD.product_id,
        'entrada',
        OLD.quantity,
        'Cancelamento de venda - Sale ID: ' || OLD.sale_id,
        (SELECT user_id FROM public.sales WHERE id = OLD.sale_id),
        NOW()
    );
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 3. Função para ajustar estoque quando um item de venda é atualizado
CREATE OR REPLACE FUNCTION adjust_stock_on_sale_update()
RETURNS TRIGGER AS $$
DECLARE
    quantity_diff INTEGER;
BEGIN
    -- Calcular diferença na quantidade
    quantity_diff := NEW.quantity - OLD.quantity;
    
    -- Se não houve mudança na quantidade, não fazer nada
    IF quantity_diff = 0 THEN
        RETURN NEW;
    END IF;
    
    -- Verificar se o produto existe
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = NEW.product_id) THEN
        RAISE EXCEPTION 'Produto com ID % não encontrado', NEW.product_id;
    END IF;
    
    -- Ajustar o estoque
    UPDATE public.products 
    SET stock_quantity = stock_quantity - quantity_diff
    WHERE id = NEW.product_id;
    
    -- Verificar se há estoque suficiente (após o ajuste)
    IF quantity_diff > 0 THEN
        IF (SELECT stock_quantity FROM public.products WHERE id = NEW.product_id) < 0 THEN
            RAISE EXCEPTION 'Estoque insuficiente para o produto ID %. Quantidade disponível: %', 
                NEW.product_id, 
                (SELECT stock_quantity + quantity_diff FROM public.products WHERE id = NEW.product_id);
        END IF;
        
        -- Registrar movimento de estoque
        IF quantity_diff > 0 THEN
            -- Mais produtos vendidos (saída adicional)
            INSERT INTO public.stock_movements (
                product_id,
                movement_type,
                quantity,
                notes,
                user_id,
                created_at
            ) VALUES (
                NEW.product_id,
                'saida',
                quantity_diff,
                'Ajuste de venda - Sale ID: ' || NEW.sale_id,
                (SELECT user_id FROM public.sales WHERE id = NEW.sale_id),
                NOW()
            );
        ELSE
            -- Menos produtos vendidos (entrada para reverter)
            INSERT INTO public.stock_movements (
                product_id,
                movement_type,
                quantity,
                notes,
                user_id,
                created_at
            ) VALUES (
                NEW.product_id,
                'entrada',
                ABS(quantity_diff),
                'Ajuste de venda - Sale ID: ' || NEW.sale_id,
                (SELECT user_id FROM public.sales WHERE id = NEW.sale_id),
                NOW()
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. A tabela stock_movements já existe no banco com a seguinte estrutura:
-- CREATE TABLE public.stock_movements (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
--   user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
--   movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('entrada', 'saida', 'ajuste')),
--   quantity INTEGER NOT NULL,
--   previous_stock INTEGER NOT NULL DEFAULT 0,
--   new_stock INTEGER NOT NULL DEFAULT 0,
--   unit_cost DECIMAL(10,2),
--   total_cost DECIMAL(10,2),
--   reference_id UUID,
--   reference_type VARCHAR(50),
--   notes TEXT,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- Verificar se os índices existem, se não, criar
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON public.stock_movements(movement_type);

-- Habilitar RLS para stock_movements
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para stock_movements se não existirem
DO $$
BEGIN
    -- Política para SELECT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'stock_movements' 
        AND policyname = 'Authenticated users can view stock movements'
    ) THEN
        CREATE POLICY "Authenticated users can view stock movements" ON public.stock_movements
        FOR SELECT TO authenticated USING (true);
    END IF;

    -- Política para INSERT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'stock_movements' 
        AND policyname = 'Authenticated users can insert stock movements'
    ) THEN
        CREATE POLICY "Authenticated users can insert stock movements" ON public.stock_movements
        FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
END $$;

-- 5. Remover triggers existentes se houver
DROP TRIGGER IF EXISTS trigger_update_stock_on_sale_insert ON public.sale_items;
DROP TRIGGER IF EXISTS trigger_revert_stock_on_sale_delete ON public.sale_items;
DROP TRIGGER IF EXISTS trigger_adjust_stock_on_sale_update ON public.sale_items;

-- 6. Criar os triggers
-- Trigger para quando um item de venda é inserido (baixa no estoque)
CREATE TRIGGER trigger_update_stock_on_sale_insert
    AFTER INSERT ON public.sale_items
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_on_sale();

-- Trigger para quando um item de venda é deletado (reverter estoque)
CREATE TRIGGER trigger_revert_stock_on_sale_delete
    AFTER DELETE ON public.sale_items
    FOR EACH ROW
    EXECUTE FUNCTION revert_stock_on_sale_delete();

-- Trigger para quando um item de venda é atualizado (ajustar estoque)
CREATE TRIGGER trigger_adjust_stock_on_sale_update
    AFTER UPDATE ON public.sale_items
    FOR EACH ROW
    EXECUTE FUNCTION adjust_stock_on_sale_update();

-- 7. Verificação final
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ TRIGGERS DE BAIXA AUTOMÁTICA NO ESTOQUE CRIADOS COM SUCESSO!';
    RAISE NOTICE '====================================================================';
    RAISE NOTICE 'Funcionalidades implementadas:';
    RAISE NOTICE '- trigger_update_stock_on_sale_insert: Reduz estoque quando venda é inserida';
    RAISE NOTICE '- trigger_revert_stock_on_sale_delete: Reverte estoque quando venda é cancelada';
    RAISE NOTICE '- trigger_adjust_stock_on_sale_update: Ajusta estoque quando venda é atualizada';
    RAISE NOTICE 'Tabela stock_movements criada para rastrear movimentações';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 PRÓXIMOS PASSOS:';
    RAISE NOTICE '1. Execute o script corrigir-sale-items-manual.sql primeiro';
    RAISE NOTICE '2. Depois execute este script';
    RAISE NOTICE '3. Teste uma venda no PDV para verificar se o estoque é reduzido automaticamente';
    RAISE NOTICE '';
END $$;