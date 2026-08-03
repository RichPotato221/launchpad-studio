import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ask = { question: string };

/** MODULE 12 — AI Worship Assistant (data-grounded). */
export const askWorshipAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Ask) => {
    if (!input?.question || input.question.trim().length < 3) throw new Error("Please ask a fuller question.");
    return { question: input.question.trim().slice(0, 800) };
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this workspace.");

    const sb = supabase as any;
    const [services, setSongs, songs, members, rehearsals, attendance, assignments, equipment, faults, risks, training, spiritual] =
      await Promise.all([
        sb.from("worship_services").select("*").order("service_date", { ascending: false }).limit(60),
        sb.from("worship_set_songs").select("service_id, song_id, segment, order_index, song_key").limit(500),
        sb.from("songs").select("id, title, artist, song_key, tempo, themes, scripture_theme, ccli_number, licence_notes, times_used, last_used_on").limit(500),
        sb.from("worship_team_members").select("*").limit(300),
        sb.from("worship_rehearsals").select("*").order("rehearsal_date", { ascending: false }).limit(80),
        sb.from("worship_rehearsal_attendance").select("*").limit(1500),
        sb.from("worship_assignments").select("*").limit(1000),
        sb.from("worship_equipment").select("*").limit(300),
        sb.from("worship_equipment_faults").select("*").order("reported_on", { ascending: false }).limit(200),
        sb.from("worship_risks").select("*").limit(200),
        sb.from("worship_training_records").select("*").limit(500),
        sb.from("worship_spiritual_log").select("*").order("activity_date", { ascending: false }).limit(500),
      ]);

    const snapshot = {
      services: services.data ?? [],
      worship_sets: setSongs.data ?? [],
      music_library: songs.data ?? [],
      team: members.data ?? [],
      rehearsals: rehearsals.data ?? [],
      rehearsal_attendance: attendance.data ?? [],
      assignments: assignments.data ?? [],
      equipment: equipment.data ?? [],
      open_faults: (faults.data ?? []).filter((f: any) => !["resolved", "closed"].includes(f.status)),
      risks: risks.data ?? [],
      training: training.data ?? [],
      spiritual_formation: spiritual.data ?? [],
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        messages: [
          {
            role: "system",
            content:
              "You are the TRoGKC Worship Operations Assistant, advising the worship and music ministry of a Christian church. " +
              "Ground every answer strictly in the JSON worship snapshot supplied. Help with: building worship sets that match a sermon theme " +
              "and scripture, rehearsal plans, scheduling and burnout risk, equipment servicing, song licensing, volunteer development, " +
              "spiritual formation of the team, and ministry reports. Never invent numbers, names, or songs that are not in the library — " +
              "if you suggest well-known songs outside the library, label them clearly as suggestions to add. Keep answers concise, with " +
              "short headings and bullets, and always keep the focus on ministering to the Lord in Spirit and truth.",
          },
          { role: "user", content: `Worship snapshot:\n${JSON.stringify(snapshot)}\n\nQuestion: ${data.question}` },
        ],
      }),
    });

    if (res.status === 429) throw new Error("The AI assistant is rate limited right now. Please try again shortly.");
    if (res.status === 402) throw new Error("AI credits are exhausted. Please top up the workspace to continue.");
    if (!res.ok) throw new Error(`AI request failed [${res.status}]: ${await res.text()}`);

    const json = await res.json();
    return { answer: json.choices?.[0]?.message?.content ?? "No answer returned." };
  });
