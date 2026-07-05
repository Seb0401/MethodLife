// Typed application errors: server actions map these to user-facing messages.
export type AppErrorCode = "UNAUTHORIZED" | "NOT_WORKSPACE_MEMBER";

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}
