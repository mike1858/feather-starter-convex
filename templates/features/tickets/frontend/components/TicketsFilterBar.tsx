// @generated-start imports
import { useTranslation } from "react-i18next";
// @generated-end imports
// @custom-start imports
// @custom-end imports

interface TicketsFilterBarProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const FILTERS = [
  { key: "all", labelKey: "filter.all" },
  { key: "status:open", labelKey: "status.open" },
  { key: "status:in_progress", labelKey: "status.in_progress" },
  { key: "status:resolved", labelKey: "status.resolved" },
  { key: "status:closed", labelKey: "status.closed" },
  { key: "priority:low", labelKey: "status.low" },
  { key: "priority:medium", labelKey: "status.medium" },
  { key: "priority:high", labelKey: "status.high" },
  { key: "priority:critical", labelKey: "status.critical" },
];

export function TicketsFilterBar({
  activeFilter,
  onFilterChange,
}: TicketsFilterBarProps) {
  const { t } = useTranslation("tickets");

  return (
    <div className="flex items-center gap-0.5 border-b border-border">
      {}
      {FILTERS.map((filter) => (
        <button
          key={filter.key}
          type="button"
          onClick={() => onFilterChange(filter.key)}
          className={`px-4 py-2 text-sm font-semibold transition-colors duration-150 relative ${
            activeFilter === filter.key
              ? "text-primary"
              : "text-muted-foreground hover:text-primary"
          }`}
        >
          {t(filter.labelKey)}
          {activeFilter === filter.key && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>
      ))}
      {}
    </div>
  );
}
