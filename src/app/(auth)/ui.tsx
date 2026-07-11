// Small presentational pieces shared by the auth pages (server-rendered).

export function Field({
  label,
  name,
  type,
  minLength,
}: {
  label: string;
  name: string;
  type: "text" | "email" | "password";
  minLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-muted">
      {label}
      <input
        name={name}
        type={type}
        required
        minLength={minLength}
        className="rounded-md border border-border bg-surface px-3 py-2 text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/40"
      />
    </label>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="mt-1 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-fg shadow-sm shadow-accent/30 transition-colors hover:bg-accent-hover"
    >
      {children}
    </button>
  );
}

export function AuthMessages({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null;
  return (
    <>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {message && <p className="text-sm text-emerald-400">{message}</p>}
    </>
  );
}
