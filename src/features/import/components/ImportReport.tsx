import { useState } from "react";
import type { ErrorSeverity, ImportError } from "~/templates/pipeline/excel/data-importer";

interface ImportDoc {
  fileName: string;
  status: string;
  completedAt?: number;
  importStats?: string;
  analysisResult?: string;
}

interface ImportReportProps {
  importDoc: ImportDoc;
  errors: ImportError[];
}

interface ImportStats {
  entities: Array<{
    entityName: string;
    totalRows: number;
    importedRows: number;
    skippedRows: number;
  }>;
  method?: "llm" | "heuristic";
}

/**
 * ImportReport (D-12, D-15): Import history permalink showing all
 * reconciliation decisions and error tiers.
 */
export function ImportReport({ importDoc, errors }: ImportReportProps) {
  const stats: ImportStats | null = importDoc.importStats
    ? (JSON.parse(importDoc.importStats) as ImportStats)
    : null;

  const greenErrors = errors.filter((e) => e.severity === "green");
  const yellowErrors = errors.filter((e) => e.severity === "yellow");
  const redErrors = errors.filter((e) => e.severity === "red");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Import Report</h2>
        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
          <span>{importDoc.fileName}</span>
          <StatusBadge status={importDoc.status} />
          {importDoc.completedAt && (
            <span>{new Date(importDoc.completedAt).toLocaleString()}</span>
          )}
          {stats?.method && (
            <span className="px-1.5 py-0.5 rounded bg-muted text-xs">
              {stats.method}
            </span>
          )}
        </div>
      </div>

      {/* Per-entity summary */}
      {stats && stats.entities.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Entity Summary</h3>
          <div className="border rounded">
            <div className="grid grid-cols-4 gap-2 px-3 py-2 border-b text-xs font-medium text-muted-foreground">
              <span>Entity</span>
              <span>Imported</span>
              <span>Skipped</span>
              <span>Total</span>
            </div>
            {stats.entities.map((entity) => (
              <div
                key={entity.entityName}
                className="grid grid-cols-4 gap-2 px-3 py-2 border-b last:border-0 text-sm"
              >
                <span className="font-medium">{entity.entityName}</span>
                <span className="text-green-700">{entity.importedRows}</span>
                <span className="text-red-700">{entity.skippedRows}</span>
                <span>{entity.totalRows}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Three-tier error display (D-14) */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">
          Errors ({errors.length} total)
        </h3>

        <ErrorSection
          title="Auto-fixed"
          severity="green"
          errors={greenErrors}
          description="These values were automatically corrected during import."
          colorClass="bg-green-50 border-green-200"
          badgeClass="bg-green-100 text-green-800"
        />

        <ErrorSection
          title="Needs Review"
          severity="yellow"
          errors={yellowErrors}
          description="These values need manual review and may require correction."
          colorClass="bg-yellow-50 border-yellow-200"
          badgeClass="bg-yellow-100 text-yellow-800"
        />

        <ErrorSection
          title="Unfixable"
          severity="red"
          errors={redErrors}
          description="These rows were skipped because values could not be corrected."
          colorClass="bg-red-50 border-red-200"
          badgeClass="bg-red-100 text-red-800"
        />
      </div>
    </div>
  );
}

// ── Error Section ────────────────────────────────────────────────────────────

interface ErrorSectionProps {
  title: string;
  severity: ErrorSeverity;
  errors: ImportError[];
  description: string;
  colorClass: string;
  badgeClass: string;
}

function ErrorSection({
  title,
  severity,
  errors,
  description,
  colorClass,
  badgeClass,
}: ErrorSectionProps) {
  const [isExpanded, setIsExpanded] = useState(severity !== "green");

  if (errors.length === 0) return null;

  // Group errors by entity
  const byEntity = new Map<string, ImportError[]>();
  for (const error of errors) {
    const list = byEntity.get(error.entityName) ?? [];
    list.push(error);
    byEntity.set(error.entityName, list);
  }

  return (
    <div className={`border rounded ${colorClass}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          <span className={`text-xs px-1.5 py-0.5 rounded ${badgeClass}`}>
            {title}
          </span>
          <span className="text-sm">{errors.length} issue{errors.length !== 1 ? "s" : ""}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {isExpanded ? "Collapse" : "Expand"}
        </span>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          <p className="text-xs text-muted-foreground">{description}</p>
          {[...byEntity.entries()].map(([entityName, entityErrors]) => (
            <div key={entityName} className="space-y-1">
              <span className="text-xs font-medium">{entityName}</span>
              <div className="space-y-1">
                {entityErrors.map((error, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 text-xs bg-white/50 rounded px-2 py-1"
                  >
                    <span className="text-muted-foreground">
                      Row {error.rowNumber}
                    </span>
                    <span className="font-medium">{error.column}</span>
                    <span className="text-muted-foreground flex-1">
                      {error.errorMessage}
                    </span>
                    {error.originalValue != null && error.fixedValue != null && (
                      <span className="text-xs">
                        <span className="line-through text-red-600">
                          {error.originalValue}
                        </span>
                        {" → "}
                        <span className="text-green-600">
                          {error.fixedValue}
                        </span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    complete: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    importing: "bg-blue-100 text-blue-800",
    draft: "bg-gray-100 text-gray-800",
  };

  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded ${colorMap[status] ?? "bg-muted"}`}
    >
      {status}
    </span>
  );
}
