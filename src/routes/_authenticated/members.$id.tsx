import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PortalShell } from "@/components/PortalShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/members/$id")({
  head: () => ({ meta: [{ title: "Member Profile — TRoGKC Portal" }] }),
  component: MemberProfilePage,
});

function MemberProfilePage() {
  const { id } = Route.useParams();
  const [profile, setProfile] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.rpc("get_member_profile", { _member_id: id });
    if (error) return toast.error(error.message);
    setProfile((data ?? [])[0] ?? null);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isOwnProfile = currentUserId === id;

  const uploadAvatar = async (file: File) => {
    if (!currentUserId) return;
    setUploading(true);
    const path = `${currentUserId}/${Date.now()}-${file.name}`;
    const up = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (up.error) {
      setUploading(false);
      return toast.error(up.error.message);
    }
    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrlData.publicUrl })
      .eq("id", currentUserId);
    setUploading(false);
    if (error) return toast.error(error.message);
    toast.success("Profile picture updated");
    load();
  };

  if (!profile) {
    return (
      <PortalShell>
        <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
          <p className="text-sm text-muted-foreground">Loading profile…</p>
        </div>
      </PortalShell>
    );
  }

  const initial = (profile.full_name || "?").trim().charAt(0).toUpperCase();

  return (
    <PortalShell>
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
        <Card className="overflow-hidden">
          <div className="h-28 bg-muted" />
          <div className="px-6 pb-6">
            <div className="-mt-14 flex items-end justify-between">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="h-28 w-28 rounded-full border-4 border-background object-cover"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-background bg-muted text-3xl font-medium text-muted-foreground">
                  {initial}
                </div>
              )}
            </div>

            <h1 className="mt-4 font-serif text-3xl">{profile.full_name}</h1>
            {profile.department_name && (
              <p className="mt-1 text-sm text-muted-foreground">
                {profile.department_name}
                {profile.requested_role ? ` · ${profile.requested_role}` : ""}
              </p>
            )}
            {profile.branch && (
              <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{profile.branch}</p>
            )}

            {isOwnProfile && (
              <div className="mt-4">
                <label className="text-xs text-muted-foreground">Update profile picture</label>
                <Input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
                  className="mt-1"
                />
              </div>
            )}

            <div className="mt-6 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Email</p>
                <p className="mt-1 text-sm">{profile.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Phone</p>
                <p className="mt-1 text-sm">{profile.phone ?? "—"}</p>
              </div>
            </div>

            <div className="mt-6">
              <Link to="/departments" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
                ← Back to Departments
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </PortalShell>
  );
                    }
