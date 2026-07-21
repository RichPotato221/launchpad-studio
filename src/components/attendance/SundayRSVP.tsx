import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Response = "yes" | "maybe" | "no";

interface Props {
  /** e.g. "2026-07-26" — the upcoming Sunday's date */
  serviceDate: string;
}

interface RsvpCounts {
  yes: number;
  maybe: number;
  no: number;
}

export function SundayRsvp({ serviceDate }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [branch, setBranch] = useState<string | null>(null);
  const [myResponse, setMyResponse] = useState<Response | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [savingReason, setSavingReason] = useState(false);
  const [counts, setCounts] = useState<RsvpCounts>({ yes: 0, maybe: 0, no: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceDate]);

  async function loadData() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id ?? null;
    setUserId(uid);

    if (uid) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("branch")
        .eq("id", uid)
        .single();
      setBranch(profile?.branch ?? null);

      const { data: mine } = await supabase
        .from("sunday_rsvps")
        .select("response, decline_reason")
        .eq("service_date", serviceDate)
        .eq("user_id", uid)
        .maybeSingle();

      if (mine) {
        setMyResponse(mine.response as Response);
        setDeclineReason(mine.decline_reason ?? "");
      } else {
        setMyResponse(null);
        setDeclineReason("");
      }
    }

    await refreshCounts();
    setLoading(false);
  }

  async function refreshCounts() {
    const { data, error } = await supabase.rpc("get_sunday_rsvp_status", {
      _service_date: serviceDate,
    });
    if (error) {
      console.error(error);
      return;
    }
    const next: RsvpCounts = { yes: 0, maybe: 0, no: 0 };
    (data ?? []).forEach((row: any) => {
      if (row.response === "yes") next.yes += 1;
      else if (row.response === "maybe") next.maybe += 1;
      else if (row.response === "no") next.no += 1;
    });
    setCounts(next);
  }

  // Saves the response immediately — never blocks on a reason being present.
  async function submitResponse(response: Response) {
    if (!userId) return;

    const payload: Record<string, unknown> = {
      service_date: serviceDate,
      user_id: userId,
      branch,
      response,
    };
    // Clear any old reason if they're no longer declining; keep it if they
    // are re-selecting "no" (they might just be re-confirming).
    if (response !== "no") payload.decline_reason = null;

    const { error } = await supabase
      .from("sunday_rsvps")
      .upsert(payload, { onConflict: "service_date,user_id" });

    if (error) {
      console.error(error);
      return;
    }

    setMyResponse(response);
    if (response === "no") {
      setShowReasonInput(true);
    } else {
      setShowReasonInput(false);
      setDeclineReason("");
    }
    await refreshCounts();
  }

  async function saveReason() {
    if (!userId) return;
    setSavingReason(true);
    const { error } = await supabase
      .from("sunday_rsvps")
      .update({ decline_reason: declineReason.trim() || null })
      .eq("service_date", serviceDate)
      .eq("user_id", userId);
    setSavingReason(false);
    if (error) {
      console.error(error);
      return;
    }
    setShowReasonInput(false);
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading RSVP…</div>;

  return (
    <div className="rounded-xl border p-4 space-y-4">
      <div>
        <div className="text-xs uppercase text-muted-foreground">This Sunday · {serviceDate}</div>
        <div>Let your leaders know whether to expect you.</div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={myResponse === "yes" ? "default" : "outline"} onClick={() => submitResponse("yes")}>
          I'll be there
        </Button>
        <Button variant={myResponse === "maybe" ? "default" : "outline"} onClick={() => submitResponse("maybe")}>
          Maybe
        </Button>
        <Button variant={myResponse === "no" ? "default" : "outline"} onClick={() => submitResponse("no")}>
          Can't make it
        </Button>
      </div>

      {myResponse === "no" && (
        <div className="space-y-2">
          {!showReasonInput && (
            <button
              type="button"
              className="text-sm text-muted-foreground underline"
              onClick={() => setShowReasonInput(true)}
            >
              {declineReason
                ? "Edit your reason"
                : "Would you like to share why? (optional, only seen by pastoral leadership)"}
            </button>
          )}
          {showReasonInput && (
            <div className="space-y-2">
              <Textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Only visible to Senior Pastor, Lead Pastor, Associate Pastor and Chairperson"
              />
              <Button size="sm" onClick={saveReason} disabled={savingReason}>
                {savingReason ? "Saving…" : "Save reason"}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-green-50 py-3">
          <div className="text-lg font-semibold text-green-700">{counts.yes}</div>
          <div className="text-sm text-green-700">Yes</div>
        </div>
        <div className="rounded-lg bg-amber-50 py-3">
          <div className="text-lg font-semibold text-amber-700">{counts.maybe}</div>
          <div className="text-sm text-amber-700">Maybe</div>
        </div>
        <div className="rounded-lg bg-red-50 py-3">
          <div className="text-lg font-semibold text-red-700">{counts.no}</div>
          <div className="text-sm text-red-700">No</div>
        </div>
      </div>
    </div>
  );
}
