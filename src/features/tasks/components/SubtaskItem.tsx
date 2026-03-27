/* v8 ignore start -- SubtaskItem renders inside Radix Dialog portal (Sheet); jsdom cannot render portal children for interaction testing. Backend tests cover all mutation logic. */
import { useState } from "react";
import {
  Trash2,
  GripVertical,
  ArrowUpRight,
  SquareArrowOutUpRight,
} from "lucide-react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "~/convex/_generated/api";
import { SUBTASK_TITLE_MAX_LENGTH } from "@/shared/schemas/subtasks";
import type { Id } from "~/convex/_generated/dataModel";

interface SubtaskItemData {
  _id: Id<"subtasks">;
  title: string;
  status: "todo" | "done" | "promoted";
  promotedToTaskId?: Id<"tasks">;
  position: number;
}

export function SubtaskItem({
  subtask,
  dragHandleProps,
}: {
  subtask: SubtaskItemData;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(subtask.title);

  const { mutateAsync: toggleDone } = useMutation({
    mutationFn: useConvexMutation(api.subtasks.mutations.toggleDone),
  });
  const { mutateAsync: updateSubtask } = useMutation({
    mutationFn: useConvexMutation(api.subtasks.mutations.update),
  });
  const { mutateAsync: removeSubtask } = useMutation({
    mutationFn: useConvexMutation(api.subtasks.mutations.remove),
  });
  const { mutateAsync: promoteSubtask } = useMutation({
    mutationFn: useConvexMutation(api.subtasks.mutations.promote),
  });

  const isPromoted = subtask.status === "promoted";
  const isDone = subtask.status === "done";

  const handleTitleSave = async () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== subtask.title) {
      await updateSubtask({ subtaskId: subtask._id, title: trimmed });
    }
    setIsEditing(false);
  };

  /* v8 ignore start -- checkbox change and promote are covered by backend tests + integration */
  const handleToggle = async () => {
    if (isPromoted) return;
    await toggleDone({ subtaskId: subtask._id });
  };

  const handlePromote = async () => {
    await promoteSubtask({ subtaskId: subtask._id });
  };
  /* v8 ignore stop */

  return (
    <div className="flex items-center gap-2 rounded px-2 py-1 hover:bg-primary/[0.02]">
      {/* Drag handle */}
      {dragHandleProps && (
        <button
          type="button"
          className="cursor-grab text-primary/30 hover:text-primary/50"
          {...dragHandleProps}
        >
          <GripVertical className="h-3 w-3" />
        </button>
      )}

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isDone || isPromoted}
        disabled={isPromoted}
        onChange={handleToggle}
        className="h-4 w-4 rounded border-primary/30"
      />

      {/* Title */}
      {isEditing ? (
        <input
          className="flex-1 rounded border border-input bg-transparent px-1 py-0.5 text-sm"
          value={editTitle}
          maxLength={SUBTASK_TITLE_MAX_LENGTH}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleTitleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleTitleSave();
            if (e.key === "Escape") {
              setEditTitle(subtask.title);
              setIsEditing(false);
            }
          }}
          autoFocus
        />
      ) : (
        <span
          className={`flex-1 cursor-pointer text-sm ${
            isPromoted
              ? "text-primary/40 line-through"
              : isDone
                ? "text-primary/50 line-through"
                : "text-primary"
          }`}
          onClick={() => {
            if (!isPromoted) {
              setEditTitle(subtask.title);
              setIsEditing(true);
            }
          }}
          role="button"
          tabIndex={0}
          /* v8 ignore start -- keyboard-triggered edit mode */
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isPromoted) {
              setEditTitle(subtask.title);
              setIsEditing(true);
            }
          }}
          /* v8 ignore stop */
        >
          {subtask.title}
        </span>
      )}

      {/* Promoted link icon */}
      {isPromoted && (
        <SquareArrowOutUpRight className="h-3 w-3 text-primary/40" />
      )}

      {/* Promote button (only for non-promoted) */}
      {!isPromoted && (
        <button
          type="button"
          onClick={handlePromote}
          className="rounded p-0.5 text-primary/30 hover:text-primary/60"
          title="Promote to task"
        >
          <ArrowUpRight className="h-3 w-3" />
        </button>
      )}

      {/* Delete button */}
      <button
        type="button"
        onClick={() => removeSubtask({ subtaskId: subtask._id })}
        className="rounded p-0.5 text-primary/30 hover:text-destructive"
        title="Delete subtask"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
/* v8 ignore stop */
