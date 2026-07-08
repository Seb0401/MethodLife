import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";
import { acceptInvitation } from "@/actions/workspace";
import { FormError, SubmitButton } from "@/components/ui/form";
import { actionErrorMessage } from "@/lib/forms";
import { isPending } from "@/domain/workspace/invitation";
import { es } from "@/lib/i18n/es";

export default async function AcceptInvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  await getWorkspaceContext(); // requires a signed-in user (route is protected)

  const invitation = await prisma.workspaceInvitation.findUnique({
    where: { token },
    include: { workspace: { select: { name: true } } },
  });
  const valid = invitation != null && isPending(invitation.status);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <h1 className="text-2xl font-bold">{es.workspace.accept.title}</h1>

      {!valid ? (
        <p className="text-sm text-neutral-500">{es.workspace.accept.invalid}</p>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-sm">
            <span className="font-semibold">{invitation.workspace.name}</span>
            {" · "}
            {es.workspace.accept.role}: {es.workspace.roles[invitation.role]}
          </p>
          <p className="text-xs text-neutral-500">{es.workspace.accept.description}</p>

          <FormError message={actionErrorMessage(error)} />

          <form action={acceptInvitation}>
            <input type="hidden" name="token" value={token} />
            <SubmitButton>{es.workspace.accept.accept}</SubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}
