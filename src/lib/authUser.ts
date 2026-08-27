import { supabase } from "@/integrations/supabase/client";

/**
 * Fast identity lookup.
 *
 * `supabase.auth.getUser()` makes a network round-trip to the auth server on
 * every call, and the portal calls it on nearly every page, hook and widget —
 * which is what made navigation feel slow. `getSession()` reads the already
 * validated session from local storage/memory, so it is effectively instant.
 * Row Level Security still enforces real authorisation on the server.
 */
export async function getAuthUserResult() {
  const { data, error } = await supabase.auth.getSession();
  return { data: { user: data.session?.user ?? null }, error };
}

export async function getAuthUser() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}
