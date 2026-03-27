// @generated-start imports
import { useTranslation } from "react-i18next";
import { Button } from "@/ui/button";
// @generated-end imports
// @custom-start imports
// @custom-end imports

interface SubtasksTitleBarProps {
  count?: number;
}

export function SubtasksTitleBar({
  count,
}: SubtasksTitleBarProps) {
  const { t } = useTranslation("subtasks");


  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      {/* Left: heading + description */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-primary">
          {t("page.title")}
          {count != null && count > 0 && (
            <span className="ml-2 text-sm font-normal text-primary/40">{count}</span>
          )}
        </h1>
        <p className="text-sm text-primary/60">
          {t("page.description")}
        </p>
      </div>

      {/* Right: search, view switcher, CTA */}
      <div className="flex items-center gap-2">


        <Button size="sm">
          {t("form.create")}
        </Button>
      </div>
    </div>
  );
}
