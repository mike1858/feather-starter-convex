// @generated-start imports
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "~/convex/_generated/api";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { Button } from "@/ui/button";
import { useDoubleCheck } from "@/ui/use-double-check";
import type { Id } from "~/convex/_generated/dataModel";
// @generated-end imports
// @custom-start imports
// @custom-end imports

interface WorkLogsItemData {
  _id: Id<"work-logs">;
  body: string;
  timeMinutes?: number;
}

interface WorkLogsItemProps {
  item: WorkLogsItemData;
}

export function WorkLogsItem({
  item,
}: WorkLogsItemProps) {
  const { t } = useTranslation("work-logs");

  // @generated-start mutations
  const { mutateAsync: removeItem } = useMutation({
    mutationFn: useConvexMutation(api["work-logs"].mutations.remove),
  });
  // @generated-end mutations

  const { doubleCheck, getButtonProps } = useDoubleCheck();

  return (
    <div className="group flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-4 shadow-card hover:shadow-card-hover hover:border-border/80 transition-all duration-200 ease-out cursor-pointer">


      {/* Title section */}
      <div className="flex-1 min-w-0">
        {item.body && (
          <span className="text-xs text-primary/50 truncate block mt-0.5">
            {item.body}
          </span>
        )}
      </div>

      {/* Metadata: enum fields as dot badges, boolean fields as indicators */}
      <div className="flex items-center gap-4">

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
                  await removeItem({ workLogsId: item._id });
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
