// @generated-start imports
import { useTranslation } from "react-i18next";
import { TestGenViewSwitcher } from "./TestGenViewSwitcher";
import { Button } from "@/ui/button";
// @generated-end imports
// @custom-start imports
// @custom-end imports

interface TestGenTitleBarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  count?: number;
}

export function TestGenTitleBar({
  activeView,
  onViewChange,
  count,
}: TestGenTitleBarProps) {
  const { t } = useTranslation("test-gen");


  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      {/* Left: heading + description */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-primary">
          {t("page.title")}
        </h1>
        <p className="text-sm text-primary/60">
          {t("page.description")}
        </p>
      </div>

      {/* Right: search, view switcher, CTA */}
      <div className="flex items-center gap-2">

        <TestGenViewSwitcher
          activeView={activeView}
          onViewChange={onViewChange}
        />

        <Button size="sm">
          {t("form.create")}
        </Button>
      </div>
    </div>
  );
}
