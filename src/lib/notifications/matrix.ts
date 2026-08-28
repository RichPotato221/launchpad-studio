/**
 * NOTIFICATION MATRIX — the single documented source of truth for who is
 * notified by every activity in the portal.
 *
 * Nothing in this portal is ever sent to a hardcoded owner/admin address.
 * Administrative events are routed to whoever currently *holds the office*
 * (chairperson, senior pastor, secretary, lead/associate pastor), resolved
 * live from `user_roles`.
 */
import type { NotificationType } from "./types";

/** Roles that carry church-wide oversight — resolved from user_roles at send time. */
export const OVERSIGHT_ROLES = [
  "chairperson",
  "senior_apostle",
  "lead_pastor",
  "associate_pastor",
  "secretary",
] as const;

export interface MatrixEntry {
  event: NotificationType;
  /** Plain-language description of who is affected. */
  affected: string;
  email: boolean;
  inApp: boolean;
}

export const NOTIFICATION_MATRIX: MatrixEntry[] = [
  // Membership & access
  { event: "MEMBER_REGISTERED", affected: "Oversight офис holders (chairperson, senior pastor, secretary)", email: true, inApp: true },
  { event: "MEMBER_APPROVED", affected: "The member whose account was approved", email: true, inApp: true },
  { event: "MEMBER_REJECTED", affected: "The member whose application was declined", email: true, inApp: true },
  { event: "ROLE_ASSIGNED", affected: "The member whose role changed", email: true, inApp: true },
  { event: "ROLE_REMOVED", affected: "The member whose role was withdrawn", email: true, inApp: true },

  // Requests / procurement
  { event: "REQUEST_SUBMITTED", affected: "Requester + department members + the approving authority for the stage", email: true, inApp: true },
  { event: "REQUEST_APPROVED", affected: "Requester (+ next approver when the chain continues)", email: true, inApp: true },
  { event: "REQUEST_REJECTED", affected: "Requester", email: true, inApp: true },

  // Governance approvals
  { event: "APPROVAL_REQUIRED", affected: "Chairperson / senior pastor sign-off holders", email: true, inApp: true },
  { event: "APPROVAL_GRANTED", affected: "Submitter of the item", email: true, inApp: true },
  { event: "APPROVAL_REJECTED", affected: "Submitter of the item", email: true, inApp: true },

  // Tasks
  { event: "TASK_ASSIGNED", affected: "Assignee (creator excluded when they assigned themselves)", email: true, inApp: true },
  { event: "TASK_COMPLETED", affected: "Task creator", email: true, inApp: true },
  { event: "TASK_OVERDUE", affected: "Assignee + task creator", email: true, inApp: true },

  // Documents
  { event: "DOCUMENT_UPLOADED", affected: "Members of the owning department (uploader excluded)", email: true, inApp: true },
  { event: "DOCUMENT_UPDATED", affected: "Members of the owning department (editor excluded)", email: true, inApp: true },
  { event: "DOCUMENT_REVIEW_REQUIRED", affected: "Secretariat / oversight office holders", email: true, inApp: true },

  // Events & meetings
  { event: "EVENT_INVITATION", affected: "Named roster; otherwise the department and/or branch it belongs to", email: true, inApp: true },
  { event: "EVENT_UPDATED", affected: "Same audience as the invitation", email: true, inApp: true },
  { event: "EVENT_CANCELLED", affected: "Same audience as the invitation (critical — always sent)", email: true, inApp: true },
  { event: "MEETING_INVITATION", affected: "Invited attendees / department / branch", email: true, inApp: true },
  { event: "MEETING_UPDATED", affected: "Invited attendees", email: true, inApp: true },
  { event: "MEETING_CANCELLED", affected: "Invited attendees (critical)", email: true, inApp: true },

  // Communication
  { event: "ANNOUNCEMENT_CREATED", affected: "Target branch or the whole church (author excluded)", email: true, inApp: true },
  { event: "MESSAGE_RECEIVED", affected: "The recipient of the private message only", email: true, inApp: true },
  { event: "FEED_COMMENT", affected: "The post author (commenter excluded)", email: true, inApp: true },

  // System
  { event: "LEADERSHIP_NOTICE", affected: "The specific leaders addressed", email: true, inApp: true },
  { event: "SYSTEM_NOTIFICATION", affected: "The specific users the system event concerns", email: true, inApp: true },
];
