// @generated-start imports
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "~/convex/_generated/api";
import { useState } from "react";
import { WorkLogsTitleBar } from "./WorkLogsTitleBar";
import { WorkLogsForm } from "./WorkLogsForm";
import { WorkLogsListView } from "./WorkLogsListView";
import { WorkLogsEmptyState } from "./WorkLogsEmptyState";
// @generated-end imports
// @custom-start imports
// @custom-end imports

export function WorkLogsPage() {
  const { data: items = [] } = useSuspenseQuery(
    convexQuery(api["work-logs"].queries.list, {}),
  );

  // @generated-start state
  const [activeView, setActiveView] = useState<string>(
    () => localStorage.getItem("work-logs-view-preference") || "list"
  );
  // @generated-end state
  // @custom-start state
  // @custom-end state

  const filteredItems = items;

  // @generated-start render
  const renderActiveView = () => {
    if (filteredItems.length === 0) {
      return (
        <WorkLogsEmptyState
          variant={"noData"}
        />
      );
    }

    return <WorkLogsListView items={filteredItems} />;
  };
  // @generated-end render

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl">
      <WorkLogsTitleBar
        count={filteredItems.length}
      />

      <WorkLogsForm mode="inline" />


      {/* @custom-start content */}
      {renderActiveView()}
      {/* @custom-end content */}
    </div>
  );
}
