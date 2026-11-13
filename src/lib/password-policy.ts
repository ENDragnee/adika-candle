// The password rules (Epic 22), shared by the server's Zod schemas and the
// live checklist under every password field, so the form can never
// accept something the API then rejects (or the other way round).
// Length bounds mirror better-auth's emailAndPassword defaults (8–128).

export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string, context: PasswordContext) => boolean;
}

export interface PasswordContext {
  // The account's own name/username/email — a password shouldn't contain
  // them.
  personal?: (string | null | undefined)[];
}

// The handful of passwords people reach for first; not a breach list.
const COMMON = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "qwertyuiop",
  "11111111",
  "iloveyou",
  "admin123",
  "welcome1",
  "letmein1",
  "changeme",
  "changeme123",
]);

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN} characters`,
    test: (password) =>
      password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX,
  },
  {
    id: "mixed-case",
    label: "Upper- and lower-case letters",
    test: (password) => /[a-z]/.test(password) && /[A-Z]/.test(password),
  },
  {
    id: "number",
    label: "At least one number",
    test: (password) => /\d/.test(password),
  },
  {
    id: "not-personal",
    label: "Doesn't contain the person's name or username",
    test: (password, context) => {
      const lower = password.toLowerCase();
      return (context.personal ?? [])
        .flatMap((value) => (value ?? "").toLowerCase().split(/[\s@._-]+/))
        .filter((part) => part.length >= 3)
        .every((part) => !lower.includes(part));
    },
  },
  {
    id: "not-common",
    label: "Not a commonly used password",
    test: (password) => !COMMON.has(password.toLowerCase()),
  },
];

export function FailedPasswordRules(
  password: string,
  context: PasswordContext = {},
): PasswordRule[] {
  return PASSWORD_RULES.filter((rule) => !rule.test(password, context));
}
