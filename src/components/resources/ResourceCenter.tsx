import { Suspense, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentRole } from "@/lib/useCurrentRole";
import { useIsDepartmentMember } from "@/lib/useIsDepartmentMember";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import type { WorkspaceProps } from "@/lib/workspaceRegistry";

const ResourceDashboard = lazyWithRetry(() => import("./ResourceDashboard"));
const AssetRegisterModule = lazyWithRetry(() => import("./AssetRegisterModule"));
const AllocationModule = lazyWithRetry(() => import("./AllocationModule"));
const FacilitiesModule = lazyWithRetry(() => import("./FacilitiesModule"));
const MaintenanceModule = lazyWithRetry(() => import("./MaintenanceModule"));
const ProjectsModule = lazyWithRetry(() => import("./ProjectsModule"));
const InventoryModule = lazyWithRetry(() => import("./InventoryModule"));
const RiskTrainingModule = lazyWithRetry(() => import("./RiskTrainingModule"));
const ResourceReports = lazyWithRetry(() => import("./ResourceReports"));
const ResourceAssistant = lazyWithRetry(() => import("./ResourceAssistant"));

const MANAGER_ROLES = ["senior_apostle", "chairperson", "secretary", "lead_pastor", "associate_pastor"];

/**
 * Office of the Resource Administrator —
 * Enterprise Asset, Facilities & Resource Management System (EAFMS).
 * This department is the single host of every physical resource in the church;
 * all other departments request, book and report resources through it.
 */
export default function ResourceCenter({ departmentSlug, currentUserId }: WorkspaceProps) {
  const { data: role } = useCurrentRole();
  const { data: isMember } = useIsDepartmentMember(departmentSlug);
  const [tab, setTab] = useState("dashboard");

  const roles = role?.roles ?? [];
  const canManage = !!isMember?.isMember || roles.some((r) => MANAGER_ROLES.includes(r));
  const isChair = roles.some((r) => ["chairperson", "senior_apostle"].includes(r));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl">Enterprise Asset, Facilities &amp; Resource Management</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The Office of the Resource Administrator hosts every church resource — assets, facilities, equipment,
          consumables, bookings and infrastructure projects — and serves every other department from one register.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="assets">Asset Register &amp; QR</TabsTrigger>
          <TabsTrigger value="allocation">Allocation &amp; Requests</TabsTrigger>
          <TabsTrigger value="facilities">Facilities &amp; Bookings</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="inventory">Inventory &amp; Procurement</TabsTrigger>
          <TabsTrigger value="projects">Development Projects</TabsTrigger>
          <TabsTrigger value="risk">Risk &amp; Training</TabsTrigger>
          <TabsTrigger value="reports">KPIs &amp; Reports</TabsTrigger>
          <TabsTrigger value="assistant">AI Assistant</TabsTrigger>
        </TabsList>

        <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading…</p>}>
          <TabsContent value="dashboard" className="mt-6"><ResourceDashboard /></TabsContent>
          <TabsContent value="assets" className="mt-6"><AssetRegisterModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
          <TabsContent value="allocation" className="mt-6"><AllocationModule canManage={canManage} isChair={isChair} currentUserId={currentUserId} /></TabsContent>
          <TabsContent value="facilities" className="mt-6"><FacilitiesModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
          <TabsContent value="maintenance" className="mt-6"><MaintenanceModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
          <TabsContent value="inventory" className="mt-6"><InventoryModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
          <TabsContent value="projects" className="mt-6"><ProjectsModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
          <TabsContent value="risk" className="mt-6"><RiskTrainingModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
          <TabsContent value="reports" className="mt-6"><ResourceReports /></TabsContent>
          <TabsContent value="assistant" className="mt-6"><ResourceAssistant /></TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}
