/**
 * Signup approval notice.
 *
 * Kept as the stable entry point used by the signup screen, but it no longer
 * emails a hardcoded owner address: the notice now goes to whoever currently
 * holds an oversight office (chairperson, senior pastor, secretary, lead /
 * associate pastor), resolved live from user_roles by the central engine.
 */
export { notifyMemberRegistered as notifyPendingApproval } from "@/lib/activity.functions";
