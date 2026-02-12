-- ============================================================
-- 020_referral_bonus.sql
-- Système de parrainage avec bonus de 500 FCFA
-- ============================================================

-- 1. Ajouter la colonne balance (solde) aux clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS balance INTEGER DEFAULT 0;

-- 2. Table pour tracer l'historique des transactions de solde
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- positif = crédit, négatif = débit
  type TEXT NOT NULL CHECK (type IN ('referral_bonus', 'referral_reward', 'booking_credit', 'admin_credit', 'debit')),
  description TEXT,
  related_client_id UUID REFERENCES public.clients(id), -- le parrain ou le filleul
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_client ON public.wallet_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions(type);

-- RLS pour wallet_transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet_select_own"
  ON public.wallet_transactions
  FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "wallet_insert_system"
  ON public.wallet_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = client_id);

-- Superadmins peuvent tout voir
CREATE POLICY "wallet_superadmin_all"
  ON public.wallet_transactions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

-- 3. Fonction pour appliquer le bonus de parrainage
-- Appelée après l'inscription quand un code de parrainage est fourni
CREATE OR REPLACE FUNCTION public.apply_referral_bonus(
  p_new_client_id UUID,
  p_referral_code TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referrer_id UUID;
  v_referrer_name TEXT;
  v_new_client_name TEXT;
  v_bonus INTEGER := 500; -- 500 FCFA
BEGIN
  -- Vérifier que le code existe
  SELECT id, full_name INTO v_referrer_id, v_referrer_name
  FROM public.clients
  WHERE referral_code = upper(p_referral_code)
    AND status = 'actif';

  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Code de parrainage invalide');
  END IF;

  -- Empêcher l'auto-parrainage
  IF v_referrer_id = p_new_client_id THEN
    RETURN json_build_object('success', false, 'error', 'Vous ne pouvez pas utiliser votre propre code');
  END IF;

  -- Vérifier que le nouveau client n'a pas déjà été parrainé
  IF (SELECT referred_by FROM public.clients WHERE id = p_new_client_id) IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Vous avez déjà utilisé un code de parrainage');
  END IF;

  -- Récupérer le nom du nouveau client
  SELECT full_name INTO v_new_client_name FROM public.clients WHERE id = p_new_client_id;

  -- Mettre à jour le referred_by du nouveau client
  UPDATE public.clients
  SET referred_by = v_referrer_id
  WHERE id = p_new_client_id;

  -- Créditer le nouveau client (+500 FCFA)
  UPDATE public.clients
  SET balance = balance + v_bonus
  WHERE id = p_new_client_id;

  INSERT INTO public.wallet_transactions (client_id, amount, type, description, related_client_id)
  VALUES (p_new_client_id, v_bonus, 'referral_bonus', 
    'Bonus inscription avec code de parrainage de ' || v_referrer_name, v_referrer_id);

  -- Créditer le parrain (+500 FCFA)
  UPDATE public.clients
  SET balance = balance + v_bonus
  WHERE id = v_referrer_id;

  INSERT INTO public.wallet_transactions (client_id, amount, type, description, related_client_id)
  VALUES (v_referrer_id, v_bonus, 'referral_reward', 
    'Bonus parrainage - ' || v_new_client_name || ' s''est inscrit avec votre code', p_new_client_id);

  RETURN json_build_object(
    'success', true, 
    'bonus', v_bonus,
    'referrer_name', v_referrer_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_referral_bonus TO authenticated;

COMMENT ON TABLE public.wallet_transactions IS 'Historique des transactions du portefeuille client (bonus, débits, crédits)';
COMMENT ON FUNCTION public.apply_referral_bonus IS 'Applique le bonus de 500 FCFA au parrain et au filleul lors de l''inscription avec un code';
