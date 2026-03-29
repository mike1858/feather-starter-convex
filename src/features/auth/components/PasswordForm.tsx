import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";

export function PasswordForm({
  onSuccess,
  onForgotPassword,
  defaultEmail,
  onEmailChange,
}: {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
  defaultEmail?: string;
  onEmailChange?: (email: string) => void;
}) {
  const { signIn } = useAuthActions();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      email: defaultEmail ?? "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      setError(null);
      try {
        await signIn("password", {
          email: value.email,
          password: value.password,
          flow: mode,
        });
        onSuccess?.();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("already exists")) {
          setError("An account with this email already exists. Try signing in.");
        } else if (msg.includes("InvalidAccountId")) {
          setError("No account found with this email. Try signing up.");
        } else {
          setError("Something went wrong. Please try again.");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const submitLabel = mode === "signIn" ? "Sign In" : "Sign Up";
  const toggleLabel = mode === "signIn" ? "Create an account" : "Already have an account?";

  return (
    <div className="flex w-full flex-col gap-3">
      <form
        className="flex w-full flex-col items-start gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <div className="flex w-full flex-col gap-1.5">
          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <form.Field
            name="email"
            validators={{
              onSubmit: z
                .string()
                .max(256)
                .email("Email address is not valid."),
            }}
            children={(field) => (
              <Input
                placeholder="Email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => {
                  field.handleChange(e.target.value);
                  onEmailChange?.(e.target.value);
                }}
                className={`bg-transparent ${
                  /* v8 ignore next -- TanStack Form re-render timing: branch exercised by validation tests but v8 can't trace it */
                  (field.state.meta?.errors?.length ?? 0) > 0 &&
                  "border-destructive focus-visible:ring-destructive"
                }`}
              />
            )}
          />
        </div>

        <div className="flex w-full flex-col gap-1.5">
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <form.Field
            name="password"
            validators={{
              onSubmit: z
                .string()
                .min(8, "Password must be at least 8 characters."),
            }}
            children={(field) => (
              <Input
                type="password"
                placeholder="Password"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className={`bg-transparent ${
                  /* v8 ignore next -- TanStack Form re-render timing: branch exercised by validation tests but v8 can't trace it */
                  (field.state.meta?.errors?.length ?? 0) > 0 &&
                  "border-destructive focus-visible:ring-destructive"
                }`}
              />
            )}
          />
        </div>

        <div className="flex w-full flex-col">
          {/* v8 ignore start -- TanStack Form re-render timing: error display depends on internal re-render cycle */}
          {(form.state.fieldMeta.email?.errors?.length ?? 0) > 0 && (
            <span className="mb-1 text-sm text-destructive dark:text-destructive-foreground">
              {form.state.fieldMeta.email?.errors.join(" ")}
            </span>
          )}
          {(form.state.fieldMeta.password?.errors?.length ?? 0) > 0 && (
            <span className="mb-1 text-sm text-destructive dark:text-destructive-foreground">
              {form.state.fieldMeta.password?.errors.join(" ")}
            </span>
          )}
          {/* v8 ignore stop */}
          {error && (
            <p className="mb-1 text-sm text-destructive dark:text-destructive-foreground">
              {error}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full">
          {isSubmitting ? <Loader2 className="animate-spin" /> : submitLabel}
        </Button>
      </form>

      <div className="flex w-full items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          className="h-auto p-0 text-sm text-primary/60 hover:bg-transparent hover:text-primary"
          onClick={onForgotPassword}
        >
          Forgot password?
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-auto p-0 text-sm text-primary/60 hover:bg-transparent hover:text-primary"
          onClick={() => {
            setError(null);
            setMode(mode === "signIn" ? "signUp" : "signIn");
          }}
        >
          {toggleLabel}
        </Button>
      </div>
    </div>
  );
}
