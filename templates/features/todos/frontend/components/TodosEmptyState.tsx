// @generated-start imports
import { useTranslation } from "react-i18next";
import { List, Search, AlertCircle } from "lucide-react";
import { Button } from "@/ui/button";
// @generated-end imports
// @custom-start imports
// @custom-end imports

type EmptyStateVariant = "noData" | "noMatches" | "error";

const VARIANT_CONFIG: Record<
  EmptyStateVariant,
  { icon: typeof List; headingKey: string; descriptionKey: string; ctaKey?: string }
> = {
  noData: {
    icon: List,
    headingKey: "empty.title",
    descriptionKey: "empty.description",
    ctaKey: "empty.cta",
  },
  noMatches: {
    icon: Search,
    headingKey: "empty.noResults",
    descriptionKey: "empty.noResultsDescription",
  },
  error: {
    icon: AlertCircle,
    headingKey: "error.loadFailedTitle",
    descriptionKey: "error.loadFailedDescription",
    ctaKey: "error.retry",
  },
};

interface TodosEmptyStateProps {
  variant?: EmptyStateVariant;
  onAction?: () => void;
}

export function TodosEmptyState({
  variant = "noData",
  onAction,
}: TodosEmptyStateProps) {
  const { t } = useTranslation("todos");
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      <Icon className="h-12 w-12 text-primary/20 mb-4" />
      <h2 className="text-sm font-semibold text-primary mb-1">
        {t(config.headingKey)}
      </h2>
      <p className="text-sm text-primary/50 text-center max-w-sm mb-4">
        {t(config.descriptionKey)}
      </p>
      {config.ctaKey && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {t(config.ctaKey)}
        </Button>
      )}
    </div>
  );
}
