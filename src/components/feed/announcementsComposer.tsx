import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const BRANCH_OPTIONS = [
  { value: "all", label: "All Branches" },
  { value: "twatwa", label: "Twatwa" },
  { value: "joburg_north", label: "Joburg North" },
  { value: "joburg_south", label: "Joburg South" },
];

// Same role set as can_post_cross_branch() in the database — kept in sync
// so the branch picker only shows up for people who are actually allowed
// to use it (the database re-enforces this regardless, via a trigger).
const CROSS_BRANCH_ROLES = new Set([
  "senior_apostle",
  "chairperson",
  "lead_pastor",
  "secretary",
  "associate_pastor",
  "strategic_adviser",
]);

interface Props {
  onPosted: () => void;
}

export function AnnouncementComposer({ onPosted }: Props) {
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState(false);
  const [targetBranch, setTargetBranch] = useState("all");
  const [canPickBranch, setCanPickBranch] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    void checkRole();
  }, []);

  async function checkRole() {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setCanPickBranch((roles ?? []).some((r) => CROSS_BRANCH_ROLES.has(r.role as string)));
  }

  async function submit() {
    if (!body.trim() || posting) return;
    setPosting(true);

    // author_id / author_department_slug / final target_branch are all set
    // server-side by the enforce_announcement_branch trigger — we just send
    // what we have and let the database have the final say.
    const { data: inserted, error } = await supabase
      .from("announcements")
      .insert({
        body: body.trim(),
        priority,
        target_branch: (canPickBranch ? targetBranch : "all") as "all" | "joburg_north" | "joburg_south" | "twatwa",
      })
      .select("id")
      .single();

    if (error || !inserted) {
      console.error(error);
      setPosting(false);
      return;
    }

    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const path = `${inserted.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("announcement-media")
          .upload(path, file);

        if (uploadError) {
          console.error(uploadError);
          continue;
        }

        const { data: publicUrlData } = supabase.storage
          .from("announcement-media")
          .getPublicUrl(path);

        await supabase.from("announcement_media").insert({
          announcement_id: inserted.id,
          media_url: publicUrlData.publicUrl,
          media_type: "image",
          sort_order: i,
        });
      }
    }

    setBody("");
    setPriority(false);
    setFiles(null);
    setPosting(false);
    onPosted();
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share an announcement…"
      />

      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => setFiles(e.target.files)}
      />

      <div className="flex items-center gap-2">
        <Checkbox checked={priority} onCheckedChange={(v) => setPriority(!!v)} id="priority" />
        <label htmlFor="priority" className="text-sm">Mark as priority</label>
      </div>

      {canPickBranch && (
        <div>
          <label className="text-xs text-muted-foreground">Post to</label>
          <select
            className="mt-1 block w-full rounded border p-2 text-sm"
            value={targetBranch}
            onChange={(e) => setTargetBranch(e.target.value)}
          >
            {BRANCH_OPTIONS.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </div>
      )}

      <Button onClick={submit} disabled={posting || !body.trim()}>
        {posting ? "Posting…" : "Post"}
      </Button>
    </div>
  );
}
