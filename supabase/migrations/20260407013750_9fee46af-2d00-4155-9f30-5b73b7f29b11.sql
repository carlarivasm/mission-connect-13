
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

ALTER TABLE public.missoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage missoes" ON public.missoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view active missoes" ON public.missoes
  FOR SELECT TO authenticated
  USING (true);

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

ALTER TABLE public.missao_inscricoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage inscricoes" ON public.missao_inscricoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own inscricao" ON public.missao_inscricoes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own inscricao" ON public.missao_inscricoes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Controle de visualização do popup
CREATE TABLE public.missao_visualizacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  missao_id uuid NOT NULL REFERENCES public.missoes(id) ON DELETE CASCADE,
  visualizou_popup boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, missao_id)
);

ALTER TABLE public.missao_visualizacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own visualizacoes" ON public.missao_visualizacoes
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all visualizacoes" ON public.missao_visualizacoes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
