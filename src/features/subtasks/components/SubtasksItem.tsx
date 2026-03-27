// @generated-start imports
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "~/convex/_generated/api";
import { useTranslation } from "react-i18next";
import { Trash2, GripVertical } from "lucide-react";
import { Button } from "@/ui/button";
import { useDoubleCheck } from "@/ui/use-double-check";
import type { Id } from "~/convex/_generated/dataModel";
// @generated-end imports
// @custom-start imports
// @custom-end imports

interface SubtasksItemData {
  _id: Id<"subtasks">;
  title: string;
  status?: string;
}

interface SubtasksItemProps {
  item: SubtasksItemData;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export function SubtasksItem({
  item,
  dragHandleProps,
}: SubtasksItemProps) {
  const { t } = useTranslation("subtasks");

  // @generated-start mutations
  const { mutateAsync: removeItem } = useMutation({
    mutationFn: useConvexMutation(api.subtasks.mutations.remove),
  });
  // @generated-end mutations

  const { doubleCheck, getButtonProps } = useDoubleCheck();

  return (
    <div className="group flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-4 shadow-card hover:shadow-card-hover hover:border-border/80 transition-all duration-200 ease-out cursor-pointer">
      {/* Drag handle */}
      {dragHandleProps && (
        <button
          type="button"
          className="p-1 cursor-grab text-primary/30 hover:text-primary/50"
          {...dragHandleProps}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}


      {/* Title section */}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-primary truncate block">
          {item.title}
        </span>
      </div>

      {/* Metadata: enum fields as dot badges, boolean fields as indicators */}
      <div className="flex items-center gap-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
          <span className="h-2 w-2 rounded-full" aria-hidden="true" />
          {item.status}
        </span>

      </div>

      {/* Actions (visible on hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive/70 hover:text-destructive"
          {...getButtonProps({
            onClick: doubleCheck
              ? async () => {
                  await removeItem({ subtasksId: item._id });
                }
              : undefined,
          })}
        >
          {doubleCheck ? (
            <span className="text-xs">{t("delete.confirm")}</span>
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
