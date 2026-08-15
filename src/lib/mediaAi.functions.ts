import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runAgentTurn, type TableSpec } from "@/lib/aiAgent";

type Ask = { question: string };

/** AI Media Assistant (data-grounded, tool-calling). */
export const askMediaAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Ask) => {
    if (!input?.question || input.question.trim().length < 3) throw new Error("Please ask a fuller question.");
    return { question: input.question.trim().slice(0, 800) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this workspace.");

    const sb = supabase as any;
    const [requests, projects, posts, streams, assets, volunteers, analytics, risks, training] = await Promise.all([
      sb.from("med_requests").select("*").order("created_at", { ascending: false }).limit(300),
      sb.from("med_projects").select("*").order("created_at", { ascending: false }).limit(200),
      sb.from("med_posts").select("*").order("scheduled_at", { ascending: false }).limit(300),
      sb.from("med_livestreams").select("*").order("starts_at", { ascending: false }).limit(120),
      sb.from("med_assets").select("*").order("created_at", { ascending: false }).limit(300),
      sb.from("med_volunteers").select("*").limit(200),
      sb.from("med_analytics").select("*").order("captured_on", { ascending: false }).limit(200),
      sb.from("med_risks").select("*").limit(200),
      sb.from("med_training_records").select("*").limit(300),
    ]);

    const snapshot = {
      requests: requests.data ?? [],
      projects: projects.data ?? [],
      posts: posts.data ?? [],
      livestreams: streams.data ?? [],
      assets: assets.data ?? [],
      volunteers: volunteers.data ?? [],
      analytics: analytics.data ?? [],
      risks: risks.data ?? [],
      training: training.data ?? [],
    };

    const specs: TableSpec[] = [
      {
        entity: "media_request",
        table: "med_requests",
        describe: "incoming media/design/comms request from another department",
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          request_type: { kind: "string" },
          department_slug: { kind: "string", description: "The requesting department's slug." },
          description: { kind: "string" },
          audience: { kind: "string" },
          priority: { kind: "string" },
          needed_by: { kind: "date" },
          attachment_url: { kind: "string" },
          assigned_to: { kind: "string" },
          status: { kind: "string" },
          approval_stage: { kind: "string" },
          approval_history: { kind: "json" },
          published_at: { kind: "timestamptz" },
          requester_name: { kind: "string" },
        },
      },
      {
        entity: "media_project",
        table: "med_projects",
        describe: "media production project (video, design, photography, etc)",
        columns: {
          name: { kind: "string", requiredOnCreate: true },
          project_type: { kind: "string" },
          ministry: { kind: "string" },
          description: { kind: "string" },
          assigned_team: { kind: "string" },
          stage: { kind: "string" },
          priority: { kind: "string" },
          shoot_date: { kind: "date" },
          deadline: { kind: "date" },
          progress_pct: { kind: "number" },
          checklist: { kind: "json" },
          publish_date: { kind: "date" },
          publish_url: { kind: "string" },
          archived: { kind: "boolean" },
          request_id: { kind: "uuid" },
        },
      },
      {
        entity: "social_post",
        table: "med_posts",
        describe: "social/content calendar post",
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          platform: { kind: "string" },
          campaign: { kind: "string" },
          caption: { kind: "string" },
          hashtags: { kind: "string" },
          asset_url: { kind: "string" },
          scheduled_at: { kind: "timestamptz" },
          status: { kind: "string" },
          reach: { kind: "number" },
          impressions: { kind: "number" },
          engagements: { kind: "number" },
          shares: { kind: "number" },
          comments_count: { kind: "number" },
          clicks: { kind: "number" },
        },
      },
      {
        entity: "livestream",
        table: "med_livestreams",
        describe: "livestream event",
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          stream_type: { kind: "string" },
          platform: { kind: "string" },
          starts_at: { kind: "timestamptz" },
          status: { kind: "string" },
          checklist: { kind: "json" },
          viewers: { kind: "number" },
          peak_viewers: { kind: "number" },
          watch_minutes: { kind: "number" },
          stream_quality: { kind: "string" },
          technical_issues: { kind: "string" },
          recording_url: { kind: "string" },
        },
      },
      {
        entity: "media_asset",
        table: "med_assets",
        describe: "archived media asset (photo/video/graphic)",
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          asset_type: { kind: "string" },
          category: { kind: "string" },
          event_name: { kind: "string" },
          ministry: { kind: "string" },
          speaker: { kind: "string" },
          captured_on: { kind: "date" },
          credited_to: { kind: "string" },
          file_url: { kind: "string" },
          thumbnail_url: { kind: "string" },
          tags: { kind: "string" },
          version_note: { kind: "string" },
          brand_approved: { kind: "boolean" },
          license_expires_on: { kind: "date" },
        },
      },
      {
        entity: "media_volunteer",
        table: "med_volunteers",
        describe: "media team volunteer",
        columns: {
          full_name: { kind: "string", requiredOnCreate: true },
          role: { kind: "string" },
          skills: { kind: "string" },
          availability: { kind: "string" },
          equipment_experience: { kind: "string" },
          projects_completed: { kind: "number" },
          attendance_pct: { kind: "number" },
          performance_score: { kind: "number" },
          leadership_potential: { kind: "string" },
          mentor_name: { kind: "string" },
          ministry_experience: { kind: "string" },
          growth_notes: { kind: "string" },
          active: { kind: "boolean" },
        },
      },
      {
        entity: "analytics_snapshot",
        table: "med_analytics",
        describe: "platform growth/engagement analytics for a period",
        columns: {
          platform: { kind: "string" },
          period_label: { kind: "string", requiredOnCreate: true },
          followers: { kind: "number" },
          reach: { kind: "number" },
          impressions: { kind: "number" },
          engagement_rate: { kind: "number" },
          views: { kind: "number" },
          watch_minutes: { kind: "number" },
          website_visits: { kind: "number" },
          captured_on: { kind: "date" },
        },
      },
      {
        entity: "media_risk",
        table: "med_risks",
        describe: "identified media/comms risk",
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          category: { kind: "string" },
          description: { kind: "string" },
          likelihood: { kind: "number", description: "1–5" },
          impact: { kind: "number", description: "1–5" },
          owner_name: { kind: "string" },
          mitigation: { kind: "string" },
          review_date: { kind: "date" },
          status: { kind: "string", enum: ["open", "mitigated", "closed"] },
        },
      },
      {
        entity: "training_record",
        table: "med_training_records",
        describe: "team member's training/course completion record",
        columns: {
          course_id: { kind: "uuid", requiredOnCreate: true },
          member_name: { kind: "string" },
          progress_pct: { kind: "number" },
          score: { kind: "number" },
          certificate_url: { kind: "string" },
          expires_on: { kind: "date" },
          completed_at: { kind: "date" },
        },
      },
    ];

    const { answer, actions } = await runAgentTurn({
      apiKey,
      systemPrompt:
        "You are the TRoGKC Media Assistant for the media and communications ministry of a Christian church. " +
        "Ground every answer strictly in the JSON media snapshot supplied. Help with: incoming department requests " +
        "and turnaround times, production pipeline bottlenecks, content calendars and caption ideas grounded in the " +
        "scheduled posts, livestream readiness and technical failure patterns, platform growth and engagement " +
        "analytics, archive and brand asset governance, volunteer capacity and training, and department risks. " +
        "Never invent posts, numbers, people or assets that are not in the snapshot. Answer concisely with short " +
        "headings, bullets and clear numbers, in a creative but ministry-minded tone.",
      snapshot,
      question: data.question,
      specs,
      ctx: { supabase: sb, userId, actorLabel: "media assistant" },
    });

    return { answer, actions };
  });
