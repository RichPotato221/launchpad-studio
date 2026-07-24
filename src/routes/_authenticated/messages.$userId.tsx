import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/messages/$userId")({
  head: () => ({ meta: [{ title: "Chat — TRoGKC Portal" }] }),
  component: ChatPage,
});

function ChatPage() {
  const { userId } = Route.useParams();
  const qc = useQueryClient();
  const [me, setMe] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const partner = useQuery({
    queryKey: ["chat-partner", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, primary_department, branch")
        .eq("id", userId)
        .maybeSingle();
      return data;
    },
  });

  const messages = useQuery({
    queryKey: ["dm-thread", me, userId],
    enabled: !!me,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("id, sender_id, recipient_id, body, created_at, read_at")
        .or(
          `and(sender_id.eq.${me},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${me})`,
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      // mark inbound as read
      const unreadIds = (data ?? []).filter((m) => m.recipient_id === me && !m.read_at).map((m) => m.id);
      if (unreadIds.length) {
        await supabase.from("direct_messages").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
        qc.invalidateQueries({ queryKey: ["conversations"] });
      }
      return data ?? [];
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data?.length]);

  const send = async () => {
    if (!body.trim() || !me || sending) return;
    setSending(true);
    const { error } = await supabase.from("direct_messages").insert({
      sender_id: me,
      recipient_id: userId,
      body: body.trim(),
    });
    setSending(false);
    if (error) return toast.error(error.message);
    setBody("");
    qc.invalidateQueries({ queryKey: ["dm-thread", me, userId] });
    qc.invalidateQueries({ queryKey: ["conversations"] });
  };

  const initial = (partner.data?.full_name || "?").charAt(0).toUpperCase();

  return (
    <>

      <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-2xl flex-col px-4 py-4 md:px-8">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <Link to="/messages" className="rounded p-1 hover:bg-accent">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Link to="/members/$id" params={{ id: userId }} className="flex items-center gap-3 hover:underline">
            {partner.data?.avatar_url ? (
              <img src={partner.data.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                {initial}
              </div>
            )}
            <div className="leading-tight">
              <p className="text-sm font-medium">{partner.data?.full_name ?? "Member"}</p>
              <p className="text-xs text-muted-foreground">
                {partner.data?.primary_department ?? ""}
                {partner.data?.branch ? ` · ${partner.data.branch}` : ""}
              </p>
            </div>
          </Link>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto py-4">
          {messages.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!messages.isLoading && (messages.data ?? []).length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Say hello to {partner.data?.full_name ?? "this member"} 👋
            </p>
          )}
          {(messages.data ?? []).map((m) => {
            const mine = m.sender_id === me;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
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
            placeholder="Message…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
          />
          <Button onClick={send} disabled={sending || !body.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </PortalShell>
  );
}
