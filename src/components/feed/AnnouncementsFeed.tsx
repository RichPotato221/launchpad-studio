import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIdentity } from "@/lib/identity";

interface MediaItem {
  id: string;
  media_url: string;
}

interface Post {
  id: string;
  body: string;
  priority: boolean;
  created_at: string;
  author_id: string;
  author_department_slug: string | null;
  author_full_name: string;
  author_department_name: string | null;
  media: MediaItem[];
  like_count: number;
  liked_by_me: boolean;
}

const TOP_LEADER_ROLES = new Set(["chairperson", "senior_apostle"]);

export function AnnouncementFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const identity = useIdentity();
  const currentUserId = identity.data?.userId ?? null;
  const isTopLeader = (identity.data?.roles ?? []).some((r) => TOP_LEADER_ROLES.has(r));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);

    const uid = currentUserId;

    // Step 1: the posts themselves, plus their media and likes (these DO
    // have real foreign keys back to announcements, so nested embeds work).
    const { data: rawPosts, error } = await supabase
      .from("announcements")
      .select(`
        id, body, priority, created_at, author_id, author_department_slug,
        announcement_media ( id, media_url ),
        announcement_likes ( user_id )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const rows = rawPosts ?? [];

    // Step 2: author names and department names don't have a direct FK from
    // announcements, so fetch them separately and merge in JS.
    const authorIds = Array.from(new Set(rows.map((r: any) => r.author_id).filter(Boolean)));
    const deptSlugs = Array.from(
      new Set(rows.map((r: any) => r.author_department_slug).filter(Boolean))
    );

    const [{ data: profiles }, { data: departments }] = await Promise.all([
      authorIds.length
        ? supabase.from("profiles").select("id, full_name").in("id", authorIds)
        : Promise.resolve({ data: [] as any[] }),
      deptSlugs.length
        ? supabase.from("departments").select("slug, name").in("slug", deptSlugs)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const nameById = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));
    const deptNameBySlug = new Map((departments ?? []).map((d: any) => [d.slug, d.name]));

    const mapped: Post[] = rows.map((row: any) => ({
      id: row.id,
      body: row.body,
      priority: row.priority,
      created_at: row.created_at,
      author_id: row.author_id,
      author_department_slug: row.author_department_slug,
      author_full_name: nameById.get(row.author_id) ?? "Member",
      author_department_name: deptNameBySlug.get(row.author_department_slug) ?? row.author_department_slug,
      media: row.announcement_media ?? [],
      like_count: (row.announcement_likes ?? []).length,
      liked_by_me: (row.announcement_likes ?? []).some((l: any) => l.user_id === uid),
    }));

    setPosts(mapped);
    setLoading(false);
  }

  async function toggleLike(post: Post) {
    if (!currentUserId) return;
    if (post.liked_by_me) {
      await supabase
        .from("announcement_likes")
        .delete()
        .eq("announcement_id", post.id)
        .eq("user_id", currentUserId);
    } else {
      await supabase.from("announcement_likes").insert({
        announcement_id: post.id,
        user_id: currentUserId,
      });
    }
    await load();
  }

  async function deletePost(post: Post) {
    const canDelete = post.author_id === currentUserId || isTopLeader;
    if (!canDelete) return;
    if (!window.confirm("Delete this post?")) return;

    const { error } = await supabase.from("announcements").delete().eq("id", post.id);
    if (error) {
      console.error(error);
      return;
    }
    await load();
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading feed…</div>;

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div key={post.id} className="rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{post.author_full_name}</div>
              <div className="text-xs text-muted-foreground">
                {post.author_department_name ?? "Member"} ·{" "}
                {new Date(post.created_at).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {post.priority && (
                <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">
                  Priority
                </span>
              )}
              {(post.author_id === currentUserId || isTopLeader) && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline"
                  onClick={() => deletePost(post)}
                >
                  Delete
                </button>
              )}
            </div>
          </div>

          <p className="mt-2 whitespace-pre-wrap text-sm">{post.body}</p>

          {post.media.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {post.media.map((m) => (
                <img
                  key={m.id}
                  src={m.media_url}
                  alt=""
                  className="aspect-square w-full rounded-lg object-cover"
                />
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-4 text-sm">
            <button
              type="button"
              onClick={() => toggleLike(post)}
              className={post.liked_by_me ? "text-red-600" : "text-muted-foreground"}
            >
              ♥ {post.like_count}
            </button>
          </div>
        </div>
      ))}

      {posts.length === 0 && (
        <div className="text-sm text-muted-foreground">No announcements yet.</div>
      )}
    </div>
  );
}
