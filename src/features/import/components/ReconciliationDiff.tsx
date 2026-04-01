import { useState } from "react";
import type { SchemaChange } from "~/templates/pipeline/excel/reconciliation";

interface ReconciliationDiffProps {
  changes: SchemaChange[];
  onUpdateAction: (
    changeIndex: number,
    action: SchemaChange["action"],
  ) => void;
}

type ViewMode = "flat" | "diff";

/**
 * ReconciliationDiff (D-10): Shows schema changes between old and new import.
 * Two view modes: flat list (default) and git-style side-by-side diff.
 */
export function ReconciliationDiff({
  changes,
  onUpdateAction,
}: ReconciliationDiffProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("flat");

  const renames = changes.filter((c) => c.type === "rename");
  const additions = changes.filter((c) => c.type === "add");
  const removals = changes.filter((c) => c.type === "remove");
  const typeChanges = changes.filter((c) => c.type === "type_change");

  if (changes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4 text-center">
        No schema changes detected. Schema is identical.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View mode toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {changes.length} change{changes.length !== 1 ? "s" : ""} detected
        </span>
        <div className="flex gap-1 rounded-md border p-0.5">
          <button
            onClick={() => setViewMode("flat")}
            className={`px-2 py-1 text-xs rounded ${
              viewMode === "flat"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode("diff")}
            className={`px-2 py-1 text-xs rounded ${
              viewMode === "diff"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Diff
          </button>
        </div>
      </div>

      {viewMode === "flat" ? (
        <FlatListView
          renames={renames}
          additions={additions}
          removals={removals}
          typeChanges={typeChanges}
          changes={changes}
          onUpdateAction={onUpdateAction}
        />
      ) : (
        <DiffView
          renames={renames}
          additions={additions}
          removals={removals}
          typeChanges={typeChanges}
        />
      )}
    </div>
  );
}

// ── Flat List View ───────────────────────────────────────────────────────────

interface FlatListViewProps {
  renames: SchemaChange[];
  additions: SchemaChange[];
  removals: SchemaChange[];
  typeChanges: SchemaChange[];
  changes: SchemaChange[];
  onUpdateAction: (
    changeIndex: number,
    action: SchemaChange["action"],
  ) => void;
}

function FlatListView({
  renames,
  additions,
  removals,
  typeChanges,
  changes,
  onUpdateAction,
}: FlatListViewProps) {
  return (
    <div className="space-y-3">
      {renames.length > 0 && (
        <ChangeSection title="Renamed Columns" badge="rename">
          {renames.map((change) => {
            const idx = changes.indexOf(change);
            return (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground line-through">
                  {change.oldColumnName}
                </span>
                <span className="text-xs">&rarr;</span>
                <span className="font-medium">{change.newColumnName}</span>
                {change.matchScore && (
                  <span className="text-xs text-muted-foreground">
                    ({Math.round(change.matchScore.score * 100)}%)
                  </span>
                )}
                <select
                  value={change.action ?? "accept"}
                  onChange={(e) =>
                    onUpdateAction(
                      idx,
                      e.target.value as SchemaChange["action"],
                    )
                  }
                  className="ml-auto text-xs border rounded px-1 py-0.5"
                >
                  <option value="accept">Accept</option>
                  <option value="reject">Reject</option>
                </select>
              </div>
            );
          })}
        </ChangeSection>
      )}

      {additions.length > 0 && (
        <ChangeSection title="Added Columns" badge="add">
          {additions.map((change) => {
            const idx = changes.indexOf(change);
            return (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <span className="font-medium text-green-700">
                  + {change.addedColumn?.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({change.addedColumn?.detectedType})
                </span>
              </div>
            );
          })}
        </ChangeSection>
      )}

      {removals.length > 0 && (
        <ChangeSection title="Removed Columns" badge="remove">
          {removals.map((change) => {
            const idx = changes.indexOf(change);
            return (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <span className="font-medium text-red-700">
                  - {change.removedColumn}
                </span>
                {change.removedColumnDataCount != null &&
                  change.removedColumnDataCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({change.removedColumnDataCount} rows with data)
                    </span>
                  )}
                <select
                  value={change.action ?? "archive"}
                  onChange={(e) =>
                    onUpdateAction(
                      idx,
                      e.target.value as SchemaChange["action"],
                    )
                  }
                  className="ml-auto text-xs border rounded px-1 py-0.5"
                >
                  <option value="archive">Archive</option>
                  <option value="delete">Delete</option>
                  <option value="keep_hidden">Keep Hidden</option>
                </select>
              </div>
            );
          })}
        </ChangeSection>
      )}

      {typeChanges.length > 0 && (
        <ChangeSection title="Type Changes" badge="type_change">
          {typeChanges.map((change) => {
            const idx = changes.indexOf(change);
            return (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <span className="font-medium">{change.column}</span>
                <span className="text-muted-foreground">{change.oldType}</span>
                <span className="text-xs">&rarr;</span>
                <span className="font-medium">{change.newType}</span>
              </div>
            );
          })}
        </ChangeSection>
      )}
    </div>
  );
}

// ── Diff View ────────────────────────────────────────────────────────────────

interface DiffViewProps {
  renames: SchemaChange[];
  additions: SchemaChange[];
  removals: SchemaChange[];
  typeChanges: SchemaChange[];
}

function DiffView({
  renames,
  additions,
  removals,
  typeChanges,
}: DiffViewProps) {
  // Gather old columns (from renames + removals) and new columns (from renames + additions)
  const oldColumns: string[] = [];
  const newColumns: string[] = [];
  const changeMap = new Map<string, "rename" | "add" | "remove" | "unchanged">();

  for (const r of renames) {
    if (r.oldColumnName) oldColumns.push(r.oldColumnName);
    if (r.newColumnName) {
      newColumns.push(r.newColumnName);
      changeMap.set(r.newColumnName, "rename");
      if (r.oldColumnName) changeMap.set(r.oldColumnName, "rename");
    }
  }
  for (const a of additions) {
    if (a.addedColumn) {
      newColumns.push(a.addedColumn.name);
      changeMap.set(a.addedColumn.name, "add");
    }
  }
  for (const r of removals) {
    if (r.removedColumn) {
      oldColumns.push(r.removedColumn);
      changeMap.set(r.removedColumn, "remove");
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div className="border rounded p-2 space-y-1">
        <span className="text-xs font-medium text-muted-foreground">
          Previous Schema
        </span>
        {oldColumns.map((col) => (
          <div
            key={col}
            className={`px-2 py-1 rounded ${
              changeMap.get(col) === "rename"
                ? "bg-yellow-50 text-yellow-800"
                : changeMap.get(col) === "remove"
                  ? "bg-red-50 text-red-800 line-through"
                  : ""
            }`}
          >
            {col}
          </div>
        ))}
      </div>
      <div className="border rounded p-2 space-y-1">
        <span className="text-xs font-medium text-muted-foreground">
          New Schema
        </span>
        {newColumns.map((col) => (
          <div
            key={col}
            className={`px-2 py-1 rounded ${
              changeMap.get(col) === "rename"
                ? "bg-yellow-50 text-yellow-800"
                : changeMap.get(col) === "add"
                  ? "bg-green-50 text-green-800"
                  : ""
            }`}
          >
            {col}
          </div>
        ))}
        {typeChanges.map((tc) => (
          <div key={tc.column} className="px-2 py-1 rounded bg-blue-50 text-blue-800">
            {tc.column}: {tc.oldType} &rarr; {tc.newType}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shared components ────────────────────────────────────────────────────────

function ChangeSection({
  title,
  badge,
  children,
}: {
  title: string;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded">
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/50">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
          {badge}
        </span>
      </div>
      <div className="p-3 space-y-2">{children}</div>
    </div>
  );
}
