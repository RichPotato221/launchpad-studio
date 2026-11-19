CREATE OR REPLACE FUNCTION public.finance_command(_table text,_id uuid,_action text,_amount numeric DEFAULT NULL,_note text DEFAULT NULL,_account_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb; b jsonb; uid uuid:=auth.uid(); stage text; requested numeric; allowed numeric; owner_id uuid; row_branch text; actor_name text; BEGIN
IF uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
IF _table IS NULL OR _table NOT IN ('purchase_requests','budgets','budget_adjustments') THEN RAISE EXCEPTION 'Unknown financial record'; END IF;
CASE _table
WHEN 'purchase_requests' THEN SELECT to_jsonb(t) INTO r FROM public.purchase_requests t WHERE id=_id FOR UPDATE;
WHEN 'budgets' THEN SELECT to_jsonb(t) INTO r FROM public.budgets t WHERE id=_id FOR UPDATE;
WHEN 'budget_adjustments' THEN SELECT to_jsonb(t) INTO r FROM public.budget_adjustments t WHERE id=_id FOR UPDATE;
END CASE; IF r IS NULL THEN RAISE EXCEPTION 'Record not found'; END IF;
IF _table='budget_adjustments' THEN SELECT to_jsonb(t) INTO b FROM public.budgets t WHERE id=(r->>'budget_id')::uuid FOR UPDATE; row_branch:=b->>'branch'; owner_id:=(r->>'requested_by')::uuid; ELSE row_branch:=r->>'branch'; owner_id:=COALESCE(r->>'requester_id',r->>'submitted_by',r->>'created_by')::uuid; END IF;
IF NOT public.is_head_office(uid) AND row_branch IS DISTINCT FROM public.my_branch()::text THEN RAISE EXCEPTION 'Record belongs to another branch'; END IF;
IF r->>'archived_at' IS NOT NULL THEN RAISE EXCEPTION 'Archived record cannot be approved'; END IF;
stage:=CASE WHEN r->>'status' IN ('submitted','returned','under_review') THEN 'finance' WHEN r->>'status' IN ('finance_approved','chair_approved') THEN 'leadership' ELSE 'closed' END;
IF _action IN ('approve','reject','return') THEN
IF uid=owner_id THEN RAISE EXCEPTION 'Cannot approve your own request'; END IF;
IF stage='finance' AND NOT public.finance_is_reviewer(uid) THEN RAISE EXCEPTION 'Finance must review first'; END IF;
IF stage='leadership' AND (NOT public.finance_is_leader(uid) OR uid=COALESCE(r->>'finance_approved_by',r->>'approved_by_chair')::uuid) THEN RAISE EXCEPTION 'A different leadership authority must approve'; END IF;
IF stage='closed' THEN RAISE EXCEPTION 'Request is not awaiting a decision'; END IF;
IF _action IN ('reject','return') AND NULLIF(trim(_note),'') IS NULL THEN RAISE EXCEPTION 'Reason required'; END IF; END IF;
PERFORM set_config('app.finance_command','on',true);
IF _table='purchase_requests' THEN
IF _action='approve' AND stage='finance' THEN UPDATE public.purchase_requests SET status='finance_approved',payment_status='waiting_leadership_approval',finance_approved_by=uid,finance_approved_at=now(),finance_comment=_note WHERE id=_id;
ELSIF _action='approve' AND stage='leadership' THEN UPDATE public.purchase_requests SET status='senior_pastor_approved',payment_status='approved',approved_by_senior=uid,senior_approved_at=now(),senior_comment=_note WHERE id=_id;
ELSIF _action='reject' THEN UPDATE public.purchase_requests SET status='rejected',payment_status='not_paid',rejection_reason=_note WHERE id=_id;
ELSIF _action='return' AND stage='finance' THEN UPDATE public.purchase_requests SET status='returned',finance_comment=_note WHERE id=_id;
ELSIF _action IN ('order','receive','pay') AND public.finance_is_reviewer(uid) THEN
IF _action='order' AND r->>'status'='senior_pastor_approved' THEN UPDATE public.purchase_requests SET status='ordered',ordered_at=now(),po_number=COALESCE(po_number,replace(pr_number,'PR-','PO-')) WHERE id=_id;
ELSIF _action='receive' AND r->>'status'='ordered' THEN UPDATE public.purchase_requests SET status='received',received_at=now() WHERE id=_id;
ELSIF _action='pay' AND r->>'status' IN ('senior_pastor_approved','ordered','received') AND r->>'payment_status'<>'paid' AND r->>'ledger_entry_id' IS NULL THEN UPDATE public.purchase_requests SET payment_status='paid',bank_account_id=_account_id,paid_by=uid WHERE id=_id;
ELSE RAISE EXCEPTION 'Invalid payment or delivery transition'; END IF;
ELSE RAISE EXCEPTION 'Action not permitted'; END IF;
ELSE
requested:=COALESCE(NULLIF((r->>'requested_amount')::numeric,0),(r->>'total_amount')::numeric,0); allowed:=COALESCE(_amount,(r->>'review_amount')::numeric,requested);
IF _action='approve' AND (allowed<=0 OR allowed>requested OR (stage='leadership' AND allowed>COALESCE((r->>'review_amount')::numeric,requested))) THEN RAISE EXCEPTION 'Amount must be positive and cannot exceed the reviewed request'; END IF;
IF _action='approve' AND stage='finance' THEN
IF _table='budgets' THEN UPDATE public.budgets SET status='finance_approved',finance_approved_by=uid,finance_approved_at=now(),review_amount=allowed WHERE id=_id;
ELSE UPDATE public.budget_adjustments SET status='finance_approved',finance_approved_by=uid,finance_approved_at=now(),review_amount=allowed WHERE id=_id; END IF;
ELSIF _action='approve' AND stage='leadership' THEN
IF _table='budgets' THEN UPDATE public.budgets SET status=CASE WHEN allowed<requested THEN 'partially_approved' ELSE 'approved' END,approved_amount=allowed,total_amount=allowed,approved_by=uid,approved_at=now(),notes=concat_ws(E'\n',notes,NULLIF(_note,'')) WHERE id=_id;
ELSE UPDATE public.budget_adjustments SET status='approved',approved_amount=allowed,decided_by=uid,decided_at=now(),decision_reason=_note WHERE id=_id; UPDATE public.budgets SET total_amount=COALESCE(approved_amount,total_amount,0)+allowed,approved_amount=COALESCE(approved_amount,total_amount,0)+allowed WHERE id=(r->>'budget_id')::uuid; END IF;
ELSIF _action='reject' THEN
IF _table='budgets' THEN UPDATE public.budgets SET status='rejected',rejected_by=uid,rejected_at=now(),rejection_reason=_note WHERE id=_id; ELSE UPDATE public.budget_adjustments SET status='rejected',decided_by=uid,decided_at=now(),decision_reason=_note WHERE id=_id; END IF;
ELSE RAISE EXCEPTION 'Action not permitted'; END IF; END IF;
SELECT full_name INTO actor_name FROM public.profiles WHERE id=uid;
IF _action IN ('approve','reject','return') THEN INSERT INTO public.finance_approval_decisions(request_type,request_id,request_ref,stage,decision,reason,comment,decided_by,decider_name) VALUES(_table,_id,COALESCE(r->>'pr_number',r->>'reference_number'),stage,_action,_note,_note,uid,actor_name); END IF;
INSERT INTO public.notifications(user_id,title,message,link,type,branch) SELECT p.id,'Finance: '||_action,COALESCE(r->>'title',r->>'name','Financial request')||' — responsible person: '||COALESCE(actor_name,'Finance')||' ('||COALESCE((SELECT email FROM public.profiles WHERE id=uid),'email unavailable')||')','/departments/finance','procurement',row_branch::public.branch FROM public.profiles p WHERE p.approval_status='approved' AND p.id<>uid AND (p.id=owner_id OR (_action='approve' AND stage='finance' AND EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id=p.id AND ur.role::text IN ('chairperson','senior_apostle','lead_pastor','associate_pastor') AND (ur.role::text='senior_apostle' OR p.branch::text IS NOT DISTINCT FROM row_branch))));
PERFORM set_config('app.finance_command','off',true); CASE _table
WHEN 'purchase_requests' THEN SELECT to_jsonb(t) INTO r FROM public.purchase_requests t WHERE id=_id;
WHEN 'budgets' THEN SELECT to_jsonb(t) INTO r FROM public.budgets t WHERE id=_id;
WHEN 'budget_adjustments' THEN SELECT to_jsonb(t) INTO r FROM public.budget_adjustments t WHERE id=_id;
END CASE; RETURN r; END $$;
REVOKE ALL ON FUNCTION public.finance_command(text,uuid,text,numeric,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.finance_command(text,uuid,text,numeric,text,uuid) TO authenticated;

-- Keep sharing aligned with resource-record access; allow uploaders to read
-- newly uploaded files before their resource record has been saved.
ALTER POLICY "Members read department resource files" ON storage.objects
TO authenticated
USING (
  bucket_id = 'department-resources'
  AND public.is_approved_member(auth.uid())
  AND (
    owner = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.department_resources resource
      WHERE resource.storage_path = storage.objects.name
    )
  )
);
