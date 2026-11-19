import { describe, it, expect } from "vitest";
import { canApprovePurchase, canApproveBudget, canMarkPurchasePaid, recognisedGiving, fundedAllocation, PROTECTED_FINANCE_TABLES } from "./financeRules";
import { attachmentPath } from "./financeAttachment";
import { buildTools, executeTool } from "./aiAgent";
const finance = { userId: "finance", roles: [], departments: ["finance"] };
const leader = { userId: "chair", roles: ["chairperson"], departments: [] };
describe("Finance safeguards", () => {
 it("requires two different budget approvers and prohibits requester approval", () => {
  expect(canApproveBudget(leader,{status:"submitted",created_by:"requester"})).toBe(false);
  expect(canApproveBudget(finance,{status:"submitted",created_by:"requester"})).toBe(true);
  expect(canApproveBudget(leader,{status:"finance_approved",finance_approved_by:"finance",created_by:"requester"})).toBe(true);
  expect(canApproveBudget(leader,{status:"finance_approved",finance_approved_by:"chair"})).toBe(false);
  expect(canApproveBudget(finance,{status:"submitted",created_by:"finance"})).toBe(false);
 });
 it("prevents a second payment after the first is posted", () => {
  expect(canMarkPurchasePaid({status:"senior_pastor_approved",payment_status:"approved"})).toBe(true);
  expect(canMarkPurchasePaid({status:"senior_pastor_approved",payment_status:"not_paid",ledger_entry_id:"posted"})).toBe(false);
 });
 it("requires Finance first, different leadership second, and no requester self-approval", () => {
  expect(canApprovePurchase(finance,{status:"submitted",requester_id:"requester"})).toBe(true);
  expect(canApprovePurchase(leader,{status:"submitted"})).toBe(false);
  expect(canApprovePurchase(leader,{status:"finance_approved",finance_approved_by:"finance"})).toBe(true);
  expect(canApprovePurchase(leader,{status:"finance_approved",finance_approved_by:"chair"})).toBe(false);
  expect(canApprovePurchase(finance,{status:"submitted",requester_id:"finance"})).toBe(false);
 });
 it("counts partial approvals but not interim Finance reviews", () => {
  expect(fundedAllocation([{status:"partially_approved",approved_amount:600,total_amount:1000},{status:"finance_approved",total_amount:900}])).toBe(600);
 });
 it("excludes draft and rejected giving", () => {
  expect(recognisedGiving([{amount:100,status:"completed"},{amount:50,status:"approved"},{amount:700,status:"draft"},{amount:900,status:"rejected"},{amount:200,status:"cancelled"}])).toBe(150);
 });
 it("retains posted giving in monetary totals after administrative archiving", () => {
  expect(recognisedGiving([{amount:100,status:"completed",archived_at:"2026-11-19"}])).toBe(100);
 });
 it("blocks generic AI finance changes and hard deletes", async () => {
  const specs = [{entity:"budget",table:"budgets",describe:"budget",columns:{status:{kind:"string" as const}}}];
  expect(buildTools(specs)).toEqual([]);
  const result = await executeTool(specs,"update_budget",{id:"a",status:"approved"},{supabase:{},userId:"u",actorLabel:"AI"});
  expect(result.result).toBe("Unknown tool: update_budget");
  expect(PROTECTED_FINANCE_TABLES).toContain("purchase_requests");
 });
 it("recovers object paths from old expiring links and new stored references", () => {
  expect(attachmentPath("https://example.test/storage/v1/object/sign/department-reports/finance/quote.pdf?token=expired")).toEqual({bucket:"department-reports",path:"finance/quote.pdf"});
  expect(attachmentPath("storage://department-reports/finance/quote.pdf")).toEqual({bucket:"department-reports",path:"finance/quote.pdf"});
 });
});
