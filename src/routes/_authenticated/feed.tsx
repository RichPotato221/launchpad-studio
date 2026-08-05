import { createFileRoute, Link } from "@tanstack/react-router";
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
import { MemberAvatarLink } from "@/components/MemberAvatarlink";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({ meta: [{ title: "Announcements Feed — TRoGKC Portal" }] }),
  component: FeedPage,
});

const BRANCH_OPTIONS = [
  { value: "all", label: "All Branches" },
  { value: "twatwa", label: "Etwatwa" },
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
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState(false);
  const [targetBranch, setTargetBranch] = useState("all");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const urls = images.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [images]);

  const addImages = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setImages((prev) => [...prev, ...arr].slice(0, 10));
  };

  const removeImage = (i: number) => setImages((prev) => prev.filter((_, idx) => idx !== i));

  const posts = useQuery({
    queryKey: ["feed-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*, announcement_media ( id, media_url )")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const ids = (data ?? []).map((p) => p.author_id);
      const deptSlugs = Array.from(new Set((data ?? []).map((p) => p.author_department_slug).filter(Boolean))) as string[];
      const [{ data: profs }, { data: depts }] = await Promise.all([
        ids.length ? supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids) : Promise.resolve({ data: [] as any[] }),
        deptSlugs.length ? supabase.from("departments").select("slug, name").in("slug", deptSlugs) : Promise.resolve({ data: [] as any[] }),
      ]);
      const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const deptMap = new Map((depts ?? []).map((d: any) => [d.slug, d.name]));
      return (data ?? []).map((p: any) => ({
        ...p,
        author_name: (profMap.get(p.author_id) as any)?.full_name ?? "Member",
        author_avatar: (profMap.get(p.author_id) as any)?.avatar_url ?? null,
        dept_name: p.author_department_slug ? deptMap.get(p.author_department_slug) : null,
        media: p.announcement_media ?? [],
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
    if (!body.trim() || !role.data?.userId) return;
    setPosting(true);
    const insert: any = {
      author_id: role.data.userId,
      body: body.trim(),
      title: title.trim() || null,
      priority,
    };
    if (role.data?.canPostCrossBranch) insert.target_branch = targetBranch;
    const { data: inserted, error } = await supabase
      .from("announcements")
      .insert(insert)
      .select("id")
      .single();
    if (error || !inserted) {
      setPosting(false);
      return toast.error(error?.message ?? "Could not post");
    }

    // Upload each image to the public announcement-media bucket
    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const path = `${inserted.id}/${Date.now()}-${i}-${file.name}`;
      const up = await supabase.storage.from("announcement-media").upload(path, file);
      if (up.error) {
        console.error(up.error);
        continue;
      }
      const { data: pub } = supabase.storage.from("announcement-media").getPublicUrl(path);
      await supabase.from("announcement_media").insert({
        announcement_id: inserted.id,
        media_url: pub.publicUrl,
        media_type: "image",
        sort_order: i,
      });
    }

    setPosting(false);
    setTitle("");
    setBody("");
    setPriority(false);
    setImages([]);
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
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a header (optional)…"
              className="text-base font-medium"
              maxLength={140}
            />
            <textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share an announcement…"
              className="w-full rounded-md border border-input bg-background p-3 text-sm"
              required
            />

            {previews.length > 0 && (
              <div
                className={`grid gap-1 overflow-hidden rounded-lg border ${
                  previews.length === 1
                    ? "grid-cols-1"
                    : previews.length === 2
                    ? "grid-cols-2"
                    : "grid-cols-2 sm:grid-cols-3"
                }`}
              >
                {previews.map((src, i) => (
                  <div key={i} className="group relative">
                    <img
                      src={src}
                      alt=""
                      className={`w-full object-cover ${previews.length === 1 ? "max-h-96" : "aspect-square"}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white opacity-0 transition group-hover:opacity-100"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent">
                <Paperclip className="h-4 w-4" /> Add photos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addImages(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={priority} onCheckedChange={(v) => setPriority(!!v)} /> Mark as priority
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
    // Views are stored per day, so count DISTINCT viewers — one record per member.
    const [{ data: vRows }, { count: s }] = await Promise.all([
      (supabase as any).from("announcement_views").select("user_id").eq("announcement_id", post.id),
      (supabase as any).from("announcement_shares").select("*", { count: "exact", head: true }).eq("announcement_id", post.id),
    ]);
    setViewCount(new Set((vRows ?? []).map((r: any) => r.user_id)).size);
    setShareCount(s ?? 0);
  };

  useEffect(() => { refreshCounts(); }, [post.id]);

  // Every member may see who viewed a post.
  const canSeeViewers = true;

  const openViewers = async () => {
    const { data } = await (supabase as any)
      .from("announcement_views")
      .select("user_id, first_viewed_at")
      .eq("announcement_id", post.id)
      .order("first_viewed_at", { ascending: false });
    // Collapse repeat/daily records so each viewer appears exactly once.
    const unique = new Map<string, any>();
    for (const v of data ?? []) if (!unique.has(v.user_id)) unique.set(v.user_id, v);
    const rows = Array.from(unique.values());
    const ids: string[] = rows.map((v: any) => v.user_id as string);
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, full_name").in("id", ids as string[])
      : { data: [] as any[] };
    const nameMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
    setViewers(rows.map((v: any) => ({ ...v, name: nameMap.get(v.user_id) ?? "Member" })));
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
      ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids)
      : { data: [] as any[] };
    const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    setComments(
      (data ?? []).map((c: any) => ({
        ...c,
        author_name: (profMap.get(c.author_id) as any)?.full_name ?? "Member",
        author_avatar: (profMap.get(c.author_id) as any)?.avatar_url ?? null,
      })),
    );
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
        <MemberAvatarLink
          userId={post.author_id}
          fullName={post.author_name}
          avatarUrl={post.author_avatar}
          departmentName={`${post.dept_name ?? "Member"} · ${new Date(post.created_at).toLocaleString()}${post.target_branch !== "all" ? ` · ${post.target_branch}` : ""}`}
        />
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
      {post.title && <h3 className="mt-3 font-serif text-xl leading-snug">{post.title}</h3>}
      <p className="mt-2 whitespace-pre-wrap text-sm">{post.body}</p>
      {post.attachment_url && <AttachmentLink path={post.attachment_url} name={post.attachment_name} />}
      {post.media && post.media.length > 0 && (
        <div
          className={`mt-3 grid gap-1 overflow-hidden rounded-lg ${
            post.media.length === 1 ? "grid-cols-1" : post.media.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
          }`}
        >
          {post.media.map((m: any) => (
            <a key={m.id} href={m.media_url} target="_blank" rel="noreferrer" className="block">
              <img
                src={m.media_url}
                alt=""
                loading="lazy"
                className={`w-full object-cover ${post.media.length === 1 ? "max-h-[520px]" : "aspect-square"}`}
              />
            </a>
          ))}
        </div>
      )}
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
          className="ml-auto inline-flex items-center gap-1 hover:text-foreground"
          title="See who viewed" 
        >
          <Eye className="h-4 w-4" /> {viewCount}
        </button>
      </div>
      {showComments && (
        <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2 text-sm">
              <Link to="/members/$id" params={{ id: c.author_id }} className="shrink-0">
                {c.author_avatar ? (
                  <img src={c.author_avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {(c.author_name || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>
              <div className="min-w-0 flex-1 rounded-2xl bg-muted/60 px-3 py-2">
                <Link to="/members/$id" params={{ id: c.author_id }} className="text-xs font-medium hover:underline">
                  {c.author_name}
                </Link>
                <span className="ml-2 text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                <p className="mt-0.5 whitespace-pre-wrap">{c.body}</p>
              </div>
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
              <div key={v.user_id} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
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
