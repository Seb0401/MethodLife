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

export async function signIn(formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) backWithError("/login", parsed.error.issues[0].message);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) backWithError("/login", es.auth.errors.invalidCredentials);

  await ensureUserSetup();
  redirect("/");
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
    redirect("/");
  }
  redirect(`/login?message=${encodeURIComponent(es.auth.messages.checkEmail)}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
