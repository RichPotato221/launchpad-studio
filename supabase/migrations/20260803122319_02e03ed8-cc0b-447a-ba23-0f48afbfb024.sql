-- 1) Vision & Mission for departments missing them (from Volume V Job Specifications)
UPDATE public.departments SET vision = v.vision, mission = v.mission
FROM (VALUES
 ('sound-technical',
  'To carry the sound of the house with excellence so nothing hinders the Word or the worship (1 Chronicles 15:16; Colossians 3:23).',
  'Deliver faultless sound, livestream and technical production for every service, and keep all equipment maintained and project-ready.'),
 ('admin',
  'To serve the house through orderly administration so that ministry runs without hindrance (1 Corinthians 14:40; Acts 6:3).',
  'Maintain systems, records, access and platform integrity that keep every department operating accurately and on time.'),
 ('senior-pastor',
  'To carry apex spiritual and governance authority, holding the Vision so every structure operates in submission to it (Ephesians 2:20; Hebrews 13:17).',
  'Set doctrine and Kingdom direction, ordain and release fivefold gifts, and give final approval on strategic and capital matters.'),
 ('associate-pastor',
  'To shepherd the flock alongside the Senior and Lead Pastors, ensuring the Vision is executed in every assigned ministry area (1 Peter 5:2-4).',
  'Oversee assigned ministries, coach department leaders, and ensure pastoral care and reporting are delivered faithfully.'),
 ('chairperson',
  'To provide executive governance oversight so the Ministry''s affairs are administered with integrity and order (Titus 1:5; 1 Corinthians 4:2).',
  'Chair governance and Finance & Audit meetings, oversee the Governmental Structure offices, and drive resolutions to completion.'),
 ('elders',
  'To provide mature, tested spiritual oversight that guards the doctrine and the souls of the congregation (Acts 20:28; 1 Timothy 5:17).',
  'Give pastoral care and counsel, support Church discipline and doctrine, and mentor emerging leaders.'),
 ('lead-pastor',
  'To shepherd the congregation day by day and lead the Functional Structure under apostolic covering (Jeremiah 3:15; Ephesians 4:11).',
  'Oversee weekly ministry operations, supervise departments, resolve conflict, and keep congregational health strong.'),
 ('resource-administrator',
  'To steward the physical resources of the house so every assignment is properly resourced (Genesis 41:48; Luke 16:10).',
  'Manage assets, property and facilities, fulfil resource requests on time, and ready resources for Church Development Projects.'),
 ('secretary',
  'To keep the records of the house accurately so governance is transparent and traceable (Habakkuk 2:2; Proverbs 22:29).',
  'Maintain minutes, resolutions, correspondence and records for all governance structures within agreed turnaround times.'),
 ('strategic-adviser',
  'To discern the times and plan wisely so the Vision advances in season (1 Chronicles 12:32; Proverbs 21:5).',
  'Maintain the strategic plan, initiate and track Church Development Projects, and flag risks to strategic goals early.'),
 ('hand-of-christ',
  'To demonstrate the love of Christ through practical care for the vulnerable (James 1:27; Matthew 25:35-40).',
  'Provide benevolence, social support and relational care to members and the community with confidentiality and dignity.'),
 ('life-groups',
  'To build authentic community where believers are discipled, prayed for and cared for beyond the main gathering (Acts 2:46-47).',
  'Multiply healthy small groups with trained leaders who disciple members and escalate pastoral concerns appropriately.')
) AS v(slug, vision, mission)
WHERE departments.slug = v.slug;

-- 2) KPIs from the Job Specifications for departments that have none
INSERT INTO public.kpis (department_slug, category, kpi_name, target, period_type, period_date)
SELECT s.slug, s.category::kpi_category, s.kpi_name, s.target, s.period_type::kpi_period, date_trunc('month', CURRENT_DATE)::date
FROM (VALUES
 ('senior-pastor','spiritual_impact','Doctrinal integrity maintained across departments (%)',100,'quarterly'),
 ('senior-pastor','operational_excellence','Strategic and capital decisions made within governance timelines (%)',95,'quarterly'),
 ('senior-pastor','operational_excellence','Average departmental health score across the Ministry (%)',85,'quarterly'),
 ('senior-pastor','kingdom_influence','Vision alignment confirmed at quarterly review (%)',100,'quarterly'),

 ('chairperson','operational_excellence','Governance meetings held on schedule (%)',100,'monthly'),
 ('chairperson','operational_excellence','Resolutions implemented within agreed timelines (%)',90,'monthly'),
 ('chairperson','stewardship','Compliance findings closed out (%)',95,'quarterly'),
 ('chairperson','people_development','Governmental Structure offices staffed and functioning (%)',100,'quarterly'),

 ('strategic-adviser','operational_excellence','Strategic plan kept current (%)',100,'quarterly'),
 ('strategic-adviser','operational_excellence','Projects tracked against approved timelines (%)',90,'monthly'),
 ('strategic-adviser','kingdom_influence','Planning recommendations adopted (%)',75,'quarterly'),
 ('strategic-adviser','stewardship','Risks to strategic goals flagged early (%)',100,'quarterly'),

 ('resource-administrator','stewardship','Asset register accuracy (%)',98,'quarterly'),
 ('resource-administrator','operational_excellence','Facilities downtime (hours)',0,'monthly'),
 ('resource-administrator','operational_excellence','Resource requests fulfilled on time (%)',95,'monthly'),
 ('resource-administrator','stewardship','Project resource readiness (%)',90,'quarterly'),

 ('secretary','operational_excellence','Minutes distributed within agreed turnaround (%)',100,'monthly'),
 ('secretary','operational_excellence','Resolution tracking accuracy (%)',98,'monthly'),
 ('secretary','stewardship','Records audit findings (count)',0,'annual'),
 ('secretary','operational_excellence','Correspondence responded to within turnaround (%)',95,'monthly'),

 ('lead-pastor','spiritual_impact','Congregational health indicators (%)',85,'quarterly'),
 ('lead-pastor','operational_excellence','Departments supervised effectively (%)',100,'monthly'),
 ('lead-pastor','people_development','Leadership meetings attended (%)',95,'monthly'),
 ('lead-pastor','spiritual_impact','Conflict cases resolved (%)',90,'monthly'),

 ('associate-pastor','people_development','Leadership meetings attended (%)',95,'monthly'),
 ('associate-pastor','operational_excellence','Departments supervised effectively (%)',100,'monthly'),
 ('associate-pastor','people_development','Coaching sessions completed (%)',90,'monthly'),
 ('associate-pastor','operational_excellence','Reports submitted on time (%)',100,'monthly'),
 ('associate-pastor','kingdom_influence','Ministry outcomes achieved (%)',85,'quarterly'),

 ('elders','spiritual_impact','Pastoral care cases handled (%)',95,'monthly'),
 ('elders','people_development','Elders'' meeting attendance (%)',90,'monthly'),
 ('elders','spiritual_impact','Doctrinal issues escalated appropriately (%)',100,'quarterly'),
 ('elders','people_development','Active mentoring relationships (count)',12,'quarterly'),

 ('childrens-ministry','operational_excellence','Child safety incidents (count)',0,'monthly'),
 ('childrens-ministry','people_development','Worker screening completion (%)',100,'quarterly'),
 ('childrens-ministry','spiritual_impact','Children attendance and retention (%)',85,'monthly'),
 ('childrens-ministry','people_development','Parent satisfaction (%)',90,'quarterly'),

 ('sound-technical','operational_excellence','Service technical incidents (count)',0,'weekly'),
 ('sound-technical','operational_excellence','Livestream / audio quality issues (count)',0,'weekly'),
 ('sound-technical','stewardship','Equipment uptime (%)',99,'monthly'),
 ('sound-technical','stewardship','Refurbishment project milestones met (%)',100,'quarterly'),

 ('ushers','operational_excellence','Seating efficiency (%)',95,'weekly'),
 ('ushers','people_development','Visitor welcome score (%)',90,'monthly'),
 ('ushers','operational_excellence','Punctual readiness before service (%)',100,'weekly'),
 ('ushers','operational_excellence','Incident response time (minutes)',5,'monthly'),
 ('ushers','kingdom_influence','Number of visitors assisted (count)',50,'monthly'),

 ('prayer-intercession','spiritual_impact','Prayer watch coverage (%)',100,'weekly'),
 ('prayer-intercession','people_development','Intercessor training completion (%)',90,'quarterly'),
 ('prayer-intercession','spiritual_impact','Prayer requests followed up (%)',95,'monthly'),
 ('prayer-intercession','spiritual_impact','Breakthroughs / testimonies logged (count)',10,'monthly'),

 ('hospitality','people_development','Guest satisfaction feedback (%)',90,'monthly'),
 ('hospitality','operational_excellence','Hospitality readiness before services (%)',100,'weekly'),
 ('hospitality','stewardship','Budget adherence (%)',100,'monthly'),
 ('hospitality','people_development','Volunteer attendance (%)',90,'weekly'),

 ('protocol','operational_excellence','Service flow executed without disruption (%)',98,'weekly'),
 ('protocol','operational_excellence','Protocol team punctual readiness (%)',100,'weekly'),
 ('protocol','people_development','Guest and leader care rating (%)',95,'monthly'),
 ('protocol','people_development','Protocol training completion (%)',90,'quarterly'),

 ('discipleship','people_development','Class completion rate (%)',85,'quarterly'),
 ('discipleship','spiritual_impact','Active small groups (count)',15,'monthly'),
 ('discipleship','people_development','Mentor participation (%)',80,'quarterly'),
 ('discipleship','spiritual_impact','Retention of new believers (%)',80,'quarterly'),
 ('discipleship','spiritual_impact','Maturity milestones achieved (%)',75,'quarterly'),

 ('youth-ministry','spiritual_impact','Youth attendance (%)',85,'monthly'),
 ('youth-ministry','kingdom_influence','Visitor retention (%)',70,'monthly'),
 ('youth-ministry','people_development','Leadership pipeline growth (count)',8,'quarterly'),
 ('youth-ministry','kingdom_influence','Event participation (%)',80,'quarterly'),
 ('youth-ministry','people_development','Volunteer consistency (%)',90,'monthly'),

 ('womens-ministry','people_development','Meeting attendance (%)',85,'monthly'),
 ('womens-ministry','people_development','Active mentorship pairs (count)',15,'quarterly'),
 ('womens-ministry','kingdom_influence','Outreach projects completed (count)',4,'annual'),
 ('womens-ministry','people_development','Leadership development progress (%)',80,'quarterly'),

 ('mens-ministry','people_development','Meeting attendance (%)',85,'monthly'),
 ('mens-ministry','people_development','Active mentorship pairs (count)',15,'quarterly'),
 ('mens-ministry','kingdom_influence','Service project completion (%)',90,'quarterly'),
 ('mens-ministry','people_development','Leadership pipeline growth (count)',8,'quarterly'),

 ('school-of-ministry','people_development','Cohort completion rate (%)',85,'annual'),
 ('school-of-ministry','people_development','Track enrolment balance across all nine tracks (%)',80,'annual'),
 ('school-of-ministry','kingdom_influence','Graduate commissioning numbers (count)',25,'annual'),
 ('school-of-ministry','people_development','Mentorship programme satisfaction (%)',90,'annual'),
 ('school-of-ministry','kingdom_influence','Graduates placed into active ministry within 12 months (%)',75,'annual'),

 ('life-groups','spiritual_impact','Number of active groups (count)',12,'monthly'),
 ('life-groups','spiritual_impact','Group attendance and retention (%)',80,'monthly'),
 ('life-groups','people_development','Leader training completion (%)',95,'quarterly'),
 ('life-groups','spiritual_impact','Pastoral concerns escalated appropriately (%)',100,'monthly'),

 ('hand-of-christ','stewardship','Benevolence requests processed within turnaround (%)',95,'monthly'),
 ('hand-of-christ','operational_excellence','Cases appropriately referred (%)',100,'monthly'),
 ('hand-of-christ','operational_excellence','Confidentiality breaches (count)',0,'quarterly'),
 ('hand-of-christ','kingdom_influence','Community initiatives delivered (count)',4,'annual'),

 ('admin','operational_excellence','Member registrations approved within turnaround (%)',95,'monthly'),
 ('admin','operational_excellence','Platform uptime and access issues resolved (%)',98,'monthly'),
 ('admin','stewardship','Data accuracy and records integrity (%)',98,'quarterly'),
 ('admin','operational_excellence','Departmental support requests closed on time (%)',95,'monthly')
) AS s(slug, category, kpi_name, target, period_type)
WHERE EXISTS (SELECT 1 FROM public.departments d WHERE d.slug = s.slug)
  AND NOT EXISTS (
    SELECT 1 FROM public.kpis k
    WHERE k.department_slug = s.slug AND k.kpi_name = s.kpi_name
  );