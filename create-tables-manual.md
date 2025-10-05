# Criação das Tabelas no Supabase Dashboard

Para criar as tabelas do sistema PDV, siga estes passos:

1. Acesse o Supabase Dashboard: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá para "SQL Editor" no menu lateral
4. Execute os comandos SQL abaixo **um por vez**:

## 1. Extensão UUID
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

## 2. Tabela de Perfis
```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('admin', 'cashier', 'manager')) DEFAULT 'cashier',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 3. Tabela de Clientes
```sql
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  cpf_cnpj TEXT,
  birth_date DATE,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  delivery_notes TEXT,
  marketing_consent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 4. Tabela de Produtos
```sql
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  barcode TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  brand TEXT,
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  sale_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  profit_margin DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN cost_price > 0 THEN ((sale_price - cost_price) / cost_price * 100)
      ELSE 0
    END
  ) STORED,
  stock_quantity INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  image_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 5. Tabela de Vendas
```sql
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  final_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
  payment_method TEXT NOT NULL,
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'refunded')) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 6. Tabela de Itens da Venda
```sql
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 7. Tabela de Movimentações de Estoque
```sql
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES products(id) NOT NULL,
  type TEXT CHECK (type IN ('in', 'out', 'adjustment')) NOT NULL,
  quantity INTEGER NOT NULL,
  reason TEXT,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 8. Índices para Performance
```sql
CREATE INDEX IF NOT EXISTS idx_customers_cpf_cnpj ON customers(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);
```

## 9. Função para Atualizar updated_at
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';
```

## 10. Triggers para updated_at
```sql
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 11. Função para Criar Perfil Automaticamente
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 12. Habilitar RLS (Row Level Security)
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
```

## 13. Políticas RLS para Profiles
```sql
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

## 14. Políticas RLS para Customers
```sql
CREATE POLICY "Authenticated users can view customers" ON customers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert customers" ON customers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers" ON customers
  FOR UPDATE TO authenticated USING (true);
```

## 15. Políticas RLS para Products
```sql
CREATE POLICY "Authenticated users can view products" ON products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert products" ON products
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update products" ON products
  FOR UPDATE TO authenticated USING (true);
```

## 16. Políticas RLS para Sales
```sql
CREATE POLICY "Authenticated users can view sales" ON sales
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert sales" ON sales
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales" ON sales
  FOR UPDATE TO authenticated USING (true);
```

## 17. Políticas RLS para Sale Items
```sql
CREATE POLICY "Authenticated users can view sale items" ON sale_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert sale items" ON sale_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sale items" ON sale_items
  FOR DELETE TO authenticated USING (true);
```

## 18. Políticas RLS para Stock Movements
```sql
CREATE POLICY "Authenticated users can view stock movements" ON stock_movements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert stock movements" ON stock_movements
  FOR INSERT TO authenticated WITH CHECK (true);
```

## 19. Dados de Exemplo
```sql
INSERT INTO products (code, name, description, category, brand, cost_price, sale_price, stock_quantity, min_stock) VALUES
('001', 'Coca-Cola 350ml', 'Refrigerante Coca-Cola lata 350ml', 'Bebidas', 'Coca-Cola', 2.50, 4.00, 100, 10),
('002', 'Pão de Açúcar', 'Pão de açúcar tradicional', 'Padaria', 'Padaria Local', 0.30, 0.50, 200, 20),
('003', 'Leite Integral 1L', 'Leite integral UHT 1 litro', 'Laticínios', 'Parmalat', 3.20, 5.50, 50, 5),
('004', 'Arroz Branco 5kg', 'Arroz branco tipo 1, pacote 5kg', 'Grãos', 'Tio João', 12.00, 18.00, 30, 3),
('005', 'Feijão Preto 1kg', 'Feijão preto tipo 1, pacote 1kg', 'Grãos', 'Camil', 4.50, 7.00, 25, 5)
ON CONFLICT (code) DO NOTHING;
```

## Verificação Final
Após executar todos os comandos, verifique se as tabelas foram criadas executando:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

Você deve ver todas as tabelas listadas: profiles, customers, products, sales, sale_items, stock_movements.