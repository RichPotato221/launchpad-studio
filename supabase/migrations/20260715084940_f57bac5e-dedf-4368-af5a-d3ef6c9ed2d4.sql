GRANT SELECT ON public.departments TO anon;
CREATE POLICY "anon read departments" ON public.departments FOR SELECT TO anon USING (true);