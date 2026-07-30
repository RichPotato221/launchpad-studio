-- ============ 1. Extra tracking columns ============
ALTER TABLE public.resolutions
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS department_slug text,
  ADD COLUMN IF NOT EXISTS branch public.branch,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.correspondence
  ADD COLUMN IF NOT EXISTS responded_at timestamptz;

-- ============ 2. Helper: is this user on the secretariat/leadership? ============
CREATE OR REPLACE FUNCTION public.is_secretariat(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.gov_is_admin(_user_id)
     OR EXISTS (
       SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = _user_id AND ur.department_slug = 'secretary'
     )
     OR EXISTS (
       SELECT 1 FROM public.profiles p
       WHERE p.id = _user_id AND p.approval_status = 'approved'
         AND p.primary_department = 'secretary'
     );
$$;

CREATE OR REPLACE FUNCTION public.is_approved_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id AND p.approval_status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_meeting(_user_id uuid, _meeting_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_secretariat(_user_id)
     OR EXISTS (
       SELECT 1 FROM public.meetings m
       WHERE m.id = _meeting_id
         AND (m.secretary_id = _user_id OR m.chairperson_id = _user_id OR m.created_by = _user_id)
     );
$$;

REVOKE EXECUTE ON FUNCTION public.is_secretariat(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_approved_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_meeting(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_secretariat(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_meeting(uuid, uuid) TO authenticated;

-- ============ 3. RLS on previously unprotected governance tables ============
-- meeting_apologies
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_apologies TO authenticated;
GRANT ALL ON public.meeting_apologies TO service_role;
ALTER TABLE public.meeting_apologies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "apologies_read" ON public.meeting_apologies;
CREATE POLICY "apologies_read" ON public.meeting_apologies FOR SELECT TO authenticated
  USING (public.is_approved_member(auth.uid()));
DROP POLICY IF EXISTS "apologies_write" ON public.meeting_apologies;
CREATE POLICY "apologies_write" ON public.meeting_apologies FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_meeting(auth.uid(), meeting_id))
  WITH CHECK (user_id = auth.uid() OR public.can_manage_meeting(auth.uid(), meeting_id));

-- meeting_visitors
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_visitors TO authenticated;
GRANT ALL ON public.meeting_visitors TO service_role;
ALTER TABLE public.meeting_visitors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "visitors_read" ON public.meeting_visitors;
CREATE POLICY "visitors_read" ON public.meeting_visitors FOR SELECT TO authenticated
  USING (public.is_approved_member(auth.uid()));
DROP POLICY IF EXISTS "visitors_write" ON public.meeting_visitors;
CREATE POLICY "visitors_write" ON public.meeting_visitors FOR ALL TO authenticated
  USING (public.can_manage_meeting(auth.uid(), meeting_id))
  WITH CHECK (public.can_manage_meeting(auth.uid(), meeting_id));

-- meeting_documents
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_documents TO authenticated;
GRANT ALL ON public.meeting_documents TO service_role;
ALTER TABLE public.meeting_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "meeting_docs_read" ON public.meeting_documents;
CREATE POLICY "meeting_docs_read" ON public.meeting_documents FOR SELECT TO authenticated
  USING (public.is_approved_member(auth.uid()));
DROP POLICY IF EXISTS "meeting_docs_write" ON public.meeting_documents;
CREATE POLICY "meeting_docs_write" ON public.meeting_documents FOR ALL TO authenticated
  USING (public.can_manage_meeting(auth.uid(), meeting_id))
  WITH CHECK (public.can_manage_meeting(auth.uid(), meeting_id));

-- meeting_votes
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_votes TO authenticated;
GRANT ALL ON public.meeting_votes TO service_role;
ALTER TABLE public.meeting_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "votes_read" ON public.meeting_votes;
CREATE POLICY "votes_read" ON public.meeting_votes FOR SELECT TO authenticated
  USING (public.is_approved_member(auth.uid()));
DROP POLICY IF EXISTS "votes_write" ON public.meeting_votes;
CREATE POLICY "votes_write" ON public.meeting_votes FOR ALL TO authenticated
  USING (public.can_manage_meeting(auth.uid(), meeting_id))
  WITH CHECK (public.can_manage_meeting(auth.uid(), meeting_id));

-- meeting_vote_records
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_vote_records TO authenticated;
GRANT ALL ON public.meeting_vote_records TO service_role;
ALTER TABLE public.meeting_vote_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vote_records_read" ON public.meeting_vote_records;
CREATE POLICY "vote_records_read" ON public.meeting_vote_records FOR SELECT TO authenticated
  USING (public.is_approved_member(auth.uid()));
DROP POLICY IF EXISTS "vote_records_write" ON public.meeting_vote_records;
CREATE POLICY "vote_records_write" ON public.meeting_vote_records FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_secretariat(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_secretariat(auth.uid()));

-- minute_speakers
GRANT SELECT, INSERT, UPDATE, DELETE ON public.minute_speakers TO authenticated;
GRANT ALL ON public.minute_speakers TO service_role;
ALTER TABLE public.minute_speakers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "minute_speakers_read" ON public.minute_speakers;
CREATE POLICY "minute_speakers_read" ON public.minute_speakers FOR SELECT TO authenticated
  USING (public.is_approved_member(auth.uid()));
DROP POLICY IF EXISTS "minute_speakers_write" ON public.minute_speakers;
CREATE POLICY "minute_speakers_write" ON public.minute_speakers FOR ALL TO authenticated
  USING (public.is_secretariat(auth.uid())) WITH CHECK (public.is_secretariat(auth.uid()));

-- minute_decisions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.minute_decisions TO authenticated;
GRANT ALL ON public.minute_decisions TO service_role;
ALTER TABLE public.minute_decisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "minute_decisions_read" ON public.minute_decisions;
CREATE POLICY "minute_decisions_read" ON public.minute_decisions FOR SELECT TO authenticated
  USING (public.is_approved_member(auth.uid()));
DROP POLICY IF EXISTS "minute_decisions_write" ON public.minute_decisions;
CREATE POLICY "minute_decisions_write" ON public.minute_decisions FOR ALL TO authenticated
  USING (public.is_secretariat(auth.uid())) WITH CHECK (public.is_secretariat(auth.uid()));

-- minute_versions (append-only history)
GRANT SELECT, INSERT ON public.minute_versions TO authenticated;
GRANT ALL ON public.minute_versions TO service_role;
ALTER TABLE public.minute_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "minute_versions_read" ON public.minute_versions;
CREATE POLICY "minute_versions_read" ON public.minute_versions FOR SELECT TO authenticated
  USING (public.is_approved_member(auth.uid()));
DROP POLICY IF EXISTS "minute_versions_insert" ON public.minute_versions;
CREATE POLICY "minute_versions_insert" ON public.minute_versions FOR INSERT TO authenticated
  WITH CHECK (public.is_secretariat(auth.uid()));

-- agenda_templates
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_templates TO authenticated;
GRANT ALL ON public.agenda_templates TO service_role;
ALTER TABLE public.agenda_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agenda_templates_read" ON public.agenda_templates;
CREATE POLICY "agenda_templates_read" ON public.agenda_templates FOR SELECT TO authenticated
  USING (public.is_approved_member(auth.uid()));
DROP POLICY IF EXISTS "agenda_templates_write" ON public.agenda_templates;
CREATE POLICY "agenda_templates_write" ON public.agenda_templates FOR ALL TO authenticated
  USING (public.is_secretariat(auth.uid())) WITH CHECK (public.is_secretariat(auth.uid()));

-- correspondence_attachments
GRANT SELECT, INSERT, UPDATE, DELETE ON public.correspondence_attachments TO authenticated;
GRANT ALL ON public.correspondence_attachments TO service_role;
ALTER TABLE public.correspondence_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "corr_attachments_read" ON public.correspondence_attachments;
CREATE POLICY "corr_attachments_read" ON public.correspondence_attachments FOR SELECT TO authenticated
  USING (public.is_approved_member(auth.uid()));
DROP POLICY IF EXISTS "corr_attachments_write" ON public.correspondence_attachments;
CREATE POLICY "corr_attachments_write" ON public.correspondence_attachments FOR ALL TO authenticated
  USING (public.is_secretariat(auth.uid())) WITH CHECK (public.is_secretariat(auth.uid()));

-- correspondence_responses
GRANT SELECT, INSERT, UPDATE, DELETE ON public.correspondence_responses TO authenticated;
GRANT ALL ON public.correspondence_responses TO service_role;
ALTER TABLE public.correspondence_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "corr_responses_read" ON public.correspondence_responses;
CREATE POLICY "corr_responses_read" ON public.correspondence_responses FOR SELECT TO authenticated
  USING (public.is_approved_member(auth.uid()));
DROP POLICY IF EXISTS "corr_responses_write" ON public.correspondence_responses;
CREATE POLICY "corr_responses_write" ON public.correspondence_responses FOR ALL TO authenticated
  USING (public.is_secretariat(auth.uid()) OR responded_by = auth.uid())
  WITH CHECK (public.is_secretariat(auth.uid()) OR responded_by = auth.uid());

-- compliance_alerts
GRANT SELECT, INSERT ON public.compliance_alerts TO authenticated;
GRANT ALL ON public.compliance_alerts TO service_role;
ALTER TABLE public.compliance_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "compliance_alerts_read" ON public.compliance_alerts;
CREATE POLICY "compliance_alerts_read" ON public.compliance_alerts FOR SELECT TO authenticated
  USING (recipient_id = auth.uid() OR public.is_secretariat(auth.uid()));
DROP POLICY IF EXISTS "compliance_alerts_insert" ON public.compliance_alerts;
CREATE POLICY "compliance_alerts_insert" ON public.compliance_alerts FOR INSERT TO authenticated
  WITH CHECK (public.is_secretariat(auth.uid()));

-- document_read_confirmations
GRANT SELECT, INSERT ON public.document_read_confirmations TO authenticated;
GRANT ALL ON public.document_read_confirmations TO service_role;
ALTER TABLE public.document_read_confirmations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "doc_reads_read" ON public.document_read_confirmations;
CREATE POLICY "doc_reads_read" ON public.document_read_confirmations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_secretariat(auth.uid()));
DROP POLICY IF EXISTS "doc_reads_insert" ON public.document_read_confirmations;
CREATE POLICY "doc_reads_insert" ON public.document_read_confirmations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============ 4. Resolution -> Task automation ============
CREATE OR REPLACE FUNCTION public.create_task_for_resolution()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_task_id uuid;
BEGIN
  INSERT INTO public.tasks (
    department_slug, title, description, assigned_to, created_by,
    due_date, priority, status, branch, resolution_id
  ) VALUES (
    COALESCE(NEW.department_slug, 'secretary'),
    left('Resolution: ' || NEW.resolution_text, 180),
    NEW.resolution_text,
    NEW.owner_id,
    COALESCE(NEW.created_by, auth.uid()),
    NEW.due_date,
    COALESCE(NEW.priority, 'normal'),
    'pending',
    NEW.branch,
    NEW.id
  ) RETURNING id INTO new_task_id;

  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, link, type, branch)
    VALUES (
      NEW.owner_id,
      'New resolution assigned to you',
      left(NEW.resolution_text, 200),
      '/secretariat',
      'resolution_assigned',
      NEW.branch
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resolution_task ON public.resolutions;
CREATE TRIGGER trg_resolution_task
AFTER INSERT ON public.resolutions
FOR EACH ROW EXECUTE FUNCTION public.create_task_for_resolution();

-- ============ 5. Audit trail on governance tables ============
DROP TRIGGER IF EXISTS trg_audit_meetings ON public.meetings;
CREATE TRIGGER trg_audit_meetings AFTER INSERT OR UPDATE OR DELETE ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.gov_log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_minutes ON public.minutes;
CREATE TRIGGER trg_audit_minutes AFTER INSERT OR UPDATE OR DELETE ON public.minutes
FOR EACH ROW EXECUTE FUNCTION public.gov_log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_resolutions ON public.resolutions;
CREATE TRIGGER trg_audit_resolutions AFTER INSERT OR UPDATE OR DELETE ON public.resolutions
FOR EACH ROW EXECUTE FUNCTION public.gov_log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_correspondence ON public.correspondence;
CREATE TRIGGER trg_audit_correspondence AFTER INSERT OR UPDATE OR DELETE ON public.correspondence
FOR EACH ROW EXECUTE FUNCTION public.gov_log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_compliance ON public.compliance_items;
CREATE TRIGGER trg_audit_compliance AFTER INSERT OR UPDATE OR DELETE ON public.compliance_items
FOR EACH ROW EXECUTE FUNCTION public.gov_log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_agendas ON public.agendas;
CREATE TRIGGER trg_audit_agendas AFTER INSERT OR UPDATE OR DELETE ON public.agendas
FOR EACH ROW EXECUTE FUNCTION public.gov_log_audit_event();

-- updated_at on resolutions
DROP TRIGGER IF EXISTS trg_resolutions_updated ON public.resolutions;
CREATE TRIGGER trg_resolutions_updated BEFORE UPDATE ON public.resolutions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();