import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@cvx/_generated/api";
import { useState } from "react";
import { Button } from "@/ui/button";

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
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Dev Mailbox</h1>
        {emails && emails.length > 0 && (
          <Button
            variant="outline"
            onClick={() => clearAll({})}
          >
            Clear All
          </Button>
        )}
      </div>

      {!emails || emails.length === 0 ? (
        <p className="text-center text-primary/60">
          No emails captured yet
        </p>
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
    </div>
  );
}
