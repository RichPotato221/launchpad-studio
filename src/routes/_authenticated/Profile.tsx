import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAuthUserResult } from "@/lib/authUser";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CalendarCheck, CalendarClock, CheckCircle2, Info } from "lucide-react";

type CalendarStatus = {
  connector_id: string;
  connected: boolean;
  connected_email: string | null;
  connected_at: string | null;
};
 
export const Route = createFileRoute("/_authenticated/Profile")({
  head: () => ({ meta: [{ title: "My Profile — TRoGKC Portal" }] }),
  component: ProfilePage,
});
 
function ProfilePage() {
  const [userId, setUserId] = useState("");
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", avatar_url: "", primary_department: "" });
  const [depts, setDepts] = useState<{ slug: string; name: string }[]>([]);
  const [calendarStatuses, setCalendarStatuses] = useState<CalendarStatus[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
 
  const load = async () => {
    const { data: userRes } = await getAuthUserResult();
    const uid = userRes.user?.id;
    if (!uid) return;
    setUserId(uid);
 
    const { data: rows } = await supabase.rpc("get_my_profile");
    const data = rows?.[0] ?? null;

 
    if (data) {
      setForm({
        full_name: data.full_name ?? "",
        phone: data.phone ?? "",
        email: data.email ?? "",
        avatar_url: data.avatar_url ?? "",
        primary_department: data.primary_department ?? "",
      });
    }
 
    const { data: deptList } = await supabase.from("departments").select("slug, name").order("name");
    setDepts(deptList ?? []);

    const { data: calendars, error: calendarError } = await supabase.rpc("get_my_calendar_connection_status");
    if (!calendarError) setCalendarStatuses(calendars ?? []);
  };

  const getCalendarStatus = (connectorId: string) =>
    calendarStatuses.find((status) => status.connector_id === connectorId);
 
  useEffect(() => {
    load();
  }, []);
 
  const uploadAvatar = async (file: File) => {
    setUploading(true);
    const path = `${userId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) {
      setUploading(false);
      return toast.error(upErr.message);
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error } = await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("id", userId);
    setUploading(false);
    if (error) return toast.error(error.message);
    setForm((f) => ({ ...f, avatar_url: pub.publicUrl }));
    toast.success("Profile picture updated");
  };
 
  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        phone: form.phone,
        primary_department: form.primary_department || null,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  };
 
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:px-8">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Account</p>
      <h1 className="mt-2 font-serif text-3xl md:text-4xl">My Profile</h1>
 
      <Card className="mt-6 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-xl font-medium">
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              (form.full_name || "?").slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <Label htmlFor="avatar-upload" className="cursor-pointer text-sm text-primary underline">
              {uploading ? "Uploading…" : "Change photo"}
            </Label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadAvatar(file);
              }}
            />
          </div>
        </div>
 
        <div className="mt-6 grid gap-4">
          <div>
            <Label>Full name</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <Label>Phone number</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={form.email} disabled />
          </div>
          <div>
            <Label>Department</Label>
            <Select
              value={form.primary_department}
              onValueChange={(v) => setForm({ ...form, primary_department: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a department" />
              </SelectTrigger>
              <SelectContent>
                {depts.map((d) => (
                  <SelectItem key={d.slug} value={d.slug}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={save} disabled={saving} className="w-fit">
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Calendar sync</p>
            <h2 className="mt-2 font-serif text-2xl">Connected Calendars</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Church events, meetings, tasks and recurring activities will sync here once each calendar account is connected.
            </p>
          </div>
          <CalendarCheck className="mt-1 h-6 w-6 text-primary" aria-hidden="true" />
        </div>

        <div className="mt-6 grid gap-3">
          {[
            {
              connectorId: "google_calendar",
              title: "Google Calendar",
              description: "Ready for member calendar permissions and one-way church event sync.",
              pending: false,
            },
            {
              connectorId: "microsoft_outlook",
              title: "Outlook Calendar",
              description: "Microsoft stays optional until the organisation tenant and app client are ready.",
              pending: true,
            },
          ].map((calendar) => {
            const status = getCalendarStatus(calendar.connectorId);
            const isConnected = Boolean(status?.connected);
            return (
              <div key={calendar.connectorId} className="rounded-md border border-border bg-muted/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    {isConnected ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
                    ) : calendar.pending ? (
                      <Info className="mt-0.5 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <CalendarClock className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
                    )}
                    <div>
                      <h3 className="font-medium">{calendar.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{calendar.description}</p>
                      {status?.connected_email ? (
                        <p className="mt-2 text-sm text-muted-foreground">Connected as {status.connected_email}</p>
                      ) : null}
                    </div>
                  </div>
                  <span className="w-fit rounded-md border border-border px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {isConnected ? "Connected" : calendar.pending ? "Pending setup" : "Ready"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-md border border-border bg-background p-4 text-sm text-muted-foreground">
          Members will continue logging in through the portal. Google sign-in is enabled, and Microsoft will be used only for Outlook, email,
          Teams and Microsoft 365 sync after the tenant/client setup is complete.
        </div>
      </Card>
    </div>
  );
}
