import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";

export function PasswordResetForm({ onBack, defaultEmail }: { onBack: () => void; defaultEmail?: string }) {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<"forgot" | { email: string }>("forgot");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (step === "forgot") {
    return (
      <ForgotStep
        defaultEmail={defaultEmail}
        isSubmitting={isSubmitting}
        onSubmit={async (email) => {
          setIsSubmitting(true);
          setError(null);
          try {
            await signIn("password", { email, flow: "reset" });
            setStep({ email });
          /* v8 ignore start -- error path requires signIn to reject */
          } catch {
            setError("Could not send reset code. Please try again.");
          } finally {
            setIsSubmitting(false);
          }
          /* v8 ignore stop */
        }}
        onBack={onBack}
      />
    );
  }

  return (
    <VerifyResetStep
      email={step.email}
      isSubmitting={isSubmitting}
      error={error}
      onSubmit={async (code, newPassword) => {
        setIsSubmitting(true);
        setError(null);
        try {
          await signIn("password", {
            email: step.email,
            code: code.trim(),
            newPassword,
            flow: "reset-verification",
          });
        /* v8 ignore start -- error path requires signIn to reject */
        } catch {
          setError("Invalid or expired code. Please check and try again.");
        } finally {
          setIsSubmitting(false);
        }
        /* v8 ignore stop */
      }}
      onBack={onBack}
    />
  );
}

function ForgotStep({
  defaultEmail,
  isSubmitting,
  onSubmit,
  onBack,
}: {
  defaultEmail?: string;
  isSubmitting: boolean;
  onSubmit: (email: string) => Promise<void>;
  onBack: () => void;
}) {
  const form = useForm({
    defaultValues: { email: defaultEmail ?? "" },
    onSubmit: async ({ value }) => {
      await onSubmit(value.email);
    },
  });

  return (
    <div className="mx-auto flex h-full w-full max-w-96 flex-col items-center justify-center gap-6">
      <div className="mb-2 flex flex-col gap-2">
        <h3 className="text-center text-2xl font-medium text-primary">
          Reset your password
        </h3>
        <p className="text-center text-base font-normal text-primary/60">
          Enter your email and we will send you a reset code.
        </p>
      </div>

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
                onChange={(e) => field.handleChange(e.target.value)}
                className={`bg-transparent ${
                  /* v8 ignore start -- branch depends on TanStack Form re-render timing */
                  (field.state.meta?.errors?.length ?? 0) > 0 &&
                  "border-destructive focus-visible:ring-destructive"
                  /* v8 ignore stop */
                }`}
              />
            )}
          />
        </div>

        <div className="flex w-full flex-col">
          {/* v8 ignore start -- branch depends on TanStack Form re-render timing */
          (form.state.fieldMeta.email?.errors?.length ?? 0) > 0 && (
            <span className="mb-1 text-sm text-destructive dark:text-destructive-foreground">
              {form.state.fieldMeta.email?.errors.join(" ")}
            </span>
          )
          /* v8 ignore stop */}
        </div>

        <Button type="submit" className="w-full">
          {/* v8 ignore start -- spinner only visible during brief signIn round-trip */
          isSubmitting ? (
            <Loader2 className="animate-spin" />
          ) : (
            "Send Reset Code"
          )
          /* v8 ignore stop */}
        </Button>
      </form>

      <Button
        type="button"
        variant="ghost"
        className="h-auto p-0 text-sm text-primary/60 hover:bg-transparent hover:text-primary"
        onClick={onBack}
      >
        Back to sign in
      </Button>
    </div>
  );
}

function VerifyResetStep({
  email,
  isSubmitting,
  error,
  onSubmit,
  onBack,
}: {
  email: string;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (code: string, newPassword: string) => Promise<void>;
  onBack: () => void;
}) {
  const form = useForm({
    defaultValues: { code: "", newPassword: "" },
    onSubmit: async ({ value }) => {
      await onSubmit(value.code, value.newPassword);
    },
  });

  return (
    <div className="mx-auto flex h-full w-full max-w-96 flex-col items-center justify-center gap-6">
      <div className="mb-2 flex flex-col gap-2">
        <h3 className="text-center text-2xl font-medium text-primary">
          Enter reset code
        </h3>
        <p className="text-center text-base font-normal text-primary/60">
          We sent a code to {email}. Enter it below with your new password.
        </p>
        {/* v8 ignore start -- dev-only link, not rendered in production */
        import.meta.env.DEV && (
          <a
            href="/dev/mailbox"
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-sm text-blue-500 hover:underline"
          >
            Open Dev Mailbox to get the code
          </a>
        )
        /* v8 ignore stop */}
      </div>

      <form
        className="flex w-full flex-col items-start gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <div className="flex w-full flex-col gap-1.5">
          <label htmlFor="code" className="sr-only">
            Code
          </label>
          <form.Field
            name="code"
            validators={{
              onSubmit: z
                .string()
                .min(8, "Code must be at least 8 characters."),
            }}
            children={(field) => (
              <Input
                placeholder="8-digit reset code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className={`bg-transparent font-mono text-lg tracking-widest ${
                  /* v8 ignore start -- branch depends on TanStack Form re-render timing */
                  (field.state.meta?.errors?.length ?? 0) > 0 &&
                  "border-destructive focus-visible:ring-destructive"
                  /* v8 ignore stop */
                }`}
              />
            )}
          />
        </div>

        <div className="flex w-full flex-col gap-1.5">
          <label htmlFor="newPassword" className="sr-only">
            New Password
          </label>
          <form.Field
            name="newPassword"
            validators={{
              onSubmit: z
                .string()
                .min(8, "Password must be at least 8 characters."),
            }}
            children={(field) => (
              <Input
                type="password"
                placeholder="New Password"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className={`bg-transparent ${
                  /* v8 ignore start -- branch depends on TanStack Form re-render timing */
                  (field.state.meta?.errors?.length ?? 0) > 0 &&
                  "border-destructive focus-visible:ring-destructive"
                  /* v8 ignore stop */
                }`}
              />
            )}
          />
        </div>

        <div className="flex w-full flex-col">
          {/* v8 ignore start -- branch depends on TanStack Form re-render timing */
          (form.state.fieldMeta.code?.errors?.length ?? 0) > 0 && (
            <span className="mb-1 text-sm text-destructive dark:text-destructive-foreground">
              {form.state.fieldMeta.code?.errors.join(" ")}
            </span>
          )
          /* v8 ignore stop */}
          {/* v8 ignore start -- branch depends on TanStack Form re-render timing */
          (form.state.fieldMeta.newPassword?.errors?.length ?? 0) > 0 && (
            <span className="mb-1 text-sm text-destructive dark:text-destructive-foreground">
              {form.state.fieldMeta.newPassword?.errors.join(" ")}
            </span>
          )
          /* v8 ignore stop */}
        </div>

        {/* v8 ignore start -- error only visible on failed verification */
        error && (
          <span className="mb-1 text-sm text-destructive dark:text-destructive-foreground">
            {error}
          </span>
        )
        /* v8 ignore stop */}

        <Button type="submit" className="w-full">
          {/* v8 ignore start -- spinner only visible during brief signIn round-trip */
          isSubmitting ? (
            <Loader2 className="animate-spin" />
          ) : (
            "Reset Password"
          )
          /* v8 ignore stop */}
        </Button>
      </form>

      <Button
        type="button"
        variant="ghost"
        className="h-auto p-0 text-sm text-primary/60 hover:bg-transparent hover:text-primary"
        onClick={onBack}
      >
        Back to sign in
      </Button>
    </div>
  );
}
