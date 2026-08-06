ALTER TABLE public.purchase_requests
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'waiting_finance_review',
  ADD COLUMN IF NOT EXISTS finance_approved_by uuid,
  ADD COLUMN IF NOT EXISTS finance_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS finance_comment text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE TABLE IF NOT EXISTS public.finance_approval_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type text NOT NULL DEFAULT 'purchase_request',
  request_id uuid NOT NULL,
  request_ref text,
  stage text NOT NULL DEFAULT 'leadership',
  decision text NOT NULL,
  reason text,
  comment text,
  decided_by uuid NOT NULL,
  decider_role text,
  decider_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.finance_approval_decisions TO authenticated;
GRANT ALL ON public.finance_approval_decisions TO service_role;

ALTER TABLE public.finance_approval_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved members can read finance decisions"
  ON public.finance_approval_decisions FOR SELECT TO authenticated
  USING (public.is_approved_member(auth.uid()));

CREATE POLICY "Authorities can record finance decisions"
  ON public.finance_approval_decisions FOR INSERT TO authenticated
  WITH CHECK (decided_by = auth.uid());

CREATE INDEX IF NOT EXISTS finance_approval_decisions_request_idx
  ON public.finance_approval_decisions (request_id, created_at DESC);