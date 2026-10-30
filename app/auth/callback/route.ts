// Google sign-in lands here: swap the one-time code for a session cookie, then
// return the user to where they started (e.g. /apply?service=income-certificate).

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  let next = url.searchParams.get("next") ?? "/apply";
  // Only same-site paths: never bounce to another domain.
  if (!next.startsWith("/") || next.startsWith("//")) next = "/apply";

  if (code) {
    const sb = await supabaseServer();
    const { error } = (await sb?.auth.exchangeCodeForSession(code)) ?? { error: null };
    if (error) console.error("[auth] code exchange failed:", error.message);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
