"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/workspace/active-workspace";

export async function setActiveWorkspace(formData: FormData) {
  const workspaceId = z.uuid().parse(formData.get("workspaceId"));
  await getWorkspaceContext(workspaceId); // throws if the user is not a member

  const store = await cookies();
  store.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, { path: "/", sameSite: "lax" });
  redirect("/hoy");
}
