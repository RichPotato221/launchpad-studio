import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, MessageCircle, Paperclip, Eye, Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useCurrentRole } from "@/lib/useCurrentRole";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({ meta: [{ title: "Announcements Feed — TRoGKC Portal" }] }),
  component: FeedPage,
});

const BRANCH_OPTIONS = [
  { value: "all", label: "All Branches" },
  { value: "twatwa", label: "Twatwa" },
  { value: "joburg_north", label: "Joburg North" },
  { value: "joburg_south", label: "Joburg South" },
];

async function signedUrl(path: string) {
  const { data } = await supabase.storage.from("announcement-attachments").createSignedUrl(path, 3600);
  return data?.signedUrl ?? "#";
}

function AttachmentLink({ path, name }: { path: string; name: string | null }) {
  const [url, setUrl] = useState("#");
  useEffect(() => { signedUrl(path).then(setUrl); }, [path]);
  return (
    <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary underline">
      <Paperclip className="h-3 w-3" /> {name ?? "attachment"}
    </a>
  );
}

function FeedPage() {
  const qc = useQueryClient();
  const role = useCurrentRole();
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState(false);
  const [targetBranch, setTargetBranch] = useState("all");
  const [file, setFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);

  const posts = useQuery({
    queryKey: ["feed-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const ids = (data ?? []).map((p) => p.author_id);
      const deptSlugs = Array.from(new Set((data ?? []).map((p) => p.author_department_slug).filter(Boolean))) as string[];
      const [{ data: profs }, { data: depts }] = await Promise.all([
        ids.length ? supabase.from("profiles").select("id, full_name").in("id", ids) : Promise.resolve({ data: [] as any[] }),
        deptSlugs.length ? supabase.from("departments").select("slug, name").in("slug", deptSlugs) : Promise.resolve({ data: [] as any[] }),
      ]);
      const profMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
      const deptMap = new Map((depts ?? []).map((d: any) => [d.slug, d.name]));
      return (data ?? []).map((p) => ({
        ...p,
        author_name: profMap.get(p.author_id) ?? "Member",
        dept_name: p.author_department_slug ? deptMap.get(p.author_department_slug) : null,
      }));
    },
  });

  const likes = useQuery({
    queryKey: ["feed-likes"],
    queryFn: async () => {
      const { data } = await supabase.from("announcement_likes").select("announcement_id, user_id");
      return data ?? [];
    },
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    let attachment_url: string | null = null;
    let attachment_name: string | null = null;
    if (file && role.data?.userId) {
      const path = `${role.data.userId}/${Date.now()}-${file.name}`;
      const up = await supabase.storage.from("announcement-attachments").upload(path, file);
      if (up.error) {
        setPosting(false);
        return toast.error(up.error.message);
      }
      attachment_url = path;
      attachment_name = file.name;
    }
    const insert: any = {
      author_id: role.data?.userId,
      body: body.trim(),
      priority,
      attachment_url,
      attachment_name,
    };
    if (role.data?.canPostCrossBranch) insert.target_branch = targetBranch;
    const { error } = await supabase.from("announcements").insert(insert);
    setPosting(false);
    if (error) return toast.error(error.message);
    setBody(""); setFile(null); setPriority(false);
    toast.success("Posted");
    qc.invalidateQueries({ queryKey: ["feed-posts"] });
  };

  return (
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
        <h1 className="font-serif text-3xl md:text-4xl">Announcements</h1>
        <p className="mt-2 text-sm text-muted-foreground">Church-wide feed. Posts are scoped to your branch unless a leader posts to all branches.</p>

        {/* Composer */}
        <Card className="mt-6 p-5">
          <form onSubmit={submit} className="space-y-3">
            <textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share an announcement…"
              className="w-full rounded-md border border-input bg-background p-3 text-sm"
              required
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={priority} onCheckedChange={(v) => setPriority(!!v)} /> Mark as priority
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Paperclip className="h-4 w-4" />
                <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs" />
              </label>
              {role.data?.canPostCrossBranch && (
                <div className="ml-auto flex items-center gap-2">
                  <Label className="text-xs">Target</Label>
                  <Select value={targetBranch} onValueChange={setTargetBranch}>
                    <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BRANCH_OPTIONS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button type="submit" disabled={posting} className={role.data?.canPostCrossBranch ? "" : "ml-auto"}>
                {posting ? "Posting…" : "Post"}
              </Button>
            </div>
          </form>
        </Card>

        {/* Posts */}
        <div className="mt-6 space-y-4">
          {posts.data?.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              likes={(likes.data ?? []).filter((l) => l.announcement_id === p.id)}
              currentUserId={role.data?.userId ?? null}
              onChange={() => {
                qc.invalidateQueries({ queryKey: ["feed-posts"] });
                qc.invalidateQueries({ queryKey: ["feed-likes"] });
              }}
            />
          ))}
          {!posts.isLoading && (posts.data?.length ?? 0) === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground">No announcements yet.</Card>
          )}
        </div>
      </div>
  );
}

function PostCard({ post, likes, currentUserId, onChange }: {
  post: any; likes: any[]; currentUserId: string | null; onChange: () => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [comment, setComment] = useState("");
  const [isTopLeader, setIsTopLeader] = useState(false);
  const [viewCount, setViewCount] = useState<number>(0);
  const [shareCount, setShareCount] = useState<number>(0);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);
  const liked = !!currentUserId && likes.some((l) => l.user_id === currentUserId);

  useEffect(() => {
    if (!currentUserId) return;
    supabase.from("user_roles").select("role").eq("user_id", currentUserId).then(({ data }) => {
      const topRoles = new Set(["chairperson", "senior_apostle"]);
      setIsTopLeader((data ?? []).some((r: any) => topRoles.has(r.role)));
    });
  }, [currentUserId]);

  // Log a view (once per user per day, enforced by DB unique constraint)
  useEffect(() => {
    if (!currentUserId) return;
    (supabase as any).from("announcement_views").insert({
      announcement_id: post.id,
      user_id: currentUserId,
    }).then(() => refreshCounts());
  }, [currentUserId, post.id]);

  const refreshCounts = async () => {
    const [{ count: v }, { count: s }] = await Promise.all([
      (supabase as any).from("announcement_views").select("*", { count: "exact", head: true }).eq("announcement_id", post.id),
      (supabase as any).from("announcement_shares").select("*", { count: "exact", head: true }).eq("announcement_id", post.id),
    ]);
    setViewCount(v ?? 0);
    setShareCount(s ?? 0);
  };

  useEffect(() => { refreshCounts(); }, [post.id]);

  const canSeeViewers = currentUserId === post.author_id || isTopLeader;

  const openViewers = async () => {
    if (!canSeeViewers) return;
    const { data } = await (supabase as any)
      .from("announcement_views")
      .select("user_id, first_viewed_at")
      .eq("announcement_id", post.id)
      .order("first_viewed_at", { ascending: false });
    const ids: string[] = Array.from(new Set((data ?? []).map((v: any) => v.user_id as string)));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, full_name").in("id", ids as string[])
      : { data: [] as any[] };
    const nameMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
    setViewers((data ?? []).map((v: any) => ({ ...v, name: nameMap.get(v.user_id) ?? "Member" })));
    setViewersOpen(true);
  };

  const share = async () => {
    if (!currentUserId) return;
    const url = `${window.location.origin}/feed#post-${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Announcement", text: post.body.slice(0, 140), url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
      await (supabase as any).from("announcement_shares").insert({
        announcement_id: post.id, user_id: currentUserId,
      });
      refreshCounts();
    } catch (e) {
      // user cancelled — do nothing
    }
  };

  const canDelete = currentUserId === post.author_id || isTopLeader;

  const deletePost = async () => {
    if (!canDelete) return;
    if (!window.confirm("Delete this post?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", post.id);
    if (error) return toast.error(error.message);
    toast.success("Post deleted");
    onChange();
  };

  const loadComments = async () => {
    const { data } = await supabase
      .from("announcement_comments")
      .select("id, author_id, body, created_at")
      .eq("announcement_id", post.id)
      .order("created_at");
    const ids = Array.from(new Set((data ?? []).map((c: any) => c.author_id)));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, full_name").in("id", ids)
      : { data: [] as any[] };
    const nameMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
    setComments((data ?? []).map((c: any) => ({ ...c, author_name: nameMap.get(c.author_id) ?? "Member" })));
  };

  const toggleLike = async () => {
    if (!currentUserId) return;
    if (liked) {
      await supabase.from("announcement_likes").delete().eq("announcement_id", post.id).eq("user_id", currentUserId);
    } else {
      await supabase.from("announcement_likes").insert({ announcement_id: post.id, user_id: currentUserId });
    }
    onChange();
  };

  const addComment = async () => {
    if (!comment.trim() || !currentUserId) return;
    const { error } = await supabase.from("announcement_comments").insert({
      announcement_id: post.id,
      author_id: currentUserId,
      body: comment.trim(),
    });
    if (error) return toast.error(error.message);
    setComment("");
    loadComments();
  };

  const openComments = () => {
    setShowComments((s) => {
      if (!s) loadComments();
      return !s;
    });
  };

  return (
    <Card id={`post-${post.id}`} className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{post.author_name}</p>
          <p className="text-xs text-muted-foreground">
            {post.dept_name ?? "Member"} · {new Date(post.created_at).toLocaleString()}
            {post.target_branch !== "all" && ` · ${post.target_branch}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {post.priority && (
            <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">Priority</span>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={deletePost}
              className="text-xs text-muted-foreground underline hover:text-red-600"
            >
              Delete
            </button>
          )}
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm">{post.body}</p>
      {post.attachment_url && <AttachmentLink path={post.attachment_url} name={post.attachment_name} />}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <button onClick={toggleLike} className={`inline-flex items-center gap-1 ${liked ? "text-red-600" : "hover:text-foreground"}`}>
          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {likes.length}
        </button>
        <button onClick={openComments} className="inline-flex items-center gap-1 hover:text-foreground">
          <MessageCircle className="h-4 w-4" /> Comments
        </button>
        <button onClick={share} className="inline-flex items-center gap-1 hover:text-foreground">
          <Share2 className="h-4 w-4" /> {shareCount}
        </button>
        <button
          onClick={openViewers}
          disabled={!canSeeViewers}
          className={`ml-auto inline-flex items-center gap-1 ${canSeeViewers ? "hover:text-foreground" : "cursor-default"}`}
          title={canSeeViewers ? "See who viewed" : "Views today"}
        >
          <Eye className="h-4 w-4" /> {viewCount}
        </button>
      </div>
      {showComments && (
        <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
          {comments.map((c) => (
            <div key={c.id} className="text-sm">
              <span className="font-medium">{c.author_name}</span>{" "}
              <span className="text-xs text-muted-foreground">· {new Date(c.created_at).toLocaleString()}</span>
              <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
          <div className="flex gap-2">
            <Input placeholder="Write a comment…" value={comment} onChange={(e) => setComment(e.target.value)} />
            <Button size="sm" onClick={addComment}>Send</Button>
          </div>
        </div>
      )}

      <Dialog open={viewersOpen} onOpenChange={setViewersOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Viewed by</DialogTitle></DialogHeader>
          <div className="max-h-80 space-y-2 overflow-y-auto text-sm">
            {viewers.length === 0 && <p className="text-muted-foreground">No views yet.</p>}
            {viewers.map((v) => (
              <div key={v.user_id + v.first_viewed_at} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
                <span>{v.name}</span>
                <span className="text-xs text-muted-foreground">{new Date(v.first_viewed_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
