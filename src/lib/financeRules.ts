export const FUNDED_BUDGET_STATUSES = ["approved", "partially_approved", "active", "locked"];
export const POSTED_STATUSES = ["approved", "completed"];
export const FINANCE_DEPARTMENTS = ["finance", "finance-administration"];
export const LEADERSHIP_APPROVERS = ["chairperson", "senior_apostle", "lead_pastor", "associate_pastor"];
export type FinanceActor = { userId: string; roles: string[]; departments: string[] };
export function isFinanceReviewer(a: FinanceActor) { return a.roles.includes("finance_officer") || a.departments.some(d => FINANCE_DEPARTMENTS.includes(d)); }
export function canApprovePurchase(a: FinanceActor, r: { requester_id?: string; status: string; finance_approved_by?: string; approved_by_chair?: string }) {
  if (a.userId === r.requester_id) return false;
  if (["submitted", "returned"].includes(r.status)) return isFinanceReviewer(a);
  return ["finance_approved", "chair_approved"].includes(r.status) && a.roles.some(x => LEADERSHIP_APPROVERS.includes(x)) && a.userId !== (r.finance_approved_by ?? r.approved_by_chair);
}
export function canMarkPurchasePaid(r: { status: string; payment_status?: string; ledger_entry_id?: string | null }) { return ["senior_pastor_approved", "ordered", "received"].includes(r.status) && r.payment_status !== "paid" && !r.ledger_entry_id; }
export function recognisedGiving(rows: { amount: number; status: string; archived_at?: string | null }[]) { return rows.filter(r => POSTED_STATUSES.includes(r.status) && !r.archived_at).reduce((s,r) => s + Number(r.amount),0); }
export function fundedAllocation(rows: { status: string; approved_amount?: number | null; total_amount: number }[]) { return rows.filter(r => FUNDED_BUDGET_STATUSES.includes(r.status)).reduce((s,r) => s + Number(r.approved_amount ?? r.total_amount),0); }
export const PROTECTED_FINANCE_TABLES = ["budgets", "budget_adjustments", "purchase_requests", "finance_entries", "expense_claims", "payroll_runs", "payroll_lines", "bank_statements", "bank_transactions", "fin_month_lines"];
