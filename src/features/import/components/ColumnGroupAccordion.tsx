import { useState } from "react";
import type { InferredField } from "~/templates/pipeline/excel/type-inference";
import { FieldTypeDropdown } from "./FieldTypeDropdown";

interface ColumnGroupAccordionProps {
  fields: Record<string, InferredField>;
  onUpdateField: (
    fieldName: string,
    updates: Partial<InferredField>,
  ) => void;
  sampleRows: unknown[][];
  columns: string[];
}

interface FieldGroup {
  label: string;
  fields: [string, InferredField][];
  averageConfidence: number;
}

/**
 * Group fields by semantic category for large entities (30+ fields).
 * Groups with <85% average confidence expand by default.
 */
function groupFieldsBySemantic(
  fields: Record<string, InferredField>,
): FieldGroup[] {
  const categories: Record<string, [string, InferredField][]> = {
    "Personal Info": [],
    Financial: [],
    "Dates & Times": [],
    References: [],
    Status: [],
    Other: [],
  };

  for (const [name, field] of Object.entries(fields)) {
    const lowerName = name.toLowerCase();
    if (
      field.type === "email" ||
      lowerName.includes("name") ||
      lowerName.includes("phone") ||
      lowerName.includes("address")
    ) {
      categories["Personal Info"].push([name, field]);
    } else if (
      field.type === "currency" ||
      field.type === "percentage" ||
      lowerName.includes("amount") ||
      lowerName.includes("price") ||
      lowerName.includes("cost") ||
      lowerName.includes("total")
    ) {
      categories["Financial"].push([name, field]);
    } else if (field.type === "date") {
      categories["Dates & Times"].push([name, field]);
    } else if (field.type === "reference" || lowerName.endsWith("id")) {
      categories["References"].push([name, field]);
    } else if (
      field.type === "enum" ||
      lowerName.includes("status") ||
      lowerName.includes("type")
    ) {
      categories["Status"].push([name, field]);
    } else {
      categories["Other"].push([name, field]);
    }
  }

  return Object.entries(categories)
    .filter(([, entries]) => entries.length > 0)
    .map(([label, entries]) => {
      const avgConf =
        entries.reduce((sum, [, f]) => sum + f.confidence, 0) /
        entries.length;
      return {
        label,
        fields: entries,
        averageConfidence: Math.round(avgConf),
      };
    });
}

export function ColumnGroupAccordion({
  fields,
  onUpdateField,
  sampleRows,
  columns,
}: ColumnGroupAccordionProps) {
  const groups = groupFieldsBySemantic(fields);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    // Expand groups with low confidence by default
    const lowConfidence = new Set<string>();
    for (const group of groups) {
      if (group.averageConfidence < 85) {
        lowConfidence.add(group.label);
      }
    }
    return lowConfidence;
  });

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const isExpanded = expandedGroups.has(group.label);
        return (
          <div key={group.label} className="border rounded">
            <button
              onClick={() => toggleGroup(group.label)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/50"
              aria-expanded={isExpanded}
            >
              <span>
                {group.label} ({group.fields.length})
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    group.averageConfidence >= 85
                      ? "bg-green-100 text-green-800"
                      : group.averageConfidence >= 70
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {group.averageConfidence}%
                </span>
                <span className="text-muted-foreground">
                  {isExpanded ? "\u25B2" : "\u25BC"}
                </span>
              </div>
            </button>
            {isExpanded && (
              <div className="px-3 pb-3 space-y-2">
                {group.fields.map(([fieldName, field]) => {
                  const colIdx = columns.indexOf(fieldName);
                  const sampleValues =
                    colIdx >= 0
                      ? sampleRows
                          .slice(0, 3)
                          .map((row) => String(row[colIdx] ?? ""))
                          .join(", ")
                      : "";
                  return (
                    <div
                      key={fieldName}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="min-w-[140px] font-medium">
                        {fieldName}
                      </span>
                      <FieldTypeDropdown
                        value={field.type}
                        onChange={(type) =>
                          onUpdateField(fieldName, {
                            type: type as InferredField["type"],
                          })
                        }
                      />
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) =>
                            onUpdateField(fieldName, {
                              required: e.target.checked,
                            })
                          }
                        />
                        Required
                      </label>
                      {sampleValues && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {sampleValues}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
