// @generated-start imports
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "~/convex/_generated/api";
import { useTranslation } from "react-i18next";
import type { Id } from "~/convex/_generated/dataModel";
// @generated-end imports
// @custom-start imports
// @custom-end imports

/**
 * Color palette for status badge (8-slot round-robin by YAML values order).
 */
const STATUS_COLORS: Record<string, { dot: string; text: string }> = {
  "draft": { dot: "bg-gray-400", text: "text-gray-600" },
  "active": { dot: "bg-blue-500", text: "text-blue-600" },
  "completed": { dot: "bg-green-500", text: "text-green-600" },
};

/**
 * Valid transitions for status.
 */
const STATUS_TRANSITIONS: Record<string, string | null> = {
  "draft": "active",
  "active": "completed",
};

/**
 * Labels for status values.
 */
const STATUS_LABELS: Record<string, string> = {
  "draft": "Draft",
  "active": "Active",
  "completed": "Completed",
};

interface TestGenStatusBadgeProps {
  status: string;
  itemId: Id<"test-gen">;
}

export function TestGenStatusBadge({
  status,
  itemId,
}: TestGenStatusBadgeProps) {
  const { t } = useTranslation("test-gen");

  const { mutateAsync: updateStatus } = useMutation({
    mutationFn: useConvexMutation(api["test-gen"].mutations.updateStatus),
  });

  const colors = STATUS_COLORS[status] || { dot: "bg-gray-400", text: "text-gray-600" };
  const nextStatus = STATUS_TRANSITIONS[status] ?? null;
  const currentLabel = STATUS_LABELS[status] || status;
  const nextLabel = nextStatus ? STATUS_LABELS[nextStatus] : null;
  const isTerminal = nextStatus === null;

  const handleClick = async () => {
    if (isTerminal || !nextStatus) return;
    await updateStatus({ testGenId: itemId, status: nextStatus });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={isTerminal}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150 hover:bg-primary/5 disabled:cursor-default disabled:opacity-60 ${colors.text}`}
      title={nextLabel ? `Mark as ${nextLabel}` : currentLabel}
    >
      <span
        className={`h-2 w-2 rounded-full ${colors.dot}`}
        aria-hidden="true"
      />
      {currentLabel}
    </button>
  );
}
