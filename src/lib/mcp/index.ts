import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listEvents from "./tools/list-events";
import listProcessOrders from "./tools/list-process-orders";
import getProcessOrder from "./tools/get-process-order";
import updateActivityStatus from "./tools/update-activity-status";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "trog-leadershipdomain",
  title: "TRoGKC Leadership Portal",
  version: "0.1.0",
  instructions:
    "Tools for the Throne Room of God Kingdom Center leadership portal. Read upcoming events, inspect event Process Orders (readiness, ministry activities, exceptions) and update activity status as the signed-in member.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listEvents, listProcessOrders, getProcessOrder, updateActivityStatus],
});
