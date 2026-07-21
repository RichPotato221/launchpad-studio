import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RosterRow {
  user_id: string;
  full_name: string;
  branch: string;
  response: "yes" | "maybe" | "no";
}

const PASTORAL_ROLES = new Set(["senior_apostle", "lead_pastor", "associate_pastor", "chairperson"]);

export function RsvpRoster({ serviceDate }: { serviceDate: string }) {
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [canSeeReasons, setCanSeeReasons] = useState(false);
  const [openReasonFor, setOpenReasonFor] = useState<string | null>(null);
  const [reasonText, setReasonText] = useState<Record<string, string>>({});

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceDate]);

  async function load() {
    // Safe for anyone to call — never returns decline_reason.
    const { data, error } = await supabase.rpc("get_sunday_rsvp_status", {
      _service_date: serviceDate,
    });
    if (error) {
      console.error(error);
      return;
    }
    setRows((data ?? []) as RosterRow[]);

    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (uid) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      setCanSeeReasons((roles ?? []).some((r) => PASTORAL_ROLES.has(r.role as string)));
    }
  }

  async function revealReason(row: RosterRow) {
    if (openReasonFor === row.user_id) {
      setOpenReasonFor(null);
      return;
    }
    // RLS on sunday_rsvps only returns this row to pastoral roles (or the
    // member themselves) — a non-pastoral caller simply gets nothing back.
    const { data, error } = await supabase
      .from("sunday_rsvps")
      .select("decline_reason")
      .eq("service_date", serviceDate)
      .eq("user_id", row.user_id)
      .maybeSingle();

    if (error) {
      console.error(error);
      return;
    }
    setReasonText((prev) => ({
      ...prev,
      [row.user_id]: data?.decline_reason?.trim() || "No reason given.",
    }));
    setOpenReasonFor(row.user_id);
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="mb-2 text-sm font-semibold">Who's coming</div>
      <ul className="divide-y">
        {rows.map((row) => (
          <li key={row.user_id} className="py-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{row.full_name}</div>
                <div className="text-xs capitalize text-muted-foreground">{row.branch}</div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={
                    row.response === "yes"
                      ? "text-green-700"
                      : row.response === "maybe"
                      ? "text-amber-700"
                      : "text-red-700"
                  }
                >
                  {row.response === "yes" ? "Yes" : row.response === "maybe" ? "Maybe" : "No"}
                </span>
                {row.response === "no" && canSeeReasons && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline"
                    onClick={() => revealReason(row)}
                  >
                    {openReasonFor === row.user_id ? "Hide" : "Reason"}
                  </button>
                )}
              </div>
            </div>
            {openReasonFor === row.user_id && reasonText[row.user_id] && (
              <div className="mt-1 text-sm italic text-muted-foreground">
                “{reasonText[row.user_id]}”
              </div>
            )}
          </li>
        ))}
        {rows.length === 0 && (
          <li className="py-2 text-sm text-muted-foreground">No responses yet.</li>
        )}
      </ul>
    </div>
  );
}
