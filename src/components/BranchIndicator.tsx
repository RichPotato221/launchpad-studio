import { useIdentity } from "@/lib/identity";
import { ALL_BRANCHES, BRANCH_LABELS, branchLabel, setBranchView, useBranchView } from "@/lib/branchView";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Senior Pastors get a branch switcher (they oversee the whole organisation).
 * Everyone else simply sees the branch they belong to — no selector, and no
 * way to look at another branch.
 */
export function BranchIndicator() {
  const identity = useIdentity();
  const view = useBranchView();
  const id = identity.data;
  if (!id) return null;

  const seesAll = id.roles.includes("senior_apostle");

  if (!seesAll) {
    if (!id.branch) return null;
    return (
      <span className="hidden shrink-0 rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted-foreground sm:inline-block">
        {branchLabel(id.branch)} Branch
      </span>
    );
  }

  return (
    <Select value={view} onValueChange={setBranchView}>
      <SelectTrigger className="h-8 w-[10.5rem] text-xs">
        <SelectValue placeholder="All Branches" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_BRANCHES}>All Branches</SelectItem>
        {Object.entries(BRANCH_LABELS).map(([code, label]) => (
          <SelectItem key={code} value={code}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
