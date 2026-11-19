import FinanceCenter from "@/components/finance/FinanceCenter";
import type { WorkspaceProps } from "@/lib/workspaceRegistry";
/** Deprecated legacy entry: delegates to the single canonical Finance centre. */
export default function FinanceWorkspace({ currentUserId }: WorkspaceProps) {
  return <FinanceCenter currentUserId={currentUserId} />;
}
