import { Trash2, Pencil } from "lucide-react";
import { convexQuery } from "@convex-dev/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "~/convex/_generated/api";
import { formatMinutes } from "@/shared/utils/time-parser";
import type { Id } from "~/convex/_generated/dataModel";

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function WorkLogList({ taskId }: { taskId: Id<"tasks"> }) {
  const { data } = useQuery(
    convexQuery(api.workLogs.queries.listByTask, { taskId }),
  );
  const { data: currentUser } = useQuery(
    convexQuery(api.users.queries.getCurrentUser, {}),
  );

  const { mutateAsync: removeWorkLog } = useMutation({
    mutationFn: useConvexMutation(api.workLogs.mutations.remove),
  });

  const entries = data?.entries ?? [];

  // Display newest first
  const sorted = [...entries].sort(
    (a, b) => b._creationTime - a._creationTime,
  );

  if (sorted.length === 0) {
    return (
      <p className="py-2 text-xs text-primary/40">No work logged yet.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((entry) => {
        const isOwner = currentUser?._id === entry.creatorId;

        return (
          <div
            key={entry._id}
            className="rounded border border-border/50 px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-primary/50">
                <span>{isOwner ? "You" : "Team member"}</span>
                {entry.timeMinutes && (
                  <span className="font-medium text-primary/70">
                    {formatMinutes(entry.timeMinutes)}
                  </span>
                )}
                <span>{relativeTime(entry._creationTime)}</span>
              </div>

              {}
              {isOwner && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded p-0.5 text-primary/30 hover:text-primary/60"
                    title="Edit"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      removeWorkLog({ workLogId: entry._id })
                    }
                    className="rounded p-0.5 text-primary/30 hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
              {}
            </div>
            <p className="mt-1 text-sm text-primary">{entry.body}</p>
          </div>
        );
      })}
    </div>
  );
}
