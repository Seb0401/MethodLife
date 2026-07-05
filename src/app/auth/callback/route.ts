import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUserSetup } from "@/lib/auth/ensure-user-setup";
import { es } from "@/lib/i18n/es";

// Target of the email-confirmation link (PKCE flow): exchanges the one-time
// code for a session, provisions the user and enters the app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await ensureUserSetup();
      return NextResponse.redirect(`${origin}/`);
    }
  }
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(es.auth.errors.confirmFailed)}`,
  );
}
