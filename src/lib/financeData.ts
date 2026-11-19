import { supabase } from "@/integrations/supabase/client";
import type { QueryClient } from "@tanstack/react-query";
export async function fetchAllRows<T = any>(makeQuery: () => any): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await makeQuery().range(offset, offset + 499);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < 500) return rows;
  }
}
export function invalidateFinance(qc: QueryClient) { return qc.invalidateQueries({ predicate: q => /finance|giving|budget|church-finance|leadership-pr|procurement|recon|bank-|payroll|fin-month/.test(String(q.queryKey[0])) }); }
export async function financeAction(table: "purchase_requests" | "budgets" | "budget_adjustments", id: string, action: string, amount?: number, note?: string, accountId?: string) {
  const { data, error } = await (supabase as any).rpc("finance_command", { _table: table, _id: id, _action: action, _amount: amount ?? null, _note: note ?? null, _account_id: accountId ?? null });
  if (error) throw error;
  return data;
}
