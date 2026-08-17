DROP POLICY IF EXISTS po_delete ON public.process_orders;
CREATE POLICY po_delete ON public.process_orders
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'chairperson'::app_role)
    OR has_role(auth.uid(), 'senior_apostle'::app_role)
    OR has_role(auth.uid(), 'secretary'::app_role)
  );

ALTER TABLE public.process_order_activities DROP CONSTRAINT IF EXISTS process_order_activities_process_order_id_fkey;
ALTER TABLE public.process_order_activities ADD CONSTRAINT process_order_activities_process_order_id_fkey FOREIGN KEY (process_order_id) REFERENCES public.process_orders(id) ON DELETE CASCADE;

ALTER TABLE public.process_order_documents DROP CONSTRAINT IF EXISTS process_order_documents_process_order_id_fkey;
ALTER TABLE public.process_order_documents ADD CONSTRAINT process_order_documents_process_order_id_fkey FOREIGN KEY (process_order_id) REFERENCES public.process_orders(id) ON DELETE CASCADE;

ALTER TABLE public.process_order_exceptions DROP CONSTRAINT IF EXISTS process_order_exceptions_process_order_id_fkey;
ALTER TABLE public.process_order_exceptions ADD CONSTRAINT process_order_exceptions_process_order_id_fkey FOREIGN KEY (process_order_id) REFERENCES public.process_orders(id) ON DELETE CASCADE;

ALTER TABLE public.process_order_departments DROP CONSTRAINT IF EXISTS process_order_departments_process_order_id_fkey;
ALTER TABLE public.process_order_departments ADD CONSTRAINT process_order_departments_process_order_id_fkey FOREIGN KEY (process_order_id) REFERENCES public.process_orders(id) ON DELETE CASCADE;

ALTER TABLE public.process_order_closure_checks DROP CONSTRAINT IF EXISTS process_order_closure_checks_process_order_id_fkey;
ALTER TABLE public.process_order_closure_checks ADD CONSTRAINT process_order_closure_checks_process_order_id_fkey FOREIGN KEY (process_order_id) REFERENCES public.process_orders(id) ON DELETE CASCADE;

ALTER TABLE public.process_order_audit DROP CONSTRAINT IF EXISTS process_order_audit_process_order_id_fkey;
ALTER TABLE public.process_order_audit ADD CONSTRAINT process_order_audit_process_order_id_fkey FOREIGN KEY (process_order_id) REFERENCES public.process_orders(id) ON DELETE CASCADE;