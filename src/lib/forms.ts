import { redirect } from "next/navigation";
import { es } from "@/lib/i18n/es";

export type ActionErrorCode = keyof typeof es.actionErrors;

// Server actions on plain <form>s report failures by redirecting back with a
// typed code; the page reads it from searchParams and shows the message.
export function backWithError(path: string, code: ActionErrorCode): never {
  redirect(`${path}?error=${code}`);
}

export function actionErrorMessage(code?: string): string | undefined {
  if (!code) return undefined;
  return code in es.actionErrors
    ? es.actionErrors[code as ActionErrorCode]
    : es.actionErrors.GENERIC;
}
