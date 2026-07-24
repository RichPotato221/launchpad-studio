import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PortalShell } from "@/components/PortalShell";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Messages — TRoGKC Portal" }] }),
  component: MessagesIndex,
});

function MessagesIndex() {
  const navigate = useNavigate();
  const convos = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_conversations");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <PortalShell>
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
        <h1 className="font-serif text-3xl md:text-4xl">Messages</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Private one-to-one chat with other members. Search a member from the top bar or open their
          profile to start a new conversation.
        </p>

        <div className="mt-6 divide-y divide-border rounded-xl border bg-card">
          {convos.isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
          {!convos.isLoading && (convos.data ?? []).length === 0 && (
            <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
              <MessageCircle className="h-6 w-6" />
              No conversations yet. Open any member's profile and tap <b>Message</b>.
            </div>
          )}
          {(convos.data ?? []).map((c: any) => (
            <button
              key={c.partner_id}
              onClick={() => navigate({ to: "/messages/$userId", params: { userId: c.partner_id } })}
              className="flex w-full items-center gap-3 p-4 text-left hover:bg-accent"
            >
              {c.partner_avatar ? (
                <img src={c.partner_avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                  {(c.partner_name || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{c.partner_name ?? "Member"}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(c.last_created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{c.last_body}</p>
              </div>
              {Number(c.unread_count) > 0 && (
                <span className="ml-2 shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                  {c.unread_count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <Link to="/departments" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
            Find members in departments →
          </Link>
        </div>
      </div>
    </PortalShell>
  );
}
