
UPDATE public.departments SET functions = ARRAY[
  'Plant, oversee and align Kingdom Centres under sound apostolic covering.',
  'Guard doctrine and lay foundations of faith across the movement.',
  'Commission and steward ministers, elders and leaders.',
  'Convene apostolic councils, ordinations and constitutional reviews.',
  'Resource and steward Kingdom assignments for global impact.'
] WHERE slug = 'apostolic';

UPDATE public.departments SET functions = ARRAY[
  'Train, weigh and release prophetic voices with biblical accountability.',
  'Restore integrity, purity and order to prophetic ministry.',
  'Facilitate prayer, intercession and prophetic strategy for the house.',
  'Test every prophetic word against Scripture and pastoral oversight.',
  'Mentor emerging prophets through structured schools and mentorship.'
] WHERE slug = 'prophetic';

UPDATE public.departments SET functions = ARRAY[
  'Mobilise personal witnessing, crusades and community outreaches.',
  'Follow up new converts and hand them into discipleship pathways.',
  'Coordinate mission trips and church-planting outreach teams.',
  'Track souls won, baptisms and integration into local assemblies.',
  'Equip believers with the tools and message of the Gospel.'
] WHERE slug = 'evangelistic';

UPDATE public.departments SET functions = ARRAY[
  'Shepherd members through visitation, counselling and member care.',
  'Oversee small groups, care teams and pastoral covering per branch.',
  'Minister to the sick, the bereaved, marriages and families.',
  'Identify and raise elders, care leaders and small-group shepherds.',
  'Ensure every member is known, loved and pastorally accounted for.'
] WHERE slug = 'pastoral';

UPDATE public.departments SET functions = ARRAY[
  'Deliver systematic Bible teaching in services and classes.',
  'Design and update the School of Ministry curriculum and modules.',
  'Assess doctrinal understanding through checkpoints and assignments.',
  'Train and certify teachers, facilitators and Bible-study leaders.',
  'Publish teaching notes, study guides and doctrinal position papers.'
] WHERE slug = 'teaching';

UPDATE public.departments SET
  functions = ARRAY[
    'Serve as the Religion Mountain hub for the Five-Fold offices.',
    'Coordinate doctrine, mission and Kingdom Centre planting across the five offices.',
    'Champion apostolic order, prophetic integrity and pastoral care.',
    'Interface with other Mountains on behalf of the church.'
  ],
  purpose = 'Religion Mountain hub — coordinates the five ascension-gift offices (Apostolic, Prophetic, Evangelistic, Pastoral, Teaching). Open each office below for its own vision, KPIs, projects, storage and team.'
WHERE slug = 'religion';
