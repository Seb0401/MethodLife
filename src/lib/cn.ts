// Tiny class-name joiner: drops falsy values and joins the rest with a space.
// Avoids pulling in clsx/tailwind-merge for what is a one-liner in practice.
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
