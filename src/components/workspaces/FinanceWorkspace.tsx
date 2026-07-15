import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { WorkspaceProps } from "@/lib/workspaceRegistry";

export default function FinanceWorkspace({ departmentSlug, currentUserId }: WorkspaceProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ amount: "", description: "", receipt_url: "" });

  const load = async () => {
    const { data } = await supabase.from("expense_claims").select("*").eq("department_slug", departmentSlug).order("created_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [departmentSlug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.description) return;
    const { error } = await supabase.from("expense_claims").insert({
      department_slug: departmentSlug,
      claimant_id: currentUserId,
      amount: Number(form.amount),
      description: form.description,
      receipt_url: form.receipt_url || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Claim submitted");
    setForm({ amount: "", description: "", receipt_url: "" });
    load();
  };

  const advance = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "chair_approved") patch.approved_by_chair = currentUserId;
    if (status === "senior_pastor_approved") patch.approved_by_senior = currentUserId;
    const { error } = await supabase.from("expense_claims").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Submit an expense claim</p>
        <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-2">
          <div><Label>Amount</Label><Input type="number" step="any" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div><Label>Receipt URL</Label><Input value={form.receipt_url} onChange={(e) => setForm({ ...form, receipt_url: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Description</Label><Textarea rows={2} required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Button type="submit">Submit claim</Button></div>
        </form>
      </Card>

      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-serif text-lg">R {Number(r.amount).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{r.description}</p>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{r.status.replace(/_/g, " ")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {r.status === "pending" && <Button size="sm" onClick={() => advance(r.id, "chair_approved")}>Chair approve</Button>}
                {r.status === "chair_approved" && <Button size="sm" onClick={() => advance(r.id, "senior_pastor_approved")}>Senior Pastor approve</Button>}
                {r.status === "senior_pastor_approved" && <Button size="sm" onClick={() => advance(r.id, "paid")}>Mark paid</Button>}
                {!["rejected", "paid"].includes(r.status) && <Button size="sm" variant="outline" onClick={() => advance(r.id, "rejected")}>Reject</Button>}
                {r.receipt_url && <a className="text-xs underline self-center" href={r.receipt_url} target="_blank" rel="noreferrer">Receipt</a>}
              </div>
            </div>
          </Card>
        ))}
        {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No claims yet.</Card>}
      </div>
    </div>
  );
}
