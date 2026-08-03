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
    label: "Set-Lists & Song Library",
    component: lazy(() => import("@/components/workspaces/WorshipWorkspace")),
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
    label: "Check-In / Check-Out",
    component: lazy(() => import("@/components/workspaces/ChildrensWorkspace")),
  },
  "youth-ministry": {
    label: "Check-In / Check-Out",
    component: lazy(() => import("@/components/workspaces/ChildrensWorkspace")),
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
