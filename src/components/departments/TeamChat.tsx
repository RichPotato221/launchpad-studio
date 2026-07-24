import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
 
interface ChatMessage {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  author_name: string;
}
 
export function TeamChat({ slug, currentUserId }: { slug: string; currentUserId: string | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
 
  const load = async () => {
    const { data, error } = await supabase
      .from("department_chat_messages")
      .select("id, author_id, body, created_at")
      .eq("department_slug", slug)
      .order("created_at", { ascending: true })
      .limit(200);
 
    if (error) return; // silently empty for members without access — no error toast needed
 
    const rows = data ?? [];
    const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
    const { data: profiles } = authorIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
      : { data: [] as any[] };
    const nameById = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));
 
    setMessages(rows.map((r) => ({ ...r, author_name: nameById.get(r.author_id) ?? "Member" })));
  };
 
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);
 
  const send = async () => {
    if (!body.trim() || !currentUserId) return;
    setSending(true);
    const { error } = await supabase.from("department_chat_messages").insert({
      department_slug: slug,
      author_id: currentUserId,
      body: body.trim(),
    });
    setSending(false);
    if (error) return toast.error(error.message);
    setBody("");
    load();
  };
 
  return (
    <Card className="mt-4 p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Team chat</p>
      <div className="mt-3 max-h-80 space-y-3 overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <span className="font-medium">{m.author_name}</span>{" "}
            <span className="text-xs text-muted-foreground">
              · {new Date(m.created_at).toLocaleString()}
            </span>
            <p className="mt-0.5 whitespace-pre-wrap">{m.body}</p>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">No messages yet — start the conversation.</p>
        )}
      </div>
      {currentUserId && (
        <div className="mt-4 flex gap-2">
          <Input
            placeholder="Message your team…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <Button size="sm" onClick={send} disabled={sending || !body.trim()}>
            Send
          </Button>
        </div>
      )}
    </Card>
  );
}
