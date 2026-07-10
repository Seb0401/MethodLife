"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ensureUserSetup } from "@/lib/auth/ensure-user-setup";
import { loginSchema, registerSchema } from "@/lib/auth/schemas";
import { es } from "@/lib/i18n/es";

function backWithError(path: "/login" | "/register", message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export type AuthState = { error?: string; ok?: boolean };

// Signs the user in and returns the outcome instead of redirecting. A Server
// Action `redirect()` to a middleware-protected route is not followed by the
// client-side action handler in Next 15 (the session cookie is set but the
// navigation bounces back to /login). The client form does a full navigation to
// /hoy on success, which carries the fresh cookie reliably.
export async function signIn(_prev: AuthState | null, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: es.auth.errors.invalidCredentials };

  await ensureUserSetup();
  return { ok: true };
}

export async function signUp(formData: FormData) {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) backWithError("/register", parsed.error.issues[0].message);

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });
  if (error) backWithError("/register", es.auth.errors.signUpFailed);

  // Session present means email confirmation is disabled in Supabase.
  if (data.session) {
    await ensureUserSetup();
    redirect("/hoy");
  }
  redirect(`/login?message=${encodeURIComponent(es.auth.messages.checkEmail)}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
