
CREATE OR REPLACE FUNCTION public.get_all_uploads()
RETURNS TABLE (
  source text,
  source_id text,
  title text,
  file_url text,
  file_name text,
  department_slug text,
  branch public.branch,
  uploader_id uuid,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH combined AS (
    -- Central documents
    SELECT 'documents'::text AS source, d.id::text AS source_id, d.title,
           d.file_url, d.file_name, d.department_slug, NULL::public.branch AS branch,
           d.uploaded_by AS uploader_id, d.created_at
    FROM public.documents d

    UNION ALL
    -- Announcement attachments
    SELECT 'announcements', a.id::text,
           COALESCE(a.title, left(a.body, 60)),
           a.attachment_url, COALESCE(a.attachment_name, 'attachment'),
           a.author_department_slug, NULL::public.branch,
           a.author_id, a.created_at
    FROM public.announcements a
    WHERE a.attachment_url IS NOT NULL

    UNION ALL
    -- Announcement media (images/video)
    SELECT 'announcement_media', am.id::text,
           'Announcement media',
           am.media_url, 'media.' || COALESCE(NULLIF(split_part(am.media_type,'/',2),''),'file'),
           NULL, NULL::public.branch,
           NULL::uuid, am.created_at
    FROM public.announcement_media am

    UNION ALL
    -- Senior Pastor cockpit attachments
    SELECT 'cockpit_posts', c.id::text, left(c.body, 60),
           c.attachment_url, COALESCE(c.attachment_name, 'attachment'),
           NULL, NULL::public.branch,
           c.author_id, c.created_at
    FROM public.cockpit_posts c
    WHERE c.attachment_url IS NOT NULL

    UNION ALL
    -- Department report entries
    SELECT 'report_entries', r.id::text, r.title,
           r.file_url, COALESCE(r.file_name, 'report'),
           r.department_slug, r.branch,
           r.created_by, r.created_at
    FROM public.report_entries r
    WHERE r.file_url IS NOT NULL

    UNION ALL
    -- Finance entries (contributions, tithes, journals)
    SELECT 'finance_entries', f.id::text, f.title,
           f.file_url, COALESCE(f.file_name, 'finance'),
           f.department_slug, f.branch,
           f.created_by, f.created_at
    FROM public.finance_entries f
    WHERE f.file_url IS NOT NULL

    UNION ALL
    -- Expense claim receipts
    SELECT 'expense_claims', e.id::text, e.description,
           e.receipt_url, 'receipt',
           e.department_slug, e.branch,
           e.claimant_id, e.created_at
    FROM public.expense_claims e
    WHERE e.receipt_url IS NOT NULL

    UNION ALL
    -- Editorial (media) assets
    SELECT 'editorial_posts', ep.id::text, ep.title,
           ep.asset_url, 'editorial asset',
           ep.department_slug, ep.branch,
           ep.created_by, ep.created_at
    FROM public.editorial_posts ep
    WHERE ep.asset_url IS NOT NULL

    UNION ALL
    -- Worship chord charts
    SELECT 'songs', s.id::text, s.title,
           s.chord_chart_url, 'chord chart',
           s.department_slug, s.branch,
           s.created_by, s.created_at
    FROM public.songs s
    WHERE s.chord_chart_url IS NOT NULL

    UNION ALL
    -- Governance documents
    SELECT 'governance_documents', g.id::text, g.title,
           g.file_url, g.title,
           NULL, NULL::public.branch,
           NULL::uuid, g.created_at
    FROM public.governance_documents g

    UNION ALL
    -- Member avatars
    SELECT 'avatars', p.id::text, COALESCE(p.full_name, 'Member avatar'),
           p.avatar_url, 'avatar',
           p.primary_department, p.branch,
           p.id, p.updated_at
    FROM public.profiles p
    WHERE p.avatar_url IS NOT NULL
  )
  SELECT * FROM combined
  WHERE public.is_admin(auth.uid())
  ORDER BY created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_all_uploads() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_all_uploads() TO authenticated;
