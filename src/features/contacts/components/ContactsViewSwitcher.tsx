// @generated-start imports
import { List, LayoutGrid, Table2, Image } from "lucide-react";
// @generated-end imports
// @custom-start imports
// @custom-end imports

const VIEW_CONFIG: Record<string, { icon: typeof List; label: string }> = {
  list: { icon: List, label: "List" },
  card: { icon: LayoutGrid, label: "Cards" },
  table: { icon: Table2, label: "Table" },
  cover: { icon: Image, label: "Cover" },
};

interface ContactsViewSwitcherProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function ContactsViewSwitcher({
  activeView,
  onViewChange,
}: ContactsViewSwitcherProps) {

  const enabledViews = ["list","table"];

  const handleViewChange = (view: string) => {
    onViewChange(view);
    localStorage.setItem("contacts-view-preference", view);
  };

  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border p-1 bg-muted/50">
      {enabledViews.map((view: string) => {
        const config = VIEW_CONFIG[view];
        if (!config) return null;
        const Icon = config.icon;
        const isActive = activeView === view;

        return (
          <button
            key={view}
            type="button"
            onClick={() => handleViewChange(view)}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 inline-flex items-center ${
              isActive
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-primary"
            }`}
            title={config.label}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline ml-1.5">{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}
