
INSERT INTO public.profiles (id, full_name, email, approval_status, approved_at)
VALUES ('104d5cff-63bd-415d-b45d-ae72ccc04c2a', 'Richard Mashaba', 'richardmashaba.sog@gmail.com', 'approved', now())
ON CONFLICT (id) DO UPDATE SET approval_status = 'approved', approved_at = now();

INSERT INTO public.user_roles (user_id, role)
VALUES ('104d5cff-63bd-415d-b45d-ae72ccc04c2a', 'senior_apostle')
ON CONFLICT DO NOTHING;
