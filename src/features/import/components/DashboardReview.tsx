import { useState } from "react";
import type { InferredEntity, DetectedRelationship } from "../types";
import type { InferredField } from "~/templates/pipeline/excel/type-inference";
import { FieldTypeDropdown } from "./FieldTypeDropdown";

interface DashboardReviewProps {
  entities: InferredEntity[];
  relationships: DetectedRelationship[];
  onUpdateField: (
    entityIndex: number,
    fieldName: string,
    updates: Partial<InferredField>,
  ) => void;
  onConfirm: () => void;
}

export function DashboardReview({
  entities,
  relationships,
  onUpdateField,
  onConfirm,
}: DashboardReviewProps) {
  const [activeTab, setActiveTab] = useState(0);
  const activeEntity = entities[activeTab];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Review & Confirm</h2>
          <p className="text-sm text-muted-foreground">
            Final review before generating your application schema.{" "}
            {entities.length} entities, {relationships.length} relationships.
          </p>
        </div>
        <button
          onClick={onConfirm}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 font-medium"
        >
          Confirm & Generate
        </button>
      </div>

      {/* Entity tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {entities.map((entity, index) => (
          <button
            key={entity.name}
            onClick={() => setActiveTab(index)}
            className={`px-3 py-2 text-sm whitespace-nowrap rounded-t ${
              index === activeTab
                ? "bg-background border border-b-0 font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {entity.label} ({Object.keys(entity.fields).length})
          </button>
        ))}
      </div>

      {/* Active entity fields */}
      {activeEntity && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
              {activeEntity.entityType}
            </span>
            <span className="text-xs text-muted-foreground">
              Source: {activeEntity.sourceSheet}
            </span>
          </div>

          <div className="border rounded">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 border-b text-xs font-medium text-muted-foreground">
              <span>Field</span>
              <span>Type</span>
              <span>Required</span>
              <span>Confidence</span>
            </div>
            {Object.entries(activeEntity.fields).map(([fieldName, field]) => (
              <div
                key={fieldName}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 border-b last:border-0 items-center"
              >
                <span className="text-sm font-medium">{fieldName}</span>
                <FieldTypeDropdown
                  value={field.type}
                  onChange={(type) =>
                    onUpdateField(activeTab, fieldName, {
                      type: type as InferredField["type"],
                    })
                  }
                />
                <label className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) =>
                      onUpdateField(activeTab, fieldName, {
                        required: e.target.checked,
                      })
                    }
                  />
                </label>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded text-center ${
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
        </div>
      )}

      {/* Relationships summary */}
      {relationships.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Relationships</h3>
          <div className="space-y-1">
            {relationships.map((rel, idx) => (
              <div
                key={idx}
                className="text-xs text-muted-foreground flex items-center gap-1"
              >
                <span className="font-medium text-foreground">
                  {rel.sourceEntity}
                </span>
                .{rel.sourceField} &rarr;{" "}
                <span className="font-medium text-foreground">
                  {rel.targetEntity}
                </span>
                <span className="px-1 py-0.5 rounded bg-muted ml-1">
                  {rel.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
