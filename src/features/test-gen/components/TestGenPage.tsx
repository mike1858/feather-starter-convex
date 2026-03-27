// @generated-start imports
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "~/convex/_generated/api";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { TestGenTitleBar } from "./TestGenTitleBar";
import { TestGenForm } from "./TestGenForm";
import { TestGenViewSwitcher } from "./TestGenViewSwitcher";
import { TestGenListView } from "./TestGenListView";
import { TestGenCardView } from "./TestGenCardView";
import { TestGenTableView } from "./TestGenTableView";
import { TestGenEmptyState } from "./TestGenEmptyState";
// @generated-end imports
// @custom-start imports
// @custom-end imports

export function TestGenPage() {
  const { t } = useTranslation("test-gen");
  const { data: items = [] } = useSuspenseQuery(
    convexQuery(api["test-gen"].queries.list, {}),
  );

  // @generated-start state
  const [activeView, setActiveView] = useState<string>(
    () => localStorage.getItem("test-gen-view-preference") || "list"
  );
  // @generated-end state
  // @custom-start state
  // @custom-end state

  const filteredItems = items;

  // @generated-start render
  const renderActiveView = () => {
    if (filteredItems.length === 0) {
      return (
        <TestGenEmptyState
          variant={"noData"}
        />
      );
    }

    switch (activeView) {
      case "list":
        return <TestGenListView items={filteredItems} />;
      case "card":
        return <TestGenCardView items={filteredItems} />;
      case "table":
        return <TestGenTableView items={filteredItems} />;
      default:
        return <TestGenListView items={filteredItems} />;
    }
  };
  // @generated-end render

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl">
      <TestGenTitleBar
        activeView={activeView}
        onViewChange={setActiveView}
        count={filteredItems.length}
      />

      <TestGenForm mode="inline" />


      {/* @custom-start content */}
      {renderActiveView()}
      {/* @custom-end content */}
    </div>
  );
}
