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
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        name={name}
        type={type}
        required
        minLength={minLength}
        className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
      />
    </label>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="mt-1 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-300"
    >
      {children}
    </button>
  );
}

export function AuthMessages({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null;
  return (
    <>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {message && <p className="text-sm text-green-700 dark:text-green-400">{message}</p>}
    </>
  );
}
