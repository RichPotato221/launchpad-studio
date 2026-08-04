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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const roles = role?.roles ?? [];
  const canManage = slug === "finance" || roles.some((r) => FINANCE_ROLES.includes(r));

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Financial Command Centre</p>
        <h3 className="mt-2 font-serif text-2xl">Procurement</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          For any item that needs to be purchased — equipment, cables, instruments, hospitality items or any other
          ministry requirement — raise a Purchase Request below and attach the relevant quotation or supporting
          documents. The Finance Team will review the request, assess it against the available budget and ministry
          priorities, and either approve it or, where necessary, decline it and recommend a suitable alternative.
        </p>
      </Card>

      <Tabs defaultValue="procurement">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="procurement">Procurement</TabsTrigger>
        </TabsList>
        <TabsContent value="procurement" className="mt-6">
          <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading…</p>}>
            {userId ? (
              <ProcurementModule canManage={canManage} currentUserId={userId} departmentSlug={slug} scoped />
            ) : (
              <p className="p-6 text-sm text-muted-foreground">Loading…</p>
            )}
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
