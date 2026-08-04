import type { Rag } from "@/lib/finance";

/** Shared vocabulary, configuration and scoring for the ministry team workspaces. */

export type TeamKey = "youth" | "women" | "men" | "care" | "life_groups" | "outreach";

export const TEAM_BY_SLUG: Record<string, TeamKey> = {
  "youth-ministry": "youth",
  youth: "youth",
  "womens-ministry": "women",
  women: "women",
  "mens-ministry": "men",
  men: "men",
  "hand-of-christ": "care",
  "hand-of-christ-social-relationships": "care",
  benevolence: "care",
  "life-groups": "life_groups",
  "life-group": "life_groups",
  cells: "life_groups",
  "outreach-evangelism": "outreach",
  outreach: "outreach",
  evangelism: "outreach",
};


export const DISCIPLESHIP_STAGES = [
  { key: "first_time_visitor", label: "First-time visitor" },
  { key: "new_believer", label: "New believer" },
  { key: "foundations", label: "Foundations class" },
  { key: "baptism", label: "Water baptism" },
  { key: "holy_spirit", label: "Holy Spirit teaching" },
  { key: "small_group", label: "Small group integration" },
  { key: "ministry", label: "Ministry involvement" },
  { key: "leadership_dev", label: "Leadership development" },
  { key: "mentoring", label: "Mentoring" },
  { key: "team_leader", label: "Team leadership" },
  { key: "department_leader", label: "Department leadership" },
] as const;

export const MEMBERSHIP_STATUSES = ["active", "irregular", "inactive", "transferred"] as const;
export const BAPTISM_STATUSES = ["not_baptised", "candidate", "baptised"] as const;
export const LEADERSHIP_LEVELS = ["member", "volunteer", "emerging_leader", "mentor", "team_leader", "coordinator"] as const;
export const SAFEGUARDING_STATUSES = ["pending", "in_progress", "cleared", "expired"] as const;

export const PRAYER_CATEGORIES = [
  "general",
  "family",
  "health",
  "academic",
  "career",
  "emotional",
  "marriage",
  "provision",
  "salvation",
  "leadership",
] as const;

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const TASK_STATUSES = ["todo", "in_progress", "blocked", "done"] as const;
export const OUTREACH_CATEGORIES = ["community", "school", "campus", "missions", "evangelism", "social", "support_project"] as const;

type TeamConfig = {
  key: TeamKey;
  label: string;
  title: string;
  strapline: string;
  memberWord: string;
  eventTypes: { key: string; label: string }[];
  courses: string[];
  riskCategories: string[];
  groupWord: string;
};

const SHARED_RISKS = [
  "safeguarding",
  "disengagement",
  "leadership_shortage",
  "volunteer_burnout",
  "doctrinal",
  "attendance",
  "follow_up",
  "team_conflict",
  "event_safety",
  "budget",
  "communication",
  "transition",
];

export const TEAM_CONFIG: Record<TeamKey, TeamConfig> = {
  youth: {
    key: "youth",
    label: "Youth Team",
    title: "Youth Discipleship, Leadership & Kingdom Purpose Centre",
    strapline:
      "“Let no one despise your youth, but be an example to the believers.” — 1 Timothy 4:12. Every young person tracked, discipled, mentored and released into their Kingdom assignment.",
    memberWord: "youth member",
    groupWord: "small group",
    eventTypes: [
      { key: "service", label: "Youth service" },
      { key: "bible_study", label: "Bible study" },
      { key: "prayer_night", label: "Prayer night" },
      { key: "worship_night", label: "Worship night" },
      { key: "conference", label: "Youth conference" },
      { key: "camp", label: "Camp" },
      { key: "retreat", label: "Leadership retreat" },
      { key: "outreach", label: "Evangelism outreach" },
      { key: "sports", label: "Sports event" },
      { key: "fellowship", label: "Fellowship gathering" },
      { key: "community", label: "Community service" },
      { key: "training", label: "Leadership / training session" },
    ],
    courses: [
      "Safeguarding certification",
      "Biblical discipleship",
      "Youth ministry leadership",
      "Mentoring skills",
      "Teaching & communication",
      "Conflict resolution",
      "Event planning",
      "Evangelism",
      "Leadership coaching",
      "Identity in Christ",
      "Kingdom leadership",
    ],
    riskCategories: SHARED_RISKS,
  },
  women: {
    key: "women",
    label: "Women's Team",
    title: "Women's Ministry Discipleship, Mentorship & Outreach Centre",
    strapline:
      "“She is clothed with strength and dignity.” — Proverbs 31:25. Discipleship, mentorship, family support, outreach and leadership development for every woman of the house.",
    memberWord: "woman",
    groupWord: "small group",
    eventTypes: [
      { key: "fellowship", label: "Women's fellowship" },
      { key: "prayer", label: "Prayer meeting" },
      { key: "bible_study", label: "Bible study" },
      { key: "retreat", label: "Retreat" },
      { key: "conference", label: "Conference" },
      { key: "workshop", label: "Workshop" },
      { key: "family", label: "Family event" },
      { key: "outreach", label: "Community outreach" },
      { key: "service", label: "Special service" },
      { key: "training", label: "Training session" },
    ],
    courses: [
      "Mentorship",
      "Leadership development",
      "Women's discipleship",
      "Family ministry",
      "Communication skills",
      "Pastoral care",
      "Biblical studies",
      "Volunteer development",
      "School of Ministry",
    ],
    riskCategories: SHARED_RISKS,
  },
  men: {
    key: "men",
    label: "Men's Team",
    title: "Men's Discipleship, Fatherhood & Leadership Development Centre",
    strapline:
      "“Watch, stand fast in the faith, be brave, be strong.” — 1 Corinthians 16:13. Discipleship, mentorship, fatherhood, service projects and leadership pipeline for every man of the house.",
    memberWord: "man",
    groupWord: "small group",
    eventTypes: [
      { key: "fellowship", label: "Men's fellowship" },
      { key: "breakfast", label: "Men's breakfast" },
      { key: "retreat", label: "Retreat" },
      { key: "prayer", label: "Prayer meeting" },
      { key: "bible_study", label: "Bible study" },
      { key: "fatherhood", label: "Fatherhood programme" },
      { key: "outreach", label: "Outreach" },
      { key: "support_project", label: "Church support project" },
      { key: "training", label: "Training session" },
      { key: "conference", label: "Conference" },
    ],
    courses: [
      "Fatherhood & family leadership",
      "Biblical manhood",
      "Mentorship training",
      "Discipleship",
      "Leadership development",
      "Communication skills",
      "Volunteer leadership",
      "Apostolic foundations",
      "Kingdom identity",
      "Servant leadership",
    ],
    riskCategories: SHARED_RISKS,
  },
  care: {
    key: "care",
    label: "Hand of Christ Team",
    title: "Hand of Christ — Compassion, Benevolence & Family Support Centre",
    strapline:
      "“Whatever you did for one of the least of these brothers and sisters of mine, you did for me.” — Matthew 25:40. Benevolence cases, family support, community outreach, volunteers and referrals — handled with confidentiality and Kingdom stewardship.",
    memberWord: "care worker",
    groupWord: "care team",
    tabs: {
      members: "Care team & volunteers",
      groups: "Case coordination & referrals",
      events: "Outreach projects & attendance",
      outreach: "Benevolence, community care & prayer",
      tasks: "Cases, visits & tasks",
    },
    eventTypes: [
      { key: "feeding", label: "Feeding scheme" },
      { key: "clothing", label: "Clothing drive" },
      { key: "winter", label: "Winter campaign" },
      { key: "hospital", label: "Hospital visit" },
      { key: "prison", label: "Prison ministry" },
      { key: "orphanage", label: "Orphanage visit" },
      { key: "elderly", label: "Elderly support" },
      { key: "school", label: "School support" },
      { key: "cleanup", label: "Community clean-up" },
      { key: "home_visit", label: "Home / welfare visit" },
      { key: "bereavement", label: "Bereavement support" },
      { key: "training", label: "Volunteer training" },
    ],
    courses: [
      "Compassion ministry",
      "Case management",
      "Safeguarding",
      "Confidentiality & POPIA",
      "Family support",
      "Crisis response",
      "Community outreach",
      "Leadership development",
      "Biblical stewardship",
      "Volunteer care",
    ],
    riskCategories: [
      "benevolence_fund_misuse",
      "confidentiality_breach",
      "volunteer_burnout",
      "delayed_assistance",
      "resource_shortage",
      "fraud",
      "case_backlog",
      "outreach_safety",
      "partnership",
      "safeguarding",
      "budget",
      "communication",
    ],
  },
  life_groups: {
    key: "life_groups",
    label: "Life Groups Team",
    title: "Life Groups — Discipleship, Small Groups & Pastoral Care Centre",
    strapline:
      "“They broke bread in their homes and ate together with glad and sincere hearts.” — Acts 2:46. Every group, leader, meeting, member and multiplication milestone in one discipleship ecosystem.",
    memberWord: "group member",
    groupWord: "life group",
    tabs: {
      members: "Members & discipleship journey",
      groups: "Life group directory & leaders",
      events: "Meetings, huddles & attendance",
      outreach: "Pastoral care, referrals & prayer",
      tasks: "Follow-ups & tasks",
    },
    eventTypes: [
      { key: "weekly_meeting", label: "Weekly life group meeting" },
      { key: "leader_huddle", label: "Leader huddle" },
      { key: "prayer_night", label: "Prayer night" },
      { key: "training", label: "Leader training" },
      { key: "evangelism", label: "Evangelism / invite night" },
      { key: "retreat", label: "Retreat" },
      { key: "conference", label: "Conference" },
      { key: "fellowship", label: "Fellowship / social" },
      { key: "outreach", label: "Community outreach" },
      { key: "launch", label: "New group launch" },
    ],
    courses: [
      "Life group leadership",
      "Discipleship",
      "Pastoral care",
      "Conflict resolution",
      "Biblical doctrine",
      "Counselling basics",
      "Leadership development",
      "Evangelism",
      "Small group facilitation",
      "Kingdom culture",
    ],
    riskCategories: [
      "leader_burnout",
      "inactive_groups",
      "declining_attendance",
      "doctrinal",
      "pastoral_issue",
      "member_conflict",
      "volunteer_shortage",
      "communication",
      "leadership_vacancy",
      "safeguarding",
      "follow_up",
      "budget",
    ],
  },
  outreach: {
    key: "outreach",
    label: "Outreach & Evangelism Team",
    title: "Outreach & Evangelism — Kingdom Mission Management Centre",
    strapline:
      "“Go into all the world and preach the gospel to all creation.” — Mark 16:15. Campaigns, gospel contacts, salvations, discipleship handoff, volunteers, partnerships and Kingdom impact in one system.",
    memberWord: "evangelist / contact",
    groupWord: "outreach team",
    tabs: {
      members: "Evangelism CRM & converts",
      groups: "Teams & discipleship handoff",
      events: "Campaigns, events & attendance",
      outreach: "Outreach projects & prayer",
      tasks: "Follow-ups & tasks",
    },
    eventTypes: [
      { key: "street", label: "Street evangelism" },
      { key: "mall", label: "Mall evangelism" },
      { key: "door_to_door", label: "Door-to-door" },
      { key: "hospital", label: "Hospital ministry" },
      { key: "prison", label: "Prison ministry" },
      { key: "school", label: "School outreach" },
      { key: "campus", label: "University outreach" },
      { key: "marketplace", label: "Marketplace evangelism" },
      { key: "crusade", label: "Crusade / revival" },
      { key: "prayer_walk", label: "Prayer walk" },
      { key: "mission_trip", label: "Mission trip" },
      { key: "community", label: "Community service project" },
      { key: "training", label: "Evangelism training" },
    ],
    courses: [
      "Personal evangelism",
      "Apologetics",
      "Street evangelism",
      "Marketplace evangelism",
      "Cross-cultural missions",
      "Children & youth evangelism",
      "Follow-up & discipleship",
      "Outreach safety",
      "Prayer & intercession",
      "Kingdom worldview & seven spheres",
      "Leadership development",
    ],
    riskCategories: [
      "outreach_safety",
      "follow_up",
      "volunteer_burnout",
      "volunteer_shortage",
      "transport",
      "budget",
      "community_permission",
      "partnership",
      "doctrinal",
      "data_privacy",
      "communication",
      "leadership_shortage",
    ],
  },
};


export function teamFromSlug(slug: string): TeamKey {
  return TEAM_BY_SLUG[slug] ?? "youth";
}

export function labelFor(list: readonly { key: string; label: string }[], key?: string | null) {
  return list.find((l) => l.key === key)?.label ?? nice(key);
}

export function nice(s?: string | null) {
  if (!s) return "—";
  return s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function stageIndex(stage?: string | null) {
  const i = DISCIPLESHIP_STAGES.findIndex((s) => s.key === stage);
  return i < 0 ? 0 : i;
}

export function stageProgress(stage?: string | null) {
  return Math.round((stageIndex(stage) / (DISCIPLESHIP_STAGES.length - 1)) * 100);
}

export function nextStage(stage?: string | null) {
  const i = stageIndex(stage);
  return DISCIPLESHIP_STAGES[Math.min(i + 1, DISCIPLESHIP_STAGES.length - 1)];
}

export function ragForScore(value: number, amberAt = 75, redAt = 50): Rag {
  if (value >= amberAt) return "green";
  if (value >= redAt) return "amber";
  return "red";
}

export function riskScore(likelihood: number, impact: number) {
  return Number(likelihood ?? 0) * Number(impact ?? 0);
}

export function ragForRisk(score: number): Rag {
  if (score >= 15) return "red";
  if (score >= 8) return "amber";
  return "green";
}

export function daysUntil(iso?: string | null) {
  if (!iso) return null;
  return Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
}

export function age(dob?: string | null) {
  if (!dob) return null;
  const d = new Date(dob);
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 86400000));
}

/** Birthdays falling in the next `days` window (ignores year). */
export function upcomingBirthdays(members: any[], days = 30) {
  const now = new Date();
  return members
    .filter((m) => m.date_of_birth)
    .map((m) => {
      const d = new Date(m.date_of_birth);
      const next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
      if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) next.setFullYear(now.getFullYear() + 1);
      return { ...m, _in: Math.round((next.getTime() - now.getTime()) / 86400000), _on: next.toISOString().slice(0, 10) };
    })
    .filter((m) => m._in <= days)
    .sort((a, b) => a._in - b._in);
}
