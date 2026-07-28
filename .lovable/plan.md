
# Calendar Sync (Google + Outlook)

One-way push from portal → each connected user's Google Calendar and/or Microsoft Outlook. Fires immediately on event create/update/delete. Retries failures. Existing `.ics` subscribe feed stays as fallback.

## What you'll do (one-time setup)

1. I'll open two connector setup forms — **Google Calendar** and **Microsoft Outlook** App User Connector clients.
2. Paste your Google Cloud OAuth Client ID/Secret and your Microsoft Entra Client ID/Secret into the respective forms.
3. Add this exact redirect URI in **both** provider consoles:
   `https://connector-gateway.lovable.dev/api/v1/app-users/oauth2/callback`
4. Ensure **offline access** is enabled on both clients (needed for background sync).

## What I'll build

### 1. Database (migration)
- `app_user_connections` — encrypted per-user Google/Outlook connection keys.
- `calendar_sync_map` — maps (portal event_id, user_id, provider) → provider event ID, so updates/deletes hit the right calendar entry.
- `calendar_sync_log` — every sync attempt: status (success/failed/retry), error, timestamp. For debugging + retry worker.
- All tables RLS-protected: users see only their own rows; service_role for backend workers.

### 2. Server functions (`createServerFn`, protected)
- `startGoogleCalendarConnect` / `startOutlookConnect` → popup OAuth consent.
- `completeCalendarConnect` → exchanges one-time code, encrypts + stores connection key.
- `disconnectCalendar` → revokes connection + purges sync map for that provider.
- `getCalendarConnectionStatus` → shows Connected/Not connected in Profile UI.
- `syncEventToUserCalendars(eventId, action)` → push create/update/delete to every connected user for a given portal event.
- `retryFailedSyncs` → cron-invoked (every 15 min) to retry entries in `calendar_sync_log` where status = 'failed' and attempts < 5, exponential backoff.

### 3. Immediate sync triggers
Instead of a DB trigger (which can't call the connector gateway), the existing Events page (`_authenticated/events.tsx`) calls `syncEventToUserCalendars` right after successful insert/update/delete in Supabase. Fire-and-forget with `.catch()` so calendar sync never blocks the user's action.

### 4. UI
- **Profile page** → new "Connected Calendars" card: two buttons (Google, Outlook), each shows Connected ✓ / Connect / Disconnect. Also a "Sync status" line: last successful sync + link to log if there are failures.
- **Events page** → small badge on each event: "Synced to N calendars" (for admins only).

### 5. Public API route
`/api/public/hooks/retry-calendar-syncs` — cron-callable endpoint (HMAC-verified) that pg_cron hits every 15 min to drive the retry worker.

## Scope of sync
- **What syncs:** all rows in `events` table with `parent_event_id IS NULL` (recurring parents push RRULE; child occurrences skipped, calendars expand them).
- **Recurring events:** mapped to Google/Outlook `recurrence` field (daily/weekly/monthly + until).
- **Fields synced:** title, description, location, start/end, all-day flag, RRULE.
- **Tasks with due dates:** NOT synced (per your answer — only church-wide events).
- **RSVPs:** NOT synced back (one-way only).

## Reliability
- Every gateway call wrapped in try/catch; failures written to `calendar_sync_log` with error text + attempt count.
- Retry worker runs every 15 min, exponential backoff (5m → 30m → 2h → 6h → 24h), gives up after 5 attempts.
- 401 from provider → mark connection as `needs_reauth`, notify user in-app, stop retrying until reconnect.
- Sync failures never block the portal event save.

## Existing functionality preserved
- `.ics` calendar feed (`/api/public/calendar.ics`) stays as-is for users who prefer manual subscribe.
- All existing RLS policies untouched.
- No changes to events schema, roster logic, or attendance.

## Order of execution
1. You configure the two OAuth clients (I'll prompt).
2. I create the migration (tables + RLS + grants + pg_cron entry).
3. I write the server functions + AES-GCM crypto helper.
4. I add the Profile UI card + Events page hook.
5. I verify with a test event + document how to check sync status.

Ready to proceed? I'll start by opening the two connector setup forms.
