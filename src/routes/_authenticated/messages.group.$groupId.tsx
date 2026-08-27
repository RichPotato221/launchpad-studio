import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAuthUserResult } from "@/lib/authUser";
import { notify } from "@/lib/notifications.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Send, Trash2, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/messages/group/$groupId")({
  head: () => ({ meta: [{ title: "Group chat — TRoGKC Portal" }] }),
  component: GroupChatPage,
});

function GroupChatPage() {
  const { groupId } = Route.useParams();
  const qc = useQueryClient();
  const [me, setMe] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAuthUserResult().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const group = useQuery({
    queryKey: ["group", groupId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("group_conversations")
        .select("id, title, created_by")
        .eq("id", groupId)
        .maybeSingle();
      return data as { id: string; title: string; created_by: string } | null;
    },
  });

  const members = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("group_conversation_members")
        .select("user_id")
        .eq("conversation_id", groupId);
      const ids = (data ?? []).map((r: any) => r.user_id);
      if (!ids.length) return [] as any[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", ids);
      return profiles ?? [];
    },
  });

  const messages = useQuery({
    queryKey: ["group-thread", groupId],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("group_messages")
        .select("id, sender_id, body, created_at")
        .eq("conversation_id", groupId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { id: string; sender_id: string; body: string; created_at: string }[];
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data?.length]);

  const nameById = new Map((members.data ?? []).map((p: any) => [p.id, p.full_name]));

  const send = async () => {
    if (!body.trim() || !me || sending) return;
    setSending(true);
    const text = body.trim();
    const { data: inserted, error } = await (supabase as any)
      .from("group_messages")
      .insert({ conversation_id: groupId, sender_id: me, body: text })
      .select("id")
      .single();
    setSending(false);
    if (error) return toast.error(error.message);
    setBody("");
    qc.invalidateQueries({ queryKey: ["group-thread", groupId] });
    qc.invalidateQueries({ queryKey: ["conversations"] });

    const others = (members.data ?? []).map((p: any) => p.id).filter((id: string) => id !== me);
    if (others.length) {
      notify({
        data: {
          type: "MESSAGE_RECEIVED",
          entityType: "message",
          entityId: inserted?.id ?? null,
          entityVersion: inserted?.id ?? Date.now(),
          audience: { userIds: others },
          metadata: {
            sender_id: me,
            sender_name: `${nameById.get(me) ?? "A member"} in ${group.data?.title ?? "a group chat"}`,
            preview: text.slice(0, 300),
          },
        },
      }).catch((err) => console.error("group message notification failed", err));
    }
  };

  const isOwner = !!me && group.data?.created_by === me;

  const deleteMessage = async (id: string) => {
    if (!window.confirm("Delete this message?")) return;
    const { error } = await (supabase as any).from("group_messages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["group-thread", groupId] });
  };

  const deleteGroup = async () => {
    if (!window.confirm("Delete this group chat and all its messages?")) return;
    await (supabase as any).from("group_messages").delete().eq("conversation_id", groupId);
    await (supabase as any).from("group_conversation_members").delete().eq("conversation_id", groupId);
    const { error } = await (supabase as any).from("group_conversations").delete().eq("id", groupId);
    if (error) return toast.error(error.message);
    toast.success("Group chat deleted");
    qc.invalidateQueries({ queryKey: ["group-conversations"] });
    window.history.back();
  };

  const leaveGroup = async () => {
    if (!me) return;
    if (!window.confirm("Leave this group chat?")) return;
    const { error } = await (supabase as any)
      .from("group_conversation_members")
      .delete()
      .eq("conversation_id", groupId)
      .eq("user_id", me);
    if (error) return toast.error(error.message);
    toast.success("You left the group");
    qc.invalidateQueries({ queryKey: ["group-conversations"] });
    window.history.back();
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-2xl flex-col px-4 py-4 md:px-8">
      <div className="flex items-center gap-3 border-b border-border pb-3">
        <Link to="/messages" className="rounded p-1 hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Users className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-medium">{group.data?.title ?? "Group chat"}</p>
          <p className="text-xs text-muted-foreground">
            {(members.data ?? []).map((p: any) => p.full_name).join(", ")}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto shrink-0 text-muted-foreground hover:text-destructive"
          onClick={isOwner ? deleteGroup : leaveGroup}
        >
          <Trash2 className="h-4 w-4" />
          <span className="ml-1 text-xs">{isOwner ? "Delete" : "Leave"}</span>
        </Button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto py-4">
        {messages.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!messages.isLoading && (messages.data ?? []).length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No messages yet — start the conversation.
          </p>
        )}
        {(messages.data ?? []).map((m) => {
          const mine = m.sender_id === me;
          return (
            <div key={m.id} className={`group flex items-center gap-1 ${mine ? "justify-end" : "justify-start"}`}>
              {(mine || isOwner) && (
                <button
                  type="button"
                  aria-label="Delete message"
                  onClick={() => deleteMessage(m.id)}
                  className="rounded p-1 text-muted-foreground opacity-60 hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                {!mine && (
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {nameById.get(m.sender_id) ?? "Member"}
                  </p>
                )}
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 border-t border-border pt-3">
        <Input
          placeholder="Message the group…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
        />
        <Button onClick={send} disabled={sending || !body.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
