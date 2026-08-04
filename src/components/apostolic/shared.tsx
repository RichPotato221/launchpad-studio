import { type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { RAG_DOT, RAG_LABEL } from "@/lib/governance";
import { scoreRag } from "@/lib/apostolic";
import type { Rag } from "@/lib/finance";

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

export function ScoreDial({ label, value }: { label: string; value: number }) {
  const rag = scoreRag(value);
  return (
    <Card className="p-4">
      <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-serif text-2xl">{value}</span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${RAG_DOT[rag]}`} style={{ width: `${value}%` }} />
      </div>
      <p className="mt-1 text-[0.7rem] text-muted-foreground">{RAG_LABEL[rag]}</p>
    </Card>
  );
}

export function Dot({ rag }: { rag: Rag }) {
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${RAG_DOT[rag]}`} />;
}

export function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{title}</p>
          {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

export function BarRow({ label, value, max, hint }: { label: string; value: number; max: number; hint?: string }) {
  const w = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="text-xs text-muted-foreground">{hint ?? value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary" style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
