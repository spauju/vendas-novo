-- Este script deve ser executado diretamente no console SQL do Supabase

-- 1. Verificar se existem usuários com button = 'cashier' nos metadados
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE raw_user_meta_data->>'button' = 'cashier';

-- 2. Remover o campo button dos metadados onde ele for 'cashier'
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data - 'button'
WHERE raw_user_meta_data->>'button' = 'cashier';

-- 3. Atualizar o campo role para 'user' onde for 'cashier'
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data, 
  '{role}', 
  '"user"'::jsonb
)
WHERE raw_user_meta_data->>'role' = 'cashier';

-- 4. Verificar se a coluna button existe na tabela profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles' 
AND column_name = 'button';

-- 5. Se a coluna button existir, alterar seu tipo para text
DO $$
BEGIN
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
    
    -- Alterar o tipo da coluna para text
    ALTER TABLE public.profiles 
    ALTER COLUMN button TYPE text;
    
    RAISE NOTICE 'Campo button corrigido com sucesso';
  ELSE
    RAISE NOTICE 'Campo button não encontrado na tabela profiles';
  END IF;
END $$;