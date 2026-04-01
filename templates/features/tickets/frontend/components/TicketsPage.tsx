// @generated-start imports
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "~/convex/_generated/api";
import { useState } from "react";
import { TicketsTitleBar } from "./TicketsTitleBar";
import { TicketsForm } from "./TicketsForm";
import { TicketsListView } from "./TicketsListView";
import { TicketsFilterBar } from "./TicketsFilterBar";
import { TicketsEmptyState } from "./TicketsEmptyState";
// @generated-end imports
// @custom-start imports
// @custom-end imports

export function TicketsPage() {
  const { data: items = [] } = useQuery(
    convexQuery(api.tickets.queries.list, {}),
  );

  // @generated-start state
  const [activeFilter, setActiveFilter] = useState<string>("all");
  // @generated-end state
  // @custom-start state
  // @custom-end state
  const filteredItems = activeFilter === "all"
    ? items
    : items.filter((item: any) => {
        if (activeFilter.includes(":")) {
          const [field, value] = activeFilter.split(":");
          return item[field] === value;
        }
        /* v8 ignore next -- fallback for non-colon filter keys; all current filters use colon syntax */
        return true;
      });
  // @generated-start render
  const renderActiveView = () => {
    if (filteredItems.length === 0) {
      return (
        <TicketsEmptyState
          variant={activeFilter !== "all" ? "noMatches" : "noData"}
        />
      );
    }

    return <TicketsListView items={filteredItems} />;
  };
  // @generated-end render

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl">
      <TicketsTitleBar
        count={filteredItems.length}
      />

      <TicketsForm mode="inline" />

      <TicketsFilterBar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* @custom-start content */}
      {renderActiveView()}
      {/* @custom-end content */}
    </div>
  );
}
