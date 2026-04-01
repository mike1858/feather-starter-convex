import { useState } from "react";
import type { InferredEntity } from "../types";
import type { InferredField } from "~/templates/pipeline/excel/type-inference";
import { FieldTypeDropdown } from "./FieldTypeDropdown";
import { SampleDataPreview } from "./SampleDataPreview";
import { ColumnGroupAccordion } from "./ColumnGroupAccordion";

interface Step2FieldsProps {
  entities: InferredEntity[];
  onUpdateField: (
    entityIndex: number,
    fieldName: string,
    updates: Partial<InferredField>,
  ) => void;
  sampleData?: Record<string, { columns: string[]; rows: unknown[][] }>;
}

const LARGE_ENTITY_THRESHOLD = 30;

export function Step2Fields({
  entities,
  onUpdateField,
  sampleData,
}: Step2FieldsProps) {
  const [activeEntityIndex, setActiveEntityIndex] = useState(0);
  const [compactPreview, setCompactPreview] = useState(true);

  const activeEntity = entities[activeEntityIndex];
  if (!activeEntity) return null;

  const fieldEntries = Object.entries(activeEntity.fields);
  const isLargeEntity = fieldEntries.length >= LARGE_ENTITY_THRESHOLD;
  const entitySample = sampleData?.[activeEntity.name];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Step 2: Review Fields</h2>
      <p className="text-sm text-muted-foreground">
        Adjust field types, names, and requirements for each entity.
      </p>

      {/* Entity tabs */}
      <div className="flex gap-1 border-b">
        {entities.map((entity, index) => (
          <button
            key={entity.name}
            onClick={() => setActiveEntityIndex(index)}
            className={`px-3 py-2 text-sm rounded-t ${
              index === activeEntityIndex
                ? "bg-background border border-b-0 font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {entity.label} ({Object.keys(entity.fields).length})
          </button>
        ))}
      </div>

      {/* Sample data toggle */}
      {entitySample && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Sample Data</span>
          <button
            onClick={() => setCompactPreview(!compactPreview)}
            className="text-xs text-primary hover:underline"
          >
            {compactPreview ? "Show full rows" : "Show compact"}
          </button>
        </div>
      )}

      {/* Sample data preview */}
      {entitySample && (
        <SampleDataPreview
          columns={entitySample.columns}
          sampleRows={entitySample.rows}
          compact={compactPreview}
        />
      )}

      {/* Fields - grouped for large entities, flat for small */}
      {isLargeEntity ? (
        <ColumnGroupAccordion
          fields={activeEntity.fields}
          onUpdateField={(fieldName, updates) =>
            onUpdateField(activeEntityIndex, fieldName, updates)
          }
          sampleRows={entitySample?.rows ?? []}
          columns={entitySample?.columns ?? []}
        />
      ) : (
        <div className="space-y-2">
          {fieldEntries.map(([fieldName, field]) => (
            <div
              key={fieldName}
              className="flex items-center gap-3 py-2 border-b last:border-0"
            >
              <span className="min-w-[160px] font-medium text-sm">
                {fieldName}
              </span>
              <FieldTypeDropdown
                value={field.type}
                onChange={(type) =>
                  onUpdateField(activeEntityIndex, fieldName, {
                    type: type as InferredField["type"],
                  })
                }
              />
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) =>
                    onUpdateField(activeEntityIndex, fieldName, {
                      required: e.target.checked,
                    })
                  }
                />
                Required
              </label>
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  field.confidence >= 85
                    ? "bg-green-100 text-green-800"
                    : field.confidence >= 70
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {field.confidence}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
