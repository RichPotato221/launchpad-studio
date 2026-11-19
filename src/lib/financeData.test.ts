import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { fetchAllRows } from "./financeData";
describe("Complete Finance exports", () => {
  it("fetches 1201 matching records rather than only the current 25-row page", async () => {
    const records = Array.from({ length: 1201 }, (_, id) => ({ id }));
    const query = () => ({ range: async (from: number, to: number) => ({ data: records.slice(from, to + 1), error: null }) });
    const result = await fetchAllRows<{ id: number }>(query);
    expect(result).toHaveLength(1201);
    expect(result[1200].id).toBe(1200);
  });
  it("fails the export instead of silently returning incomplete rows", async () => {
    const query = () => ({ range: async () => ({ data: null, error: new Error("permission denied") }) });
    await expect(fetchAllRows(query)).rejects.toThrow("permission denied");
  });
});