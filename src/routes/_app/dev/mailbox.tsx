import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@cvx/_generated/api";
import { useState } from "react";
import { Button } from "@/ui/button";
import { Logo } from "@/ui/logo";
import { Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/_app/dev/mailbox")({
  component: DevMailbox,
});

function DevMailbox() {
  const { data: emails } = useQuery(
    convexQuery(api.devEmails.queries.list, {}),
  );
  const { mutate: clearAll } = useMutation({
    mutationFn: useConvexMutation(api.devEmails.mutations.clearAll),
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="flex min-h-[100vh] w-full flex-col bg-secondary dark:bg-black">
      {/* Dev nav bar */}
      <nav className="z-20 flex w-full items-center justify-between border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-3">
          <Link to="/dashboard">
            <Logo width={32} height={32} />
          </Link>
          <span className="text-sm text-primary/40">/</span>
          <div className="flex items-center gap-2 text-sm font-medium text-primary/70">
            <Mail className="h-4 w-4" />
            Dev Mailbox
          </div>
        </div>
        <Link
          to="/dashboard"
          className="text-sm text-primary/60 hover:text-primary"
        >
          Back to Dashboard
        </Link>
      </nav>

      {/* Header */}
      <header className="z-10 flex w-full flex-col border-b border-border bg-card px-6">
        <div className="mx-auto flex w-full max-w-screen-xl items-center justify-between py-12">
          <div className="flex flex-col items-start gap-2">
            <h1 className="text-3xl font-medium text-primary/80">
              Dev Mailbox
            </h1>
            <p className="text-base font-normal text-primary/60">
              Captured emails from auth flows (OTP, password reset)
            </p>
          </div>
          {emails && emails.length > 0 && (
            <Button variant="outline" onClick={() => clearAll({})}>
              Clear All
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-screen-xl p-6">
        {!emails || emails.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <Mail className="h-12 w-12 text-primary/20" />
            <p className="text-primary/60">No emails captured yet</p>
            <p className="text-sm text-primary/40">
              Trigger an OTP sign-in or password reset to see emails here
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {emails.map((email) => (
              <div
                key={email._id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left"
                  onClick={() =>
                    setExpandedId(
                      expandedId === email._id ? null : email._id,
                    )
                  }
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-primary">
                      {email.subject}
                    </span>
                    <span className="text-sm text-primary/60">
                      To: {email.to.join(", ")}
                    </span>
                  </div>
                  <span className="text-sm text-primary/60">
                    {new Date(email.sentAt).toLocaleString()}
                  </span>
                </button>

                {expandedId === email._id && (
                  <div className="mt-4 border-t border-border pt-4">
                    <div
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: email.html }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
