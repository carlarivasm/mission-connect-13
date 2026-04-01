

## Analytics de Acesso para o Admin

### O que será feito

Criar um sistema de rastreamento de visualizações de páginas e um painel no admin para exibir os dados.

### 1. Tabela `page_views` (migration)

```sql
CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  page text NOT NULL,        -- ex: 'dashboard', 'materiais', 'loja', 'calendario'
  page_detail text,          -- ex: categoria do material ('formação', 'oração', etc.)
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode inserir seus próprios acessos
CREATE POLICY "Users can insert own views" ON public.page_views
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Admins podem ler todos os acessos
CREATE POLICY "Admins can read all views" ON public.page_views
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
```

### 2. Hook `usePageTracking` — `src/hooks/usePageTracking.ts`

- Chamado em cada página protegida (Dashboard, Materiais, Loja, Calendario, Mapa, Galeria, Pesquisas, Organograma, Familia)
- Insere um registro em `page_views` com `user_id`, `page` e opcionalmente `page_detail`
-