"use client";

import { useActionState, useEffect } from "react";
import { signIn } from "../actions";
import { AuthMessages, Field, SubmitButton } from "../ui";
import { es } from "@/lib/i18n/es";

// Login form. On success the action returns `{ ok }` and we navigate with a full
// page load so the freshly-set session cookie is sent (a Server Action redirect
// to the protected /hoy is not followed reliably by the client in Next 15).
export function LoginForm({ message }: { message?: string }) {
  const [state, action] = useActionState(signIn, null);

  useEffect(() => {
    if (state?.ok) window.location.assign("/hoy");
  }, [state]);

  return (
    <>
      <AuthMessages error={state?.error} message={message} />
      <form action={action} className="flex flex-col gap-3">
        <Field label={es.auth.fields.email} name="email" type="email" />
        <Field label={es.auth.fields.password} name="password" type="password" />
        <SubmitButton>{es.auth.login.submit}</SubmitButton>
      </form>
    </>
  );
}
