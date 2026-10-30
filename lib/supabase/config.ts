// Which optional services are switched on. When keys are missing the app keeps
// working as before (no login, no payment), so a demo never breaks mid-setup.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// Supabase calls this the "anon" or "publishable" key: safe in the browser, RLS protects data.
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Google sign-in + saved applications are on when the public Supabase keys are set. */
export const authEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
