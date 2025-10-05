-- Script para atualizar funções no banco de dados

-- Função para executar SQL dinâmico (caso não exista)
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS VOID AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se um usuário tem determinada permissão
CREATE OR REPLACE FUNCTION public.check_permission(
  p_user_id UUID,
  p_module TEXT,
  p_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_has_permission BOOLEAN;
BEGIN
  -- Obter o papel (role) do usuário
  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;
  
  IF v_role IS NULL THEN
    -- Verificar nos metadados do usuário
    SELECT (raw_user_meta_data->>'role')::TEXT INTO v_role 
    FROM auth.users 
    WHERE id = p_user_id;
  END IF;
  
  -- Se ainda for NULL, definir como 'user'
  IF v_role IS NULL THEN
    v_role := 'user';
  END IF;
  
  -- Verificar permissão
  EXECUTE format('SELECT %s FROM public.role_permissions WHERE role = $1 AND module = $2', p_permission)
  INTO v_has_permission
  USING v_role, p_module;
  
  RETURN COALESCE(v_has_permission, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter todas as permissões de um usuário
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_role TEXT;
  v_permissions JSON;
BEGIN
  -- Obter o papel (role) do usuário
  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;
  
  IF v_role IS NULL THEN
    -- Verificar nos metadados do usuário
    SELECT (raw_user_meta_data->>'role')::TEXT INTO v_role 
    FROM auth.users 
    WHERE id = p_user_id;
  END IF;
  
  -- Se ainda for NULL, definir como 'user'
  IF v_role IS NULL THEN
    v_role := 'user';
  END IF;
  
  -- Obter todas as permissões para o papel
  SELECT json_object_agg(module, json_build_object(
    'can_view', can_view,
    'can_create', can_create,
    'can_edit', can_edit,
    'can_delete', can_delete
  ))
  INTO v_permissions
  FROM public.role_permissions
  WHERE role = v_role;
  
  RETURN COALESCE(v_permissions, '{}'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para sincronizar usuários entre auth.users e profiles
CREATE OR REPLACE FUNCTION public.sync_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando um novo usuário é criado em auth.users
  IF TG_OP = 'INSERT' THEN
    -- Extrair role dos metadados ou usar 'user' como padrão
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      role,
      active
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
      TRUE
    )
    ON CONFLICT (id) DO NOTHING;
  
  -- Quando um usuário é atualizado em auth.users
  ELSIF TG_OP = 'UPDATE' THEN
    -- Atualizar o perfil correspondente
    UPDATE public.profiles
    SET
      email = NEW.email,
      full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      role = COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover o trigger se já existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Criar o trigger para sincronização automática
CREATE TRIGGER on_auth_user_created
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_profile();

-- Função para normalizar roles
CREATE OR REPLACE FUNCTION public.normalize_role(role_name TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Normalizar diferentes variações de papéis
  IF role_name IS NULL THEN
    RETURN 'user';
  ELSIF role_name IN ('admin', 'administrator', 'administrador') THEN
    RETURN 'administrador';
  ELSIF role_name IN ('manager', 'gerente') THEN
    RETURN 'gerente';
  ELSIF role_name IN ('user', 'usuario', 'usuário', 'cashier', 'caixa', 'button') THEN
    RETURN 'user';
  ELSE
    RETURN role_name;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;