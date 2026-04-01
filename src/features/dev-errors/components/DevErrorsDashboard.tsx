import { useMutation, useQuery } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@cvx/_generated/api";
import { useState } from "react";
import { Button } from "@/ui/button";
import { Logo } from "@/ui/logo";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

const SOURCE_COLORS: Record<string, string> = {
  frontend: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  backend:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  silent:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  startup: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
};

export function DevErrorsDashboard() {
  const { data: errors } = useQuery(
    convexQuery(api.devErrors.queries.list, {}),
  );
  const { mutate: clearAll } = useMutation({
    mutationFn: useConvexMutation(api.devErrors.mutations.clearAll),
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
            <AlertTriangle className="h-4 w-4" />
            Dev Errors
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
              Dev Errors
            </h1>
            <p className="text-base font-normal text-primary/60">
              Captured errors from frontend crashes, backend failures, and
              silent errors
            </p>
          </div>
          {errors && errors.length > 0 && (
            <Button
              variant="outline"
              onClick={() => clearAll({})}
              data-testid="clear-all-btn"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-screen-xl p-6">
        {!errors || errors.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <AlertTriangle className="h-12 w-12 text-primary/20" />
            <p className="text-primary/60">No errors captured yet</p>
            <p className="text-sm text-primary/40">
              Errors from React crashes, backend failures, and silent errors
              will appear here
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {errors.map((error) => (
              <div
                key={error._id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex w-full items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_COLORS[error.source] ?? ""}`}
                      >
                        {error.source}
                      </span>
                      <span className="font-medium text-primary">
                        {error.message}
                      </span>
                    </div>
                    {error.route && (
                      <span className="text-sm text-primary/60">
                        Route: {error.route}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-primary/60">
                    {new Date(error.timestamp).toLocaleString()}
                  </span>
                </div>

                <button
                  type="button"
                  className="mt-2 flex items-center gap-1 text-sm text-primary/40 hover:text-primary/60"
                  onClick={() =>
                    setExpandedId(
                      expandedId === error._id ? null : error._id,
                    )
                  }
                >
                  {expandedId === error._id ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      Hide details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      Show details
                    </>
                  )}
                </button>

                {expandedId === error._id && (
                  <div className="mt-2 space-y-2 border-t border-border pt-4 text-sm">
                    {error.stack && (
                      <div>
                        <span className="font-medium text-primary/70">
                          Stack Trace:
                        </span>
                        <pre className="mt-1 overflow-x-auto rounded bg-secondary p-3 text-xs text-primary/60">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    {error.functionName && (
                      <div>
                        <span className="font-medium text-primary/70">
                          Function:{" "}
                        </span>
                        <span className="text-primary/60">
                          {error.functionName}
                        </span>
                      </div>
                    )}
                    {error.args && (
                      <div>
                        <span className="font-medium text-primary/70">
                          Args:{" "}
                        </span>
                        <code className="text-primary/60">{error.args}</code>
                      </div>
                    )}
                    {error.browserInfo && (
                      <div>
                        <span className="font-medium text-primary/70">
                          Browser:{" "}
                        </span>
                        <span className="text-primary/60">
                          {error.browserInfo}
                        </span>
                      </div>
                    )}
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
