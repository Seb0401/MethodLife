import Link from "next/link";
import { signUp } from "../actions";
import { AuthMessages, Field, SubmitButton } from "../ui";
import { es } from "@/lib/i18n/es";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{es.auth.register.title}</h2>
      <AuthMessages error={error} />
      <form action={signUp} className="flex flex-col gap-3">
        <Field label={es.auth.fields.displayName} name="displayName" type="text" />
        <Field label={es.auth.fields.email} name="email" type="email" />
        <Field label={es.auth.fields.password} name="password" type="password" minLength={8} />
        <SubmitButton>{es.auth.register.submit}</SubmitButton>
      </form>
      <p className="text-sm text-neutral-500">
        {es.auth.register.hasAccount}{" "}
        <Link href="/login" className="underline">
          {es.auth.register.loginLink}
        </Link>
      </p>
    </div>
  );
}
