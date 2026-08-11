ALTER TABLE public.purchase_requests DROP CONSTRAINT IF EXISTS purchase_requests_status_check;
ALTER TABLE public.purchase_requests ADD CONSTRAINT purchase_requests_status_check CHECK (status IN (
  'draft','submitted','chair_approved','finance_approved','returned','senior_pastor_approved','ordered','received','rejected','cancelled'
));
ALTER TABLE public.purchase_requests DROP CONSTRAINT IF EXISTS purchase_requests_payment_status_check;
ALTER TABLE public.purchase_requests ADD CONSTRAINT purchase_requests_payment_status_check CHECK (payment_status IS NULL OR payment_status IN (
  'waiting_finance_review','waiting_leadership_approval','approved','paid','not_paid'
));