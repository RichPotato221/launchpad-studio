import { useEffect, useState } from "react";
import { getEventRsvps, type RsvpRow } from "@/lib/eventRsvp.functions";

/** RSVP standing for the organiser: who accepted, declined, or has not replied. */
export function RsvpPanel({ eventId }: { eventId: string }) {
  const [rows, setRows] = useState<RsvpRow[] | null>(null);
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    let live = true;
    setRows(null);
    getEventRsvps({ data: { eventId } })
      .then((r: any) => {
        if (!live) return;
        setAllowed(r.allowed);
        setRows(r.rows ?? []);
      })
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, [eventId]);

  if (rows === null) return <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">Loading RSVPs…</p>;
  if (!allowed)
    return (
      <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
        Only the person who scheduled this meeting can see the RSVP list.
      </p>
    );

  const count = (s: string) => rows.filter((r) => r.response === s).length;
  const tone: Record<string, string> = {
    accepted: "text-emerald-600",
    declined: "text-destructive",
    pending: "text-muted-foreground",
  };

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs uppercase tracking-widest">
        <span className="text-emerald-600">Accepted {count("accepted")}</span>
        <span className="text-destructive">Declined {count("declined")}</span>
        <span className="text-muted-foreground">No reply {count("pending")}</span>
      </div>
      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <div key={r.email} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border px-3 py-2 text-sm">
            <div className="min-w-0">
              <span className="font-medium">{r.name ?? r.email}</span>
              {r.name && <span className="ml-2 text-xs text-muted-foreground">{r.email}</span>}
            </div>
            <span className={`text-xs uppercase tracking-widest ${tone[r.response]}`}>
              {r.response === "pending" ? "No reply yet" : r.response}
              {r.responded_at && (
                <span className="ml-2 normal-case tracking-normal text-muted-foreground">
                  {new Date(r.responded_at).toLocaleDateString()}
                </span>
              )}
            </span>
          </div>
        ))}
        {rows.length === 0 && <p className="text-center text-xs text-muted-foreground">No invitations recorded for this meeting yet.</p>}
      </div>
    </div>
  );
}

export default RsvpPanel;
