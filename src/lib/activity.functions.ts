import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * ACTIVITY NOTIFICATIONS
 *
 * One server function per notifiable activity. Each one reads the affected
 * entity server-side and derives its own recipients from the real data
 * relationships (owner, requester, assignee, department, office holders).
 * No caller ever supplies an email address, and no owner/admin address is
 * hardcoded anywhere.
 */

const OVERSIGHT_ROLES = ["chairperson", "secretary", "senior_apostle"];
const FINANCE_ROLES = ["chairperson", "senior_apostle", "department_chair", "finance_officer", "treasurer"];

async function svc() {
  return await import("@/lib/notifications/service.server");
}

/* ───────────── membership & access ───────────── */

/** A new member signed up: whoever currently holds an oversight office is told. */
export const notifyMemberRegistered = createServerFn({ method: "POST" })
  .inputValidator((d: { profileId?: string; fullName: string; email: string; branch?: string; department?: string; role?: string }) => d)
  .handler(async ({ data }) => {
    const { dispatchNotification } = await svc();
    return await dispatchNotification({
      type: "MEMBER_REGISTERED",
      entityType: "profile",
      entityId: data.profileId ?? null,
      entityVersion: data.email.toLowerCase(),
      audience: { roles: OVERSIGHT_ROLES },
      metadata: {
        heading: "New portal signup awaiting approval",
        subject: `New portal signup awaiting approval: ${data.fullName}`,
        body: `${data.fullName} has requested access to the portal and is waiting for approval.`,
        details: [
          ["Name", data.fullName],
          ["Email", data.email],
          ["Branch", data.branch ?? "—"],
          ["Department", data.department ?? "—"],
          ["Role", data.role ?? "—"],
        ],
        action_label: "Review the request",
        path: "/admin",
      },
    });
  });

/** Approval / rejection goes to the member concerned, never to the office. */
export const notifyMemberDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; approved: boolean }) => d)
  .handler(async ({ data }) => {
    const { dispatchNotification } = await svc();
    return await dispatchNotification({
      type: data.approved ? "MEMBER_APPROVED" : "MEMBER_REJECTED",
      entityType: "profile",
      entityId: data.userId,
      entityVersion: `${data.approved}`,
      audience: { userIds: [data.userId] },
      metadata: {
        heading: data.approved ? "Your portal access has been approved" : "Your portal access request",
        body: data.approved
          ? "Your membership has been approved. You can now sign in and access your department workspace."
          : "Your portal access request was not approved at this time. Please contact your department leader for guidance.",
        action_label: data.approved ? "Sign in to the portal" : "Open the portal",
        path: "/home",
      },
    });
  });

/** Role granted or withdrawn: the member whose access changed is told. */
export const notifyRoleChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: string; departmentSlug?: string | null; action: "assigned" | "removed" }) => d)
  .handler(async ({ data }) => {
    const { dispatchNotification } = await svc();
    const scope = data.departmentSlug ? ` for ${data.departmentSlug}` : " (church-wide)";
    return await dispatchNotification({
      type: data.action === "assigned" ? "ROLE_ASSIGNED" : "ROLE_REMOVED",
      entityType: "profile",
      entityId: data.userId,
      entityVersion: `${data.action}:${data.role}:${data.departmentSlug ?? ""}:${Date.now()}`,
      audience: { userIds: [data.userId] },
      metadata: {
        heading: data.action === "assigned" ? "A new role has been assigned to you" : "A role has been withdrawn",
        body:
          data.action === "assigned"
            ? `You have been assigned the role of ${data.role}${scope}. Your portal access has been updated accordingly.`
            : `The role of ${data.role}${scope} has been removed from your portal access.`,
        action_label: "Open the portal",
        path: "/home",
      },
    });
  });

/* ───────────── purchase requests / procurement ───────────── */

export const notifyPurchaseRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { requestId: string; stage: "submitted" | "department_approved" | "approved" | "rejected"; comment?: string | null }) => d,
  )
  .handler(async ({ data, context }) => {
    const { dispatchNotification, getAdmin } = await svc();
    const admin = await getAdmin();
    const { data: pr } = await admin.from("purchase_requests").select("*").eq("id", data.requestId).maybeSingle();
    if (!pr) return { queued: 0, reason: "not_found" };

    const requesterId = pr.requester_id ?? pr.created_by ?? null;
    const requester: string[] = requesterId ? [requesterId] : [];
    const amount = pr.amount_estimated != null ? `R ${Number(pr.amount_estimated).toLocaleString()}` : "—";
    const details = [
      ["Reference", pr.pr_number ?? pr.request_number ?? String(pr.id).slice(0, 8)],
      ["Item", pr.title ?? pr.description ?? "—"],
      ["Department", pr.department_slug ?? "—"],
      ["Amount", amount],
      ["Status", pr.status ?? "—"],
    ];

    const common = {
      entityType: "purchase_request",
      entityId: pr.id,
      entityVersion: `${data.stage}:${pr.updated_at ?? ""}`,
    } as const;

    // Approvers are branch-scoped: the Chairpersons and finance authorities of
    // the branch that raised the request (Senior Pastors always oversee all).
    const prBranch = (pr as any).branch ?? undefined;

    if (data.stage === "submitted") {
      // Requester's own department (so leaders see it) + the finance/chair
      // authorities responsible for the next action. Requester is excluded
      // from the approver notice and gets their own acknowledgement.
      const approvers = await dispatchNotification({
        ...common,
        type: "REQUEST_SUBMITTED",
        audience: { roles: FINANCE_ROLES, branch: prBranch, excludeUserIds: requester },
        metadata: {
          heading: "Purchase request awaiting your approval",
          body: `A purchase request from ${pr.department_slug ?? "a department"} needs review.`,
          details,
          action_label: "Review the request",
          path: "/finance",
        },
      });

      const own = requester.length
        ? await dispatchNotification({
            ...common,
            entityVersion: `${data.stage}:ack:${pr.updated_at ?? ""}`,
            type: "REQUEST_SUBMITTED",
            audience: { userIds: requester },
            metadata: {
              heading: "Your purchase request was submitted",
              body: "Your request has been logged and is now with the approving authority.",
              details,
              action_label: "Track your request",
              path: "/departments",
            },
          })
        : { queued: 0, sent: 0 };
      return { approvers, requester: own };
    }

    const approved = data.stage !== "rejected";
    return await dispatchNotification({
      ...common,
      type: approved ? "REQUEST_APPROVED" : "REQUEST_REJECTED",
      audience: {
        userIds: requester,
        ...(data.stage === "department_approved" ? { roles: FINANCE_ROLES, branch: prBranch } : {}),
        excludeUserIds: [context.userId],
      },

      metadata: {
        heading:
          data.stage === "department_approved"
            ? "Purchase request approved by the department — finance sign-off required"
            : approved
              ? "Your purchase request was approved"
              : "Your purchase request was declined",
        body: data.comment ? String(data.comment) : undefined,
        details,
        action_label: "Open the request",
        path: "/finance",
      },
    });
  });

/* ───────────── governance approvals ───────────── */

export const notifyGovernanceApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { approvalId: string; stage: "submitted" | "approved" | "rejected"; comment?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const { dispatchNotification, getAdmin } = await svc();
    const admin = await getAdmin();
    const { data: row } = await admin.from("governance_approvals").select("*").eq("id", data.approvalId).maybeSingle();
    if (!row) return { queued: 0, reason: "not_found" };

    const details = [
      ["Item", row.title],
      ["Type", row.item_type],
      ["Reference", row.reference ?? "—"],
      ["Department", row.department_slug ?? "church-wide"],
    ];

    if (data.stage === "submitted") {
      return await dispatchNotification({
        type: "APPROVAL_REQUIRED",
        entityType: "governance_approval",
        entityId: row.id,
        entityVersion: `submitted:${row.created_at ?? ""}`,
        audience: {
          roles: ["chairperson", "senior_apostle", "secretary"],
          ...(row.branch ? { branch: row.branch } : {}),
          excludeUserIds: [context.userId],
        },
        metadata: {
          heading: "An item is awaiting your executive sign-off",
          body: row.detail ?? undefined,
          details,
          action_label: "Review and sign",
          path: "/departments/chairperson",
        },
      });
    }

    if (!row.submitted_by) return { queued: 0, reason: "no_submitter" };
    return await dispatchNotification({
      type: data.stage === "approved" ? "APPROVAL_GRANTED" : "APPROVAL_REJECTED",
      entityType: "governance_approval",
      entityId: row.id,
      entityVersion: `${data.stage}:${row.decided_at ?? ""}`,
      audience: { userIds: [row.submitted_by], excludeUserIds: [] },
      metadata: {
        heading: data.stage === "approved" ? "Your item was approved" : "Your item was not approved",
        body: data.comment ? String(data.comment) : undefined,
        details,
        action_label: "Open the register",
        path: "/departments/chairperson",
      },
    });
  });

/* ───────────── tasks ───────────── */

export const notifyTaskActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { taskId: string; stage: "assigned" | "completed" }) => d)
  .handler(async ({ data, context }) => {
    const { dispatchNotification, getAdmin } = await svc();
    const admin = await getAdmin();
    const { data: task } = await admin.from("tasks").select("*").eq("id", data.taskId).maybeSingle();
    if (!task) return { queued: 0, reason: "not_found" };

    const details = [
      ["Task", task.title],
      ["Department", task.department_slug ?? "—"],
      ["Due", task.due_date ?? "—"],
      ["Priority", task.priority ?? "normal"],
    ];

    const targets =
      data.stage === "assigned"
        ? [task.assigned_to].filter(Boolean)
        : [task.created_by, task.assigned_to].filter(Boolean);
    if (!targets.length) return { queued: 0, reason: "no_recipients" };

    return await dispatchNotification({
      type: data.stage === "assigned" ? "TASK_ASSIGNED" : "TASK_COMPLETED",
      entityType: "task",
      entityId: task.id,
      entityVersion: `${data.stage}:${task.updated_at ?? ""}`,
      audience: { userIds: targets as string[], excludeUserIds: [context.userId] },
      metadata: {
        heading: data.stage === "assigned" ? "A task has been assigned to you" : "A task was marked complete",
        body: task.description ?? undefined,
        details,
        action_label: "Open tasks",
        path: "/tasks",
      },
    });
  });

/* ───────────── documents ───────────── */

export const notifyDocumentActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { documentId: string; action: "uploaded" | "updated" }) => d)
  .handler(async ({ data, context }) => {
    const { dispatchNotification, getAdmin } = await svc();
    const admin = await getAdmin();
    const { data: doc } = await admin.from("documents").select("*").eq("id", data.documentId).maybeSingle();
    if (!doc) return { queued: 0, reason: "not_found" };

    // Only the department that owns the document (plus the secretariat for
    // church-wide records) — never the whole membership.
    const audience = doc.department_slug
      ? {
          departmentSlug: doc.department_slug,
          ...(doc.branch ? { branch: doc.branch } : {}),
          excludeUserIds: [context.userId],
        }
      : {
          roles: ["chairperson", "senior_apostle", "secretary"],
          ...(doc.branch ? { branch: doc.branch } : {}),
          excludeUserIds: [context.userId],
        };

    return await dispatchNotification({
      type: data.action === "uploaded" ? "DOCUMENT_UPLOADED" : "DOCUMENT_UPDATED",
      entityType: "document",
      entityId: doc.id,
      entityVersion: `${data.action}:${doc.updated_at ?? doc.version ?? ""}`,
      audience,
      metadata: {
        heading: data.action === "uploaded" ? "A new document was published" : "A controlled document was updated",
        body: doc.description ?? undefined,
        details: [
          ["Document", doc.title],
          ["Number", doc.doc_number ?? "—"],
          ["Version", doc.version ?? "—"],
          ["Department", doc.department_slug ?? "church-wide"],
          ["Status", doc.status ?? "—"],
        ],
        action_label: "Open the document register",
        path: "/documents",
      },
    });
  });
