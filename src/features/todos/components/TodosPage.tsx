// @generated-start imports
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "~/convex/_generated/api";
import { useState } from "react";
import { TodosTitleBar } from "./TodosTitleBar";
import { TodosForm } from "./TodosForm";
import { TodosListView } from "./TodosListView";
import { TodosFilterBar } from "./TodosFilterBar";
import { TodosEmptyState } from "./TodosEmptyState";
// @generated-end imports
// @custom-start imports
// @custom-end imports

export function TodosPage() {
  const { data: items = [] } = useQuery(
    convexQuery(api.todos.queries.list, {}),
  );

  // @generated-start state
  const [activeFilter, setActiveFilter] = useState<string>("all");
  // @generated-end state
  // @custom-start state
  // @custom-end state
  /* v8 ignore start -- filter logic unreachable: TodosFilterBar only has "all" filter key */
  const filteredItems = activeFilter === "all"
    ? items
    : items.filter((item: any) => {
        if (activeFilter.includes(":")) {
          const [field, value] = activeFilter.split(":");
          return item[field] === value;
        }
        return true;
      });
  /* v8 ignore stop */
  // @generated-start render
  /* v8 ignore start -- noMatches variant unreachable: only "all" filter exists */
  const renderActiveView = () => {
    if (filteredItems.length === 0) {
      return (
        <TodosEmptyState
          variant={activeFilter !== "all" ? "noMatches" : "noData"}
        />
      );
    }

    return <TodosListView items={filteredItems} />;
  };
  /* v8 ignore stop */
  // @generated-end render

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl">
      <TodosTitleBar
        count={filteredItems.length}
      />

      <TodosForm mode="inline" />

      <TodosFilterBar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* @custom-start content */}
      {renderActiveView()}
      {/* @custom-end content */}
    </div>
  );
}
