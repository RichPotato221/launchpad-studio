import { createFileRoute, Link, Outlet, useMatches, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageCircle, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Messages — TRoGKC Portal" }] }),
  component: MessagesLayout,
});

function MessagesLayout() {
  const matches = useMatches();
  const hasChatThread = matches.some((m) => m.routeId.startsWith("/_authenticated/messages/"));
  if (hasChatThread) return <Outlet />;
  return <MessagesIndex />;
}


function MessagesIndex() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"direct" | "group">("direct");
  const [term, setTerm] = useState("");
  const [selected, setSelected] = useState<Record<string, { id: string; full_name: string }>>({});

  const convos = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_conversations");
      if (error) throw error;
      return data ?? [];
    },
  });

  const members = useQuery({
    queryKey: ["member-search", term],
    enabled: open && term.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, primary_department, branch")
        .eq("approval_status", "approved")
        .ilike("full_name", `%${term.trim()}%`)
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const resetPicker = () => {
    setTerm("");
    setSelected({});
    setMode("direct");
  };

  const toggleSelect = (m: { id: string; full_name: string }) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[m.id]) delete next[m.id];
      else next[m.id] = { id: m.id, full_name: m.full_name };
      return next;
    });
  };

  const startDirect = (userId: string) => {
    navigate({ to: "/messages/$userId", params: { userId } });
    setOpen(false);
    resetPicker();
  };

  const startGroup = () => {
    const ids = Object.keys(selected);
    if (ids.length < 2) {
      toast.error("Pick at least 2 members for a group chat.");
      return;
    }
    toast.info("Group chats are coming soon — starting a direct chat with the first member.");
    startDirect(ids[0]);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl">Messages</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Private one-to-one chat with other members. Use the + button to find a member or start a group chat.
          </p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="shrink-0 gap-1"
          size="sm"
        >
          <Plus className="h-4 w-4" /> New
        </Button>
      </div>

      <div className="mt-6 divide-y divide-border rounded-xl border bg-card">
        {convos.isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
        {!convos.isLoading && (convos.data ?? []).length === 0 && (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
            <MessageCircle className="h-6 w-6" />
            No conversations yet. Tap <b>+ New</b> above to start one.
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

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetPicker();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start a conversation</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "direct" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => {
                setMode("direct");
                setSelected({});
              }}
            >
              <MessageCircle className="mr-1 h-4 w-4" /> Direct
            </Button>
            <Button
              type="button"
              variant={mode === "group" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setMode("group")}
            >
              <Users className="mr-1 h-4 w-4" /> Group
            </Button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search members by name…"
              className="pl-10"
            />
          </div>

          {mode === "group" && Object.values(selected).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {Object.values(selected).map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleSelect(s)}
                  className="rounded-full bg-muted px-2 py-0.5 text-xs hover:bg-accent"
                >
                  {s.full_name} ✕
                </button>
              ))}
            </div>
          )}

          <div className="max-h-72 overflow-y-auto rounded-md border">
            {term.trim().length < 2 && (
              <p className="p-4 text-center text-xs text-muted-foreground">
                Type at least 2 letters to search.
              </p>
            )}
            {term.trim().length >= 2 && members.isLoading && (
              <p className="p-4 text-center text-xs text-muted-foreground">Searching…</p>
            )}
            {term.trim().length >= 2 && !members.isLoading && (members.data ?? []).length === 0 && (
              <p className="p-4 text-center text-xs text-muted-foreground">No members found.</p>
            )}
            {(members.data ?? []).map((m: any) => {
              const isSelected = !!selected[m.id];
              return (
                <button
                  key={m.id}
                  onClick={() =>
                    mode === "direct" ? startDirect(m.id) : toggleSelect(m)
                  }
                  className={`flex w-full items-center gap-3 border-b border-border p-3 text-left last:border-0 hover:bg-accent ${
                    isSelected ? "bg-accent" : ""
                  }`}
                >
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {(m.full_name || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.primary_department ?? ""}
                      {m.branch ? ` · ${m.branch}` : ""}
                    </p>
                  </div>
                  {mode === "group" && (
                    <span
                      className={`h-4 w-4 rounded border ${
                        isSelected ? "border-primary bg-primary" : "border-border"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {mode === "group" && (
            <Button onClick={startGroup} disabled={Object.keys(selected).length < 2}>
              Start group chat ({Object.keys(selected).length})
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
