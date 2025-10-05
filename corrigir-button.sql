-- Corrigir o campo button na tabela profiles
DO $$
BEGIN
  -- Verificar se a coluna button existe na tabela profiles
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'button'
  ) THEN
    -- Atualizar valores 'cashier' para 'user'
    UPDATE public.profiles 
    SET button = 'user' 
    WHERE button = 'cashier';
    
    -- Alterar o tipo da coluna para text se for varchar
    ALTER TABLE public.profiles 
    ALTER COLUMN button TYPE text;
    
    RAISE NOTICE 'Campo button corrigido com sucesso';
  ELSE
    RAISE NOTICE 'Campo button não encontrado na tabela profiles';
  END IF;
END $$;