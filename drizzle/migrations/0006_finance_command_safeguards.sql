ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS finance_approved_by uuid, ADD COLUMN IF NOT EXISTS finance_approved_at timestamptz, ADD COLUMN IF NOT EXISTS review_amount numeric;
ALTER TABLE public.budget_adjustments ADD COLUMN IF NOT EXISTS finance_approved_by uuid, ADD COLUMN IF NOT EXISTS finance_approved_at timestamptz, ADD COLUMN IF NOT EXISTS review_amount numeric;
ALTER TABLE public.fin_month_lines ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.expense_claims ADD COLUMN IF NOT EXISTS ledger_entry_id uuid;
ALTER TABLE public.payroll_lines ADD COLUMN IF NOT EXISTS ledger_entry_id uuid;
ALTER TABLE public.bank_statements ADD COLUMN IF NOT EXISTS import_key text;
CREATE UNIQUE INDEX IF NOT EXISTS bank_statements_import_key ON public.bank_statements(imported_by,import_key) WHERE import_key IS NOT NULL;
CREATE OR REPLACE FUNCTION public.finance_is_reviewer(_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=_uid AND approval_status='approved') AND (EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_uid AND (role::text='finance_officer' OR department_slug IN ('finance','finance-administration'))) OR EXISTS(SELECT 1 FROM public.profiles WHERE id=_uid AND primary_department IN ('finance','finance-administration'))) $$;
CREATE OR REPLACE FUNCTION public.finance_is_leader(_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=_uid AND approval_status='approved') AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_uid AND role::text IN ('chairperson','senior_apostle','lead_pastor','associate_pastor')) $$;
REVOKE ALL ON FUNCTION public.finance_is_reviewer(uuid),public.finance_is_leader(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.finance_is_reviewer(uuid),public.finance_is_leader(uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.finance_transition_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE n jsonb:=to_jsonb(NEW); o jsonb; k text; BEGIN
IF TG_OP='INSERT' THEN IF auth.uid() IS NOT NULL AND n->>'status' NOT IN ('draft','submitted') THEN RAISE EXCEPTION 'Financial requests must start as drafts or submissions'; END IF; RETURN NEW; END IF;
o:=to_jsonb(OLD);
IF TG_TABLE_NAME='purchase_requests' AND (o->>'payment_status'='paid' OR o->>'ledger_entry_id' IS NOT NULL) THEN FOREACH k IN ARRAY ARRAY['payment_status','ledger_entry_id','bank_account_id','amount_actual','amount_estimated','paid_at','paid_by','budget_id','branch','department_slug'] LOOP IF n->k IS DISTINCT FROM o->k THEN RAISE EXCEPTION 'Posted payments cannot be reset or edited'; END IF; END LOOP; IF n->>'status' IS DISTINCT FROM o->>'status' AND NOT (o->>'status' IN ('senior_pastor_approved','ordered') AND n->>'status' IN ('ordered','received') AND current_setting('app.finance_command',true)='on') THEN RAISE EXCEPTION 'Posted approvals cannot be reset'; END IF; END IF;
IF auth.uid() IS NOT NULL AND current_setting('app.finance_command',true) IS DISTINCT FROM 'on' THEN
IF n->>'status' IS DISTINCT FROM o->>'status' AND NOT (o->>'status' IN ('draft','submitted','returned') AND n->>'status' IN ('draft','submitted')) THEN RAISE EXCEPTION 'Use the Finance approval command'; END IF;
FOREACH k IN ARRAY ARRAY['payment_status','finance_approved_by','finance_approved_at','approved_by','approved_at','approved_by_chair','approved_by_senior','senior_approved_at','approved_amount','paid_at','paid_by','ledger_entry_id','decided_by','decided_at','review_amount'] LOOP IF n->k IS DISTINCT FROM o->k THEN RAISE EXCEPTION 'Use the Finance approval command'; END IF; END LOOP;
IF o->>'status' NOT IN ('draft','submitted','returned') THEN FOREACH k IN ARRAY ARRAY['total_amount','requested_amount','amount_actual','amount_estimated','budget_id','bank_account_id','department_slug','branch','requester_id','created_by','requested_by'] LOOP IF n->k IS DISTINCT FROM o->k THEN RAISE EXCEPTION 'Reviewed financial amounts and ownership cannot change directly'; END IF; END LOOP; END IF; END IF; RETURN NEW; END $$;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['purchase_requests','budgets','budget_adjustments'] LOOP EXECUTE format('CREATE TRIGGER a_finance_transition_guard BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.finance_transition_guard()',t); END LOOP; END $$;
CREATE OR REPLACE FUNCTION public.sync_purchase_payment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE amt numeric; acct public.bank_accounts%ROWTYPE; BEGIN
IF NEW.payment_status='paid' AND OLD.payment_status IS DISTINCT FROM 'paid' THEN
IF OLD.ledger_entry_id IS NOT NULL THEN RAISE EXCEPTION 'Payment already posted'; END IF;
IF current_setting('app.finance_command',true) IS DISTINCT FROM 'on' OR NOT public.finance_is_reviewer(auth.uid()) THEN RAISE EXCEPTION 'Finance must process payment'; END IF;
IF NEW.status NOT IN ('senior_pastor_approved','ordered','received') THEN RAISE EXCEPTION 'Leadership approval required'; END IF;
amt:=COALESCE(NEW.amount_actual,NEW.amount_estimated,0); IF amt<=0 OR NEW.bank_account_id IS NULL THEN RAISE EXCEPTION 'Positive amount and payment account required'; END IF;
SELECT * INTO acct FROM public.bank_accounts WHERE id=NEW.bank_account_id FOR UPDATE;
IF NOT FOUND OR NOT acct.is_active OR acct.archived_at IS NOT NULL OR acct.branch IS DISTINCT FROM NEW.branch THEN RAISE EXCEPTION 'Choose an active payment account in the request branch'; END IF;
INSERT INTO public.finance_entries(department_slug,kind,entry_date,title,notes,amount,branch,status,category,created_by,approved_by,approved_at) VALUES(NEW.department_slug,'procurement',CURRENT_DATE,COALESCE(NEW.pr_number,'Purchase')||' — '||NEW.title,NEW.description,-amt,NEW.branch,'completed',NEW.category,auth.uid(),NEW.approved_by_senior,NEW.senior_approved_at) RETURNING id INTO NEW.ledger_entry_id;
UPDATE public.bank_accounts SET current_balance=current_balance-amt WHERE id=NEW.bank_account_id; NEW.paid_at:=now(); NEW.paid_by:=auth.uid(); END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.budget_guard_and_version() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF NEW.status IN ('approved','partially_approved','active','locked') AND OLD.status IS DISTINCT FROM NEW.status THEN NEW.locked_at:=now(); END IF;
IF NEW.total_amount IS DISTINCT FROM OLD.total_amount OR NEW.status IS DISTINCT FROM OLD.status THEN NEW.version:=OLD.version+1; INSERT INTO public.budget_revisions(budget_id,version,previous_amount,new_amount,previous_status,new_status,reason,changed_by) VALUES(OLD.id,NEW.version,OLD.total_amount,NEW.total_amount,OLD.status,NEW.status,NEW.notes,auth.uid()); END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.finance_command(_table text,_id uuid,_action text,_amount numeric DEFAULT NULL,_note text DEFAULT NULL,_account_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb; b jsonb; uid uuid:=auth.uid(); stage text; requested numeric; allowed numeric; owner_id uuid; row_branch text; actor_name text; BEGIN
IF uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
IF _table NOT IN ('purchase_requests','budgets','budget_adjustments') THEN RAISE EXCEPTION 'Unknown financial record'; END IF;
EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1 FOR UPDATE',_table) INTO r USING _id; IF r IS NULL THEN RAISE EXCEPTION 'Record not found'; END IF;
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
IF _action='approve' AND stage='finance' THEN EXECUTE format('UPDATE public.%I SET status=''finance_approved'',finance_approved_by=$1,finance_approved_at=now(),review_amount=$2 WHERE id=$3',_table) USING uid,allowed,_id;
ELSIF _action='approve' AND stage='leadership' THEN
IF _table='budgets' THEN UPDATE public.budgets SET status=CASE WHEN allowed<requested THEN 'partially_approved' ELSE 'approved' END,approved_amount=allowed,total_amount=allowed,approved_by=uid,approved_at=now(),notes=concat_ws(E'\n',notes,NULLIF(_note,'')) WHERE id=_id;
ELSE UPDATE public.budget_adjustments SET status='approved',approved_amount=allowed,decided_by=uid,decided_at=now(),decision_reason=_note WHERE id=_id; UPDATE public.budgets SET total_amount=COALESCE(approved_amount,total_amount,0)+allowed,approved_amount=COALESCE(approved_amount,total_amount,0)+allowed WHERE id=(r->>'budget_id')::uuid; END IF;
ELSIF _action='reject' THEN
IF _table='budgets' THEN UPDATE public.budgets SET status='rejected',rejected_by=uid,rejected_at=now(),rejection_reason=_note WHERE id=_id; ELSE UPDATE public.budget_adjustments SET status='rejected',decided_by=uid,decided_at=now(),decision_reason=_note WHERE id=_id; END IF;
ELSE RAISE EXCEPTION 'Action not permitted'; END IF; END IF;
SELECT full_name INTO actor_name FROM public.profiles WHERE id=uid;
IF _action IN ('approve','reject','return') THEN INSERT INTO public.finance_approval_decisions(request_type,request_id,request_ref,stage,decision,reason,comment,decided_by,decider_name) VALUES(_table,_id,COALESCE(r->>'pr_number',r->>'reference_number'),stage,_action,_note,_note,uid,actor_name); END IF;
INSERT INTO public.notifications(user_id,title,message,link,type,branch) SELECT p.id,'Finance: '||_action,COALESCE(r->>'title',r->>'name','Financial request')||' — responsible person: '||COALESCE(actor_name,'Finance')||' ('||COALESCE((SELECT email FROM public.profiles WHERE id=uid),'email unavailable')||')','/departments/finance','procurement',row_branch::public.branch FROM public.profiles p WHERE p.approval_status='approved' AND p.id<>uid AND (p.id=owner_id OR (_action='approve' AND stage='finance' AND EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id=p.id AND ur.role::text IN ('chairperson','senior_apostle','lead_pastor','associate_pastor') AND (ur.role::text='senior_apostle' OR p.branch::text IS NOT DISTINCT FROM row_branch))));
PERFORM set_config('app.finance_command','off',true); EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1',_table) INTO r USING _id; RETURN r; END $$;
REVOKE ALL ON FUNCTION public.finance_command(text,uuid,text,numeric,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.finance_command(text,uuid,text,numeric,text,uuid) TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.finance_approval_decisions FROM authenticated;
CREATE OR REPLACE FUNCTION public.finance_preserve_record() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN RAISE EXCEPTION 'Financial records must be archived, not deleted'; END $$;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['finance_entries','expense_claims','purchase_requests','budgets','budget_lines','budget_adjustments','budget_revisions','finance_approval_decisions','fin_month_periods','fin_month_lines','bank_accounts','bank_statements','bank_transactions','payroll_runs','payroll_lines'] LOOP EXECUTE format('REVOKE DELETE ON public.%I FROM authenticated',t); EXECUTE format('CREATE TRIGGER finance_preserve_record BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.finance_preserve_record()',t); END LOOP; END $$;
CREATE OR REPLACE FUNCTION public.import_finance_statement(_statement jsonb,_transactions jsonb,_import_key text) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$ DECLARE sid uuid; t jsonb; first_date date:=(_statement->>'period_start')::date; last_date date:=(_statement->>'period_end')::date; BEGIN
IF NOT public.finance_is_reviewer(auth.uid()) THEN RAISE EXCEPTION 'Only Finance may import statements'; END IF;
IF jsonb_array_length(_transactions)=0 OR last_date<first_date THEN RAISE EXCEPTION 'Valid period and transactions required'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||_import_key,0)); SELECT id INTO sid FROM public.bank_statements WHERE imported_by=auth.uid() AND import_key=md5(_import_key); IF sid IS NOT NULL THEN RETURN sid; END IF;
INSERT INTO public.bank_statements(account_name,branch,period_start,period_end,opening_balance,closing_balance,file_name,imported_by,import_key) VALUES(_statement->>'account_name',(_statement->>'branch')::public.branch,first_date,last_date,(_statement->>'opening_balance')::numeric,(_statement->>'closing_balance')::numeric,_statement->>'file_name',auth.uid(),md5(_import_key)) RETURNING id INTO sid;
FOR t IN SELECT value FROM jsonb_array_elements(_transactions) LOOP IF (t->>'amount')::numeric<=0 OR (t->>'txn_date')::date NOT BETWEEN first_date AND last_date OR t->>'direction' NOT IN ('debit','credit') THEN RAISE EXCEPTION 'Invalid bank transaction; nothing imported'; END IF; INSERT INTO public.bank_transactions(statement_id,txn_date,description,reference,amount,direction) VALUES(sid,(t->>'txn_date')::date,t->>'description',t->>'reference',(t->>'amount')::numeric,t->>'direction'); END LOOP; RETURN sid; END $$;
REVOKE ALL ON FUNCTION public.import_finance_statement(jsonb,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.import_finance_statement(jsonb,jsonb,text) TO authenticated;