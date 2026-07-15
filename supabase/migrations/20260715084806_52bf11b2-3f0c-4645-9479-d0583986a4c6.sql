
-- Enums
CREATE TYPE public.branch AS ENUM ('twatwa','joburg_north','joburg_south');
CREATE TYPE public.approval_status AS ENUM ('pending','approved','rejected');

-- Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN branch public.branch,
  ADD COLUMN approval_status public.approval_status NOT NULL DEFAULT 'pending',
  ADD COLUMN requested_department_slug text,
  ADD COLUMN requested_role text,
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN email text;

-- Replace handle_new_user to capture branch/department/role from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
BEGIN
  INSERT INTO public.profiles (id, full_name, email, branch, requested_department_slug, requested_role, approval_status)
  VALUES (
    NEW.id,
    COALESCE(meta->>'full_name', NEW.email),
    NEW.email,
    NULLIF(meta->>'branch','')::public.branch,
    NULLIF(meta->>'department_slug',''),
    NULLIF(meta->>'requested_role',''),
    'pending'
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'team_member');
  RETURN NEW;
END;
$$;

-- Approval action: sets status and, on approval, attaches the user to the requested department
CREATE OR REPLACE FUNCTION public.approve_member(_user_id uuid, _approve boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.profiles%ROWTYPE;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO p FROM public.profiles WHERE id = _user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;

  IF _approve THEN
    UPDATE public.profiles
      SET approval_status = 'approved',
          approved_at = now(),
          approved_by = auth.uid(),
          primary_department = p.requested_department_slug
      WHERE id = _user_id;
    IF p.requested_department_slug IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role, department_slug)
      VALUES (_user_id, 'team_member', p.requested_department_slug)
      ON CONFLICT DO NOTHING;
    END IF;
  ELSE
    UPDATE public.profiles
      SET approval_status = 'rejected',
          approved_at = now(),
          approved_by = auth.uid()
      WHERE id = _user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_member(uuid, boolean) TO authenticated;

-- Fill in vision/mission for all departments, grounded in each dept's scripture
UPDATE public.departments SET vision = v, mission = m FROM (VALUES
  ('worship','To usher the church into Spirit-led worship that reveals the presence and glory of God (John 4:23-24).','Cultivate worshippers who minister in spirit and in truth, and prepare the atmosphere for the Word.'),
  ('prayer-intercession','To be a house of prayer for all nations, standing in the gap for the church and the city (Isaiah 56:7; Ezekiel 22:30).','Mobilise intercessors, host prayer watches, and cover every ministry assignment in prayer.'),
  ('finance','To steward every resource entrusted to the house with integrity and Kingdom purpose (Luke 16:10-11).','Budget, receive, safeguard and report finances with transparency, dual control and audit readiness.'),
  ('protocol','To honour the presence of God and His servants through order, decency and readiness (1 Corinthians 14:40).','Coordinate service flow, hospitality of leaders, and reverent execution of every gathering.'),
  ('hospitality','To welcome every guest as we would welcome Christ Himself (Hebrews 13:2; Romans 12:13).','Create warm, dignified reception for members and visitors before, during and after services.'),
  ('ushers','To keep the house in order so the Word and worship can flow without hindrance (1 Corinthians 14:33).','Seat the congregation, secure the environment, and support offerings and communion with excellence.'),
  ('media','To carry the sound and message of the house with clarity, distinction and doctrinal integrity (Habakkuk 2:2).','Run livestream, sound, visuals, socials and archive; pre-approve every published word and image.'),
  ('childrens-ministry','To raise a generation that knows and loves the Lord from childhood (Proverbs 22:6; Deuteronomy 6:6-7).','Disciple children with age-appropriate teaching, safe environments and screened, trained volunteers.'),
  ('discipleship','To doctrinally equip the saints in alignment with the biblical standards of the Kingdom (Matthew 28:19-20).','Teach sound doctrine, run membership classes and small groups, and track spiritual growth.'),
  ('school-of-ministry','To train and develop leaders and ministers called for Kingdom purposes (2 Timothy 2:2).','Deliver structured curriculum in doctrine, character and ministry skills, and commission graduates.'),
  ('outreach-evangelism','To commission ambassadors that reach the lost and demonstrate the Kingdom (Acts 1:8; Mark 16:15).','Plan evangelism, mercy and community campaigns; track souls reached, follow-up and integration.'),
  ('mens-ministry','To raise men as priests, husbands and fathers after God''s heart (Malachi 4:6; Ephesians 5:25).','Disciple men through gatherings, mentorship and service, and equip them for family and marketplace assignments.'),
  ('womens-ministry','To equip women as daughters, wives, mothers and Kingdom carriers (Proverbs 31; Titus 2:3-5).','Disciple women through teaching, mentorship, care and outreach that reflect Christ.'),
  ('youth-ministry','To disciple a Christ-centred generation of youth prepared for destiny (1 Timothy 4:12; Ecclesiastes 12:1).','Deliver relevant teaching, safe community, leadership development and outreach for teens and young adults.'),
  ('religion','To restore integrity and purity within ministry and disciple nations under Christ''s Lordship (Matthew 16:18).','Guard doctrine, plant Kingdom centres, and align ministry expressions to the Scriptures.'),
  ('family','To build Christ-centred marriages and homes as the primary discipling environment (Ephesians 5:22-33; Joshua 24:15).','Equip couples, parents and singles through teaching, counselling and covenant community.'),
  ('education','To raise Kingdom-minded educators and learners who influence curriculum and campus culture (Proverbs 1:7; Daniel 1:17).','Support students and teachers, promote biblical worldview, and mentor next-generation minds.'),
  ('government','To send righteous ambassadors into civic life who legislate and lead in the fear of the Lord (Isaiah 9:6-7; Proverbs 29:2).','Disciple believers in public service, uphold justice, and pray for authorities.'),
  ('business-economics','To empower marketplace ambassadors to generate Kingdom wealth with integrity (Deuteronomy 8:18; Proverbs 22:29).','Train, network and mentor believers in business, stewardship and Kingdom economics.'),
  ('media-communication','To shape the narrative of the age with truthful, excellent and Christ-honouring content (Habakkuk 2:2; Proverbs 18:21).','Raise Kingdom voices in journalism, publishing and digital media with sound doctrine and craft.'),
  ('arts-entertainment-sports','To release Spirit-empowered creativity that reveals the beauty and character of God (Exodus 31:1-5; Psalm 150).','Disciple artists, athletes and creators; steward gifts as ministry and mission.'),
  ('apostolic','To lay strong apostolic foundations that resource and steward Kingdom assignments globally (Ephesians 2:20; 1 Corinthians 3:10).','Plant, oversee and align churches and centres under sound apostolic covering.'),
  ('prophetic','To restore integrity and purity within the prophetic ministry and speak the mind of God (Ephesians 4:11; 1 Corinthians 14:3).','Train, weigh and release prophetic voices that build, encourage and comfort the church.'),
  ('evangelistic','To reach the lost with the good news of Jesus Christ (Ephesians 4:11; Romans 10:14-15).','Mobilise evangelism campaigns, personal witnessing and follow-up into discipleship.'),
  ('pastoral','To shepherd God''s people with care, correction and healing (Ephesians 4:11; John 21:15-17; 1 Peter 5:2-4).','Provide counselling, member care, visitation and pastoral oversight of small groups.'),
  ('teaching','To ground believers in sound doctrine and the whole counsel of God (Ephesians 4:11; 2 Timothy 3:16-17).','Deliver systematic Bible teaching in services, classes and the School of Ministry.')
) AS s(slug,v,m) WHERE public.departments.slug = s.slug;
