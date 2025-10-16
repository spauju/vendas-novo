-- Script para identificar e limpar perfis duplicados

-- 1. Verificar se há perfis duplicados
SELECT id, email, COUNT(*) as total
FROM profiles
GROUP BY id, email
HAVING COUNT(*) > 1;

-- 2. Ver todos os perfis duplicados (se houver)
SELECT *
FROM profiles
WHERE id IN (
  SELECT id
  FROM profiles
  GROUP BY id
  HAVING COUNT(*) > 1
)
ORDER BY id, created_at;

-- 3. Remover duplicatas mantendo apenas o mais recente
-- ATENÇÃO: Execute apenas se confirmar que há duplicatas!
-- Descomente as linhas abaixo para executar:

/*
DELETE FROM profiles
WHERE ctid NOT IN (
  SELECT MAX(ctid)
  FROM profiles
  GROUP BY id
);
*/

-- 4. Verificar resultado
SELECT COUNT(*) as total_perfis, COUNT(DISTINCT id) as perfis_unicos
FROM profiles;

-- 5. Adicionar constraint para evitar duplicatas no futuro
-- (Se ainda não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_id_unique'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_id_unique UNIQUE (id);
  END IF;
END $$;
