import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export type WorkspaceProps = {
  departmentSlug: string;
  currentUserId: string;
};

type Entry = {
  label: string;
  component: LazyExoticComponent<ComponentType<WorkspaceProps>>;
};

export const workspaceRegistry: Record<string, Entry> = {
  worship: {
    label: "Worship Operations Platform",
    component: lazy(() => import("@/components/worship/WorshipCenter")),
  },
  "worship-music": {
    label: "Worship Operations Platform",
    component: lazy(() => import("@/components/worship/WorshipCenter")),
  },
  music: {
    label: "Worship Operations Platform",
    component: lazy(() => import("@/components/worship/WorshipCenter")),
  },
  "praise-worship": {
    label: "Worship Operations Platform",
    component: lazy(() => import("@/components/worship/WorshipCenter")),
  },

  "resource-administrator": {
    label: "Enterprise Asset, Facilities & Resource Management",
    component: lazy(() => import("@/components/resources/ResourceCenter")),
  },
  resources: {
    label: "Enterprise Asset, Facilities & Resource Management",
    component: lazy(() => import("@/components/resources/ResourceCenter")),
  },
  assets: {
    label: "Enterprise Asset, Facilities & Resource Management",
    component: lazy(() => import("@/components/resources/ResourceCenter")),
  },
  facilities: {
    label: "Enterprise Asset, Facilities & Resource Management",
    component: lazy(() => import("@/components/resources/ResourceCenter")),
  },

  "school-of-ministry": {
    label: "Courses & Enrolments",
    component: lazy(() => import("@/components/workspaces/SchoolOfMinistryWorkspace")),
  },
  discipleship: {
    label: "Courses & Enrolments",
    component: lazy(() => import("@/components/workspaces/SchoolOfMinistryWorkspace")),
  },
  "outreach-evangelism": {
    label: "Souls-Won Register",
    component: lazy(() => import("@/components/workspaces/OutreachWorkspace")),
  },
  outreach: {
    label: "Souls-Won Register",
    component: lazy(() => import("@/components/workspaces/OutreachWorkspace")),
  },
  "evangelism": {
    label: "Souls-Won Register",
    component: lazy(() => import("@/components/workspaces/OutreachWorkspace")),
  },
  media: {
    label: "Editorial Calendar",
    component: lazy(() => import("@/components/workspaces/MediaWorkspace")),
  },
  "media-communications": {
    label: "Editorial Calendar",
    component: lazy(() => import("@/components/workspaces/MediaWorkspace")),
  },
  "childrens-ministry": {
    label: "Children's Ministry Management System",
    component: lazy(() => import("@/components/kids/ChildrensMinistryCenter")),
  },
  children: {
    label: "Children's Ministry Management System",
    component: lazy(() => import("@/components/kids/ChildrensMinistryCenter")),
  },
  kids: {
    label: "Children's Ministry Management System",
    component: lazy(() => import("@/components/kids/ChildrensMinistryCenter")),
  },
  "youth-ministry": {
    label: "Children's Ministry Management System",
    component: lazy(() => import("@/components/kids/ChildrensMinistryCenter")),
  },
  secretary: {
    label: "Secretarial Office",
    component: lazy(() => import("@/components/secretariat/SecretariatCenter")),
  },
  chairperson: {
    label: "Executive Governance Command Centre",
    component: lazy(() => import("@/components/chairperson/ChairpersonCenter")),
  },
  "associate-pastor": {
    label: "Ministry Operations & Shepherding Command Centre",
    component: lazy(() => import("@/components/pastoral/PastoralCenter")),
  },
  "lead-pastor": {
    label: "Ministry Operations & Shepherding Command Centre",
    component: lazy(() => import("@/components/pastoral/PastoralCenter")),
  },

  "sound-technical": {
    label: "Technical Operations Centre",
    component: lazy(() => import("@/components/technical/TechnicalCenter")),
  },
  "sound-and-technical": {
    label: "Technical Operations Centre",
    component: lazy(() => import("@/components/technical/TechnicalCenter")),
  },
  sound: {
    label: "Technical Operations Centre",
    component: lazy(() => import("@/components/technical/TechnicalCenter")),
  },
  technical: {
    label: "Technical Operations Centre",
    component: lazy(() => import("@/components/technical/TechnicalCenter")),
  },
  av: {
    label: "Technical Operations Centre",
    component: lazy(() => import("@/components/technical/TechnicalCenter")),
  },

  "strategic-adviser": {
    label: "Strategy Management Office",
    component: lazy(() => import("@/components/strategy/StrategyCenter")),
  },
  "strategic-adviser-planner": {
    label: "Strategy Management Office",
    component: lazy(() => import("@/components/strategy/StrategyCenter")),
  },
  strategy: {
    label: "Strategy Management Office",
    component: lazy(() => import("@/components/strategy/StrategyCenter")),
  },
  "strategic-planning": {
    label: "Strategy Management Office",
    component: lazy(() => import("@/components/strategy/StrategyCenter")),
  },
  planning: {
    label: "Strategy Management Office",
    component: lazy(() => import("@/components/strategy/StrategyCenter")),
  },

  finance: {
    label: "Financial Command Centre",
    component: lazy(() => import("@/components/finance/FinanceCenter")),
  },
  "finance-administration": {
    label: "Financial Command Centre",
    component: lazy(() => import("@/components/finance/FinanceCenter")),
  },
  // Seven Mountains — share the same shape
  family: { label: "Kingdom Projects", component: lazy(() => import("@/components/workspaces/SevenMountainsWorkspace")) },
  education: { label: "Kingdom Projects", component: lazy(() => import("@/components/workspaces/SevenMountainsWorkspace")) },
  government: { label: "Kingdom Projects", component: lazy(() => import("@/components/workspaces/SevenMountainsWorkspace")) },
  "business-economics": { label: "Kingdom Projects", component: lazy(() => import("@/components/workspaces/SevenMountainsWorkspace")) },
  "media-communication": { label: "Kingdom Projects", component: lazy(() => import("@/components/workspaces/SevenMountainsWorkspace")) },
  "arts-entertainment-sports": { label: "Kingdom Projects", component: lazy(() => import("@/components/workspaces/SevenMountainsWorkspace")) },
  religion: { label: "Kingdom Projects", component: lazy(() => import("@/components/workspaces/SevenMountainsWorkspace")) },
  // Five-Fold offices (under Religion) — each gets its own project pipeline
  apostolic: { label: "Apostolic Projects", component: lazy(() => import("@/components/workspaces/SevenMountainsWorkspace")) },
  prophetic: { label: "Prophetic Projects", component: lazy(() => import("@/components/workspaces/SevenMountainsWorkspace")) },
  evangelistic: { label: "Evangelistic Projects", component: lazy(() => import("@/components/workspaces/SevenMountainsWorkspace")) },
  pastoral: { label: "Pastoral Projects", component: lazy(() => import("@/components/workspaces/SevenMountainsWorkspace")) },
  teaching: { label: "Teaching Projects", component: lazy(() => import("@/components/workspaces/SevenMountainsWorkspace")) },
};

export function getWorkspaceFor(slug: string) {
  return workspaceRegistry[slug] ?? null;
}
