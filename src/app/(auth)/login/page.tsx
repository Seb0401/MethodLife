import Link from "next/link";
import { signIn } from "../actions";
import { AuthMessages, Field, SubmitButton } from "../ui";
import { es } from "@/lib/i18n/es";

type Props = { searchParams: Promise<{ error?: string; message?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { error, message } = await searchParams;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{es.auth.login.title}</h2>
      <AuthMessages error={error} message={message} />
      <form action={signIn} className="flex flex-col gap-3">
        <Field label={es.auth.fields.email} name="email" type="email" />
        <Field label={es.auth.fields.password} name="password" type="password" />
        <SubmitButton>{es.auth.login.submit}</SubmitButton>
      </form>
      <p className="text-sm text-neutral-500">
        {es.auth.login.noAccount}{" "}
        <Link href="/register" className="underline">
          {es.auth.login.registerLink}
        </Link>
      </p>
    </div>
  );
}
