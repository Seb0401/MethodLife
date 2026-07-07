// Shared Result type for domain logic (ARQUITECTURA.md §4).
// Domain functions never throw for expected failures: they return a typed
// error that server actions map to a message in es.ts.
export type DomainError = { code: string; message: string };

export type Result<T> = { ok: true; value: T } | { ok: false; error: DomainError };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });

export const err = (code: string, message = code): Result<never> => ({
  ok: false,
  error: { code, message },
});
