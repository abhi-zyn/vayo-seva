// Server-side Supabase clients. Never import from a "use client" file.

import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { authEnabled, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/** Acts as the signed-in user (reads their session cookie); RLS applies. */
export async function supabaseServer(): Promise<SupabaseClient | null> {
  if (!authEnabled) return null;
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a read-only context: the browser client refreshes instead.
        }
      },
    },
  });
}

/** The signed-in user, verified with Supabase (not just the cookie), or null. */
export async function currentUser(): Promise<User | null> {
  const sb = await supabaseServer();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user;
}

let admin: SupabaseClient | null = null;

/**
 * Service-role client: bypasses RLS. Only for server code that has already
 * checked who the user is (writing applications, payments, webhooks).
 */
export function supabaseAdmin(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!authEnabled || !key) throw new Error("Supabase is on but SUPABASE_SERVICE_ROLE_KEY is not set");
  admin ??= createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}
