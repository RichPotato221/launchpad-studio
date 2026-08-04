import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { fmtDate } from "@/lib/finance";
import { Section, BarRow, Empty } from "./shared";

const sb = supabase as any;

export function VisionModule() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ year: new Date().getFullYear(), theme: "", scripture: "", vision_statement: "", priorities: "" });
  const [obj, setObj] = useState({ title: "", department_slug: "", target_date: "", progress_pct: 0 });
  const [directive, setDirective] = useState({ title: "", body: "" });

  const vision = useQuery({
    queryKey: ["apo-vision"],
    queryFn: async () => {
      const { data } = await sb.from("apo_vision").select("*").order("year", { ascending: false });
      return data ?? [];
    },
  });
  const current = vision.data?.[0] ?? null;

  const objectives = useQuery({
    queryKey: ["apo-objectives", current?.id],
    enabled: !!current,
    queryFn: async () => {
      const { data } = await sb.from("apo_objectives").select("*").eq("vision_id", current.id).order("created_at");
      return data ?? [];
    },
  });

  const directives = useQuery({
    queryKey: ["apo-directives"],
    queryFn: async () => {
      const { data } = await sb.from("apo_directives").select("*").order("issued_at", { ascending: false }).limit(30);
      return data ?? [];
    },
  });

  const createVision = useMutation({
    mutationFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await sb.from("apo_vision").insert({
        year: Number(form.year),
        theme: form.theme,
        scripture: form.scripture || null,
        vision_statement: form.vision_statement || null,
        kingdom_priorities: form.priorities ? form.priorities.split(",").map((s) => s.trim()).filter(Boolean) : [],
        created_by: userRes.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Annual vision saved");
      setForm({ year: new Date().getFullYear(), theme: "", scripture: "", vision_statement: "", priorities: "" });
      qc.invalidateQueries({ queryKey: ["apo-vision"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const publish = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("apo_vision").update({ status: "published", published_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vision published to the ministry");
      qc.invalidateQueries({ queryKey: ["apo-vision"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addObjective = useMutation({
    mutationFn: async () => {
      const { error } = await sb.from("apo_objectives").insert({
        vision_id: current.id,
        title: obj.title,
        department_slug: obj.department_slug || null,
        target_date: obj.target_date || null,
        progress_pct: Number(obj.progress_pct) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setObj({ title: "", department_slug: "", target_date: "", progress_pct: 0 });
      qc.invalidateQueries({ queryKey: ["apo-objectives"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setProgress = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number }) => {
      const { error } = await sb.from("apo_objectives").update({ progress_pct: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apo-objectives"] }),
  });

  const addDirective = useMutation({
    mutationFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await sb.from("apo_directives").insert({
        vision_id: current?.id ?? null,
        title: directive.title,
        body: directive.body,
        created_by: userRes.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDirective({ title: "", body: "" });
      toast.success("Prophetic directive recorded");
      qc.invalidateQueries({ queryKey: ["apo-directives"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const alignment = objectives.data?.length
    ? Math.round(objectives.data.reduce((s: number, o: any) => s + Number(o.progress_pct ?? 0), 0) / objectives.data.length)
    : 0;

  return (
    <div className="space-y-6">
      <Section title="Annual vision" description="Theme, scripture and Kingdom priorities for the year">
        <div className="grid gap-3 md:grid-cols-2">
          <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} placeholder="Year" />
          <Input value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} placeholder="Vision theme" />
          <Input value={form.scripture} onChange={(e) => setForm({ ...form, scripture: e.target.value })} placeholder="Anchor scripture" />
          <Input value={form.priorities} onChange={(e) => setForm({ ...form, priorities: e.target.value })} placeholder="Kingdom priorities (comma separated)" />
          <Textarea className="md:col-span-2" rows={3} value={form.vision_statement} onChange={(e) => setForm({ ...form, vision_statement: e.target.value })} placeholder="Vision statement" />
        </div>
        <Button className="mt-3" disabled={!form.theme || createVision.isPending} onClick={() => createVision.mutate()}>
          Save vision
        </Button>

        <div className="mt-6 space-y-3">
          {(vision.data ?? []).map((v: any) => (
            <div key={v.id} className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 pb-3 last:border-0">
              <div>
                <p className="text-sm font-medium">{v.year} · {v.theme}</p>
                <p className="text-xs text-muted-foreground">{v.scripture}</p>
                {v.kingdom_priorities?.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">Priorities: {v.kingdom_priorities.join(" · ")}</p>
                )}
              </div>
              {v.status === "published" ? (
                <span className="text-xs text-muted-foreground">Published {fmtDate(v.published_at)}</span>
              ) : (
                <Button size="sm" variant="outline" onClick={() => publish.mutate(v.id)}>Publish vision letter</Button>
              )}
            </div>
          ))}
          {(vision.data?.length ?? 0) === 0 && <Empty>No annual vision recorded yet.</Empty>}
        </div>
      </Section>

      {current && (
        <Section title="Strategic objectives" description={`Linked to Vision ${current.year} · average implementation ${alignment}%`}>
          <div className="grid gap-3 md:grid-cols-4">
            <Input value={obj.title} onChange={(e) => setObj({ ...obj, title: e.target.value })} placeholder="Objective" />
            <Input value={obj.department_slug} onChange={(e) => setObj({ ...obj, department_slug: e.target.value })} placeholder="Department slug" />
            <Input type="date" value={obj.target_date} onChange={(e) => setObj({ ...obj, target_date: e.target.value })} />
            <Button disabled={!obj.title} onClick={() => addObjective.mutate()}>Add objective</Button>
          </div>
          <div className="mt-5 space-y-4">
            {(objectives.data ?? []).map((o: any) => (
              <div key={o.id}>
                <BarRow label={`${o.title}${o.department_slug ? ` · ${o.department_slug}` : ""}`} value={Number(o.progress_pct)} max={100} hint={`${o.progress_pct}% · due ${fmtDate(o.target_date)}`} />
                <input
                  type="range"
                  min={0}
                  max={100}
                  defaultValue={o.progress_pct}
                  onMouseUp={(e) => setProgress.mutate({ id: o.id, value: Number((e.target as HTMLInputElement).value) })}
                  onTouchEnd={(e) => setProgress.mutate({ id: o.id, value: Number((e.target as HTMLInputElement).value) })}
                  className="mt-1 w-full"
                />
              </div>
            ))}
            {(objectives.data?.length ?? 0) === 0 && <Empty>No objectives linked to this vision yet.</Empty>}
          </div>
        </Section>
      )}

      <Section title="Prophetic directives & vision letters" description="Published to the whole ministry">
        <div className="grid gap-3">
          <Input value={directive.title} onChange={(e) => setDirective({ ...directive, title: e.target.value })} placeholder="Directive title" />
          <Textarea rows={3} value={directive.body} onChange={(e) => setDirective({ ...directive, body: e.target.value })} placeholder="Directive / vision letter" />
          <Button className="w-fit" disabled={!directive.title || !directive.body} onClick={() => addDirective.mutate()}>Record directive</Button>
        </div>
        <div className="mt-5 space-y-3">
          {(directives.data ?? []).map((d: any) => (
            <Card key={d.id} className="p-4">
              <p className="text-sm font-medium">{d.title}</p>
              <p className="text-xs text-muted-foreground">{fmtDate(d.issued_at)}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{d.body}</p>
            </Card>
          ))}
          {(directives.data?.length ?? 0) === 0 && <Empty>No directives recorded.</Empty>}
        </div>
      </Section>
    </div>
  );
}
