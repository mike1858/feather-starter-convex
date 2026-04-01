import { useQuery } from "convex/react";
import { api } from "@cvx/_generated/api";
import { Link } from "@tanstack/react-router";

function statusBadgeClass(status: string): string {
  switch (status) {
    case "complete":
      return "bg-green-100 text-green-800";
    case "failed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-yellow-100 text-yellow-800";
  }
}

function formatImportStats(importStats: string): string {
  const stats = JSON.parse(importStats) as {
    totalImported?: number;
    totalSkipped?: number;
  };
  return `${stats.totalImported ?? 0} rows imported, ${stats.totalSkipped ?? 0} skipped`;
}

export function ImportHistory() {
  const imports = useQuery(api.imports.queries.list);

  if (!imports) return <div>Loading...</div>;

  if (imports.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No imports yet.</p>
        <Link
          to="/dashboard/import"
          className="mt-4 inline-block px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Import your first Excel file
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Import History</h1>
        <Link
          to="/dashboard/import"
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          New Import
        </Link>
      </div>

      <div className="space-y-2">
        {imports.map((imp) => (
          <Link
            key={imp._id}
            to={`/dashboard/imports/${imp._id}`}
            className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{imp.fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(imp._creationTime).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${statusBadgeClass(imp.status)}`}
              >
                {imp.status}
              </span>
            </div>
            {imp.importStats && (
              <div className="mt-2 text-xs text-muted-foreground">
                {formatImportStats(imp.importStats)}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
