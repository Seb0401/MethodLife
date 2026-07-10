import Link from "next/link";
import { LoginForm } from "./login-form";
import { es } from "@/lib/i18n/es";

type Props = { searchParams: Promise<{ error?: string; message?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { message } = await searchParams;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{es.auth.login.title}</h2>
      <LoginForm message={message} />
      <p className="text-sm text-neutral-500">
        {es.auth.login.noAccount}{" "}
        <Link href="/register" className="underline">
          {es.auth.login.registerLink}
        </Link>
      </p>
    </div>
  );
}
