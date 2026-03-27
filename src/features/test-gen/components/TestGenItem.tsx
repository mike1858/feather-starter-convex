// @generated-start imports
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "~/convex/_generated/api";
import { useTranslation } from "react-i18next";
import { Trash2, GripVertical, Flag } from "lucide-react";
import { Button } from "@/ui/button";
import { useDoubleCheck } from "@/ui/use-double-check";
import { TestGenStatusBadge } from "./TestGenStatusBadge";
import type { Id } from "~/convex/_generated/dataModel";
// @generated-end imports
// @custom-start imports
// @custom-end imports

interface TestGenItemData {
  _id: Id<"test-gen">;
  title: string;
  description?: string;
  status?: string;
  priority?: boolean;
}

interface TestGenItemProps {
  item: TestGenItemData;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export function TestGenItem({
  item,
  dragHandleProps,
}: TestGenItemProps) {
  const { t } = useTranslation("test-gen");

  // @generated-start mutations
  const { mutateAsync: removeItem } = useMutation({
    mutationFn: useConvexMutation(api["test-gen"].mutations.remove),
  });
  const { mutateAsync: updateItem } = useMutation({
    mutationFn: useConvexMutation(api["test-gen"].mutations.update),
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

      {/* Status badge */}
      <TestGenStatusBadge
        status={item.status}
        itemId={item._id}
      />

      {/* Title section */}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-primary truncate block">
          {item.title}
        </span>
        {item.description && (
          <span className="text-xs text-primary/50 truncate block mt-0.5">
            {item.description}
          </span>
        )}
      </div>

      {/* Metadata: enum fields as dot badges, boolean fields as indicators */}
      <div className="flex items-center gap-4">

        {/* Priority flag */}
        <button
          type="button"
          onClick={async () => {
            await updateItem({ testGenId: item._id, priority: !item.priority });
          }}
          className={`rounded-md p-1.5 transition-colors hover:bg-primary/5 ${
            item.priority ? "text-orange-500" : "text-primary/20"
          }`}
          title={item.priority ? t("priority.high") : t("priority.normal")}
        >
          <Flag className="h-4 w-4" />
        </button>
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
                  await removeItem({ testGenId: item._id });
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
