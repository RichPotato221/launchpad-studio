import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("drizzle/migrations/0009_secure_finance_command_and_resource_reads.sql", "utf8");

describe("selected security fixes", () => {
  it("uses fixed finance statements without dynamic execution", () => {
    expect(sql).not.toMatch(/\bEXECUTE\s+(?:format|')/i);
    for (const table of ["purchase_requests", "budgets", "budget_adjustments"]) {
      expect(sql).toContain(`FROM public.${table} t WHERE id=_id FOR UPDATE`);
      expect(sql).toContain(`UPDATE public.${table} SET`);
    }
    expect(sql).toContain("_table IS NULL OR _table NOT IN");
  });

  it("preserves finance authorization, branch checks and decision history", () => {
    for (const safeguard of [
      "uid uuid:=auth.uid()", "IF uid IS NULL", "public.finance_is_reviewer(uid)",
      "public.finance_is_leader(uid)", "public.my_branch()", "IF uid=owner_id",
      "A different leadership authority must approve", "FOR UPDATE",
      "INSERT INTO public.finance_approval_decisions", "INSERT INTO public.notifications",
      "FROM PUBLIC,anon", "TO authenticated",
    ]) expect(sql).toContain(safeguard);
  });

  it("binds resource file reads to approved owners or visible resource records", () => {
    const policy = sql.slice(sql.indexOf('ALTER POLICY "Members read department resource files"'));
    expect(policy).toContain("TO authenticated");
    expect(policy).toContain("bucket_id = 'department-resources'");
    expect(policy).toContain("public.is_approved_member(auth.uid())");
    expect(policy).toContain("owner = auth.uid()");
    expect(policy).toContain("FROM public.department_resources resource");
    expect(policy).toContain("resource.storage_path = storage.objects.name");
    expect(sql.match(/ALTER POLICY/g)).toHaveLength(1);
  });
});