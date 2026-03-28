// @generated-start imports
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "~/convex/_generated/api";
import { useState } from "react";
import { ContactsTitleBar } from "./ContactsTitleBar";
import { ContactsForm } from "./ContactsForm";
import { ContactsListView } from "./ContactsListView";
import { ContactsTableView } from "./ContactsTableView";
import { ContactsFilterBar } from "./ContactsFilterBar";
import { ContactsEmptyState } from "./ContactsEmptyState";
// @generated-end imports
// @custom-start imports
// @custom-end imports

export function ContactsPage() {
  const { data: items = [] } = useSuspenseQuery(
    convexQuery(api.contacts.queries.list, {}),
  );

  // @generated-start state
  const [activeView, setActiveView] = useState<string>(
    () => localStorage.getItem("contacts-view-preference") || "list"
  );
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
        return true;
      });

  // @generated-start render
  const renderActiveView = () => {
    if (filteredItems.length === 0) {
      return (
        <ContactsEmptyState
          variant={activeFilter !== "all" ? "noMatches" : "noData"}
        />
      );
    }

    switch (activeView) {
      case "list":
        return <ContactsListView items={filteredItems} />;
      case "table":
        return <ContactsTableView items={filteredItems} isLoading={false} />;
      default:
        return <ContactsListView items={filteredItems} />;
    }
  };
  // @generated-end render

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl">
      <ContactsTitleBar
        activeView={activeView}
        onViewChange={setActiveView}
        count={filteredItems.length}
      />

      <ContactsForm mode="inline" />

      <ContactsFilterBar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* @custom-start content */}
      {renderActiveView()}
      {/* @custom-end content */}
    </div>
  );
}
