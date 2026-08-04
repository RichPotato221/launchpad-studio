import { Suspense, lazy, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/useCurrentRole";

const ProcurementModule = lazy(() => import("@/components/finance/ProcurementModule"));

const FINANCE_ROLES = [
  "senior_apostle",
  "senior_pastor",
  "chairperson",
  "secretary",
  "lead_pastor",
  "associate_pastor",
  "finance_officer",
  "treasurer",
];

/**
 * Financial Command Centre for a department — currently hosts Procurement,
 * where any department raises a Purchase Request for the Finance Team to review.
 */
export function DepartmentProcurement({ slug }: { slug: string }) {
  const { data: role } = useCurrentRole();
  const [userId, setUserId] = useState<string | null>(null);
  const [isFinanceMember, setIsFinanceMember] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const [{ data: profile }, { data: deptRoles }] = await Promise.all([
        supabase.from("profiles").select("primary_department").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("department_slug").eq("user_id", uid),
      ]);
      const finance = ["finance", "finance-administration"];
      setIsFinanceMember(
        finance.includes((profile as any)?.primary_department ?? "") ||
          (deptRoles ?? []).some((r: any) => finance.includes(r.department_slug ?? "")),
      );
    })();
  }, []);

  const roles = role?.roles ?? [];
  // Only the Finance team and executive leadership may approve/decline requests.
  const canManage = isFinanceMember || roles.some((r) => FINANCE_ROLES.includes(r));
  // The Finance department register receives purchase requests from every department.
  const isFinanceRegister = slug === "finance" || slug === "finance-administration";

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Financial Command Centre</p>
        <h3 className="mt-2 font-serif text-2xl">Procurement</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {isFinanceRegister
            ? "This is the central procurement register. Every Purchase Request raised by any department lands here for the Finance Team to review against the available budget and ministry priorities, and to approve or decline with a recommended alternative. All records are retained for audit."
            : "For any item that needs to be purchased — equipment, cables, instruments, hospitality items or any other ministry requirement — raise a Purchase Request below and attach the relevant quotation or supporting documents. Your request is sent to the Finance Department, who will review it against the available budget and ministry priorities, and either approve it or, where necessary, decline it and recommend a suitable alternative."}
        </p>
      </Card>

      <Tabs defaultValue="procurement">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="procurement">Procurement</TabsTrigger>
        </TabsList>
        <TabsContent value="procurement" className="mt-6">
          <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading…</p>}>
            {userId ? (
              <ProcurementModule
                canManage={canManage}
                currentUserId={userId}
                departmentSlug={slug}
                scoped={!isFinanceRegister}
              />
            ) : (
              <p className="p-6 text-sm text-muted-foreground">Loading…</p>
            )}
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

