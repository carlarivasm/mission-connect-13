Funcionalidade de Inscrição para Missões

### Resumo

Criar sistema completo de inscrição em missões: tabelas no banco, popup automático no dashboard, card de próxima missão, e painel admin para gerenciar missões e visualizar inscritos.

### 1. Migração de banco de dados

Criar 3 tabelas:

```sql
-- Missões cadastradas pelo admin
CREATE TABLE public.missoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  data date NOT NULL,
  descricao text,
  ativa boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Inscrições dos usuários
CREATE TABLE public.missao_inscricoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  missao_id uuid NOT NULL REFERENCES public.missoes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  telefone text,
  acompanhantes integer NOT NULL DEFAULT 0,
  observacoes text,
  status text NOT NULL DEFAULT 'confirmado',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, missao_id)
);

-- Controle de visualização do popup
CREATE TABLE public.missao_visualizacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  missao_id uuid NOT NULL REFERENCES public.missoes(id) ON DELETE CASCADE,
```