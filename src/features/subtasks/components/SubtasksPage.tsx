// @generated-start imports
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "~/convex/_generated/api";
import { useState } from "react";
import { SubtasksTitleBar } from "./SubtasksTitleBar";
import { SubtasksForm } from "./SubtasksForm";
import { SubtasksListView } from "./SubtasksListView";
import { SubtasksEmptyState } from "./SubtasksEmptyState";
// @generated-end imports
// @custom-start imports
// @custom-end imports

export function SubtasksPage() {
  const { data: items = [] } = useSuspenseQuery(
    convexQuery(api.subtasks.queries.list, {}),
  );

  // @generated-start state
  const [activeView, setActiveView] = useState<string>(
    () => localStorage.getItem("subtasks-view-preference") || "list"
  );
  // @generated-end state
  // @custom-start state
  // @custom-end state

  const filteredItems = items;

  // @generated-start render
  const renderActiveView = () => {
    if (filteredItems.length === 0) {
      return (
        <SubtasksEmptyState
          variant={"noData"}
        />
      );
    }

    return <SubtasksListView items={filteredItems} />;
  };
  // @generated-end render

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl">
      <SubtasksTitleBar
        count={filteredItems.length}
      />

      <SubtasksForm mode="inline" />


      {/* @custom-start content */}
      {renderActiveView()}
      {/* @custom-end content */}
    </div>
  );
}
