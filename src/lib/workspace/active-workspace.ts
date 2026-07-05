import { cookies } from "next/headers";

export const ACTIVE_WORKSPACE_COOKIE = "workspace_id";

export async function getActiveWorkspaceId(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACTIVE_WORKSPACE_COOKIE)?.value;
}
