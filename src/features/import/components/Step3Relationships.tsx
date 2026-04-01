import { useState } from "react";
import type { InferredEntity, DetectedRelationship } from "../types";

interface Step3RelationshipsProps {
  entities: InferredEntity[];
  relationships: DetectedRelationship[];
  onRemoveRelationship?: (index: number) => void;
  onAddRelationship?: (relationship: DetectedRelationship) => void;
}

export function Step3Relationships({
  entities,
  relationships,
  onRemoveRelationship,
  onAddRelationship,
}: Step3RelationshipsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRel, setNewRel] = useState<Partial<DetectedRelationship>>({
    type: "belongs_to",
    confidence: 50,
  });

  const entityNames = entities.map((e) => e.name);

  const handleAdd = () => {
    if (
      newRel.sourceEntity &&
      newRel.targetEntity &&
      newRel.sourceField &&
      onAddRelationship
    ) {
      onAddRelationship({
        sourceEntity: newRel.sourceEntity,
        targetEntity: newRel.targetEntity,
        sourceField: newRel.sourceField,
        confidence: newRel.confidence ?? 50,
        type: newRel.type ?? "belongs_to",
      });
      setNewRel({ type: "belongs_to", confidence: 50 });
      setShowAddForm(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Step 3: Review Relationships</h2>
      <p className="text-sm text-muted-foreground">
        Detected relationships between entities. Remove false positives or add
        missing ones.
      </p>

      {relationships.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No relationships detected.
        </p>
      ) : (
        <div className="space-y-2">
          {relationships.map((rel, index) => (
            <div
              key={`${rel.sourceEntity}-${rel.sourceField}-${index}`}
              className="flex items-center justify-between border rounded-lg p-3"
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{rel.sourceEntity}</span>
                <span className="text-muted-foreground">
                  .{rel.sourceField}
                </span>
                <span className="text-muted-foreground">&rarr;</span>
                <span className="font-medium">{rel.targetEntity}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                  {rel.type}
                </span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    rel.confidence >= 85
                      ? "bg-green-100 text-green-800"
                      : rel.confidence >= 70
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {rel.confidence}%
                </span>
              </div>
              {onRemoveRelationship && (
                <button
                  onClick={() => onRemoveRelationship(index)}
                  className="text-xs text-destructive hover:underline"
                  aria-label={`Remove relationship from ${rel.sourceEntity} to ${rel.targetEntity}`}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add relationship form */}
      {onAddRelationship && (
        <div>
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="text-sm text-primary hover:underline"
            >
              + Add relationship
            </button>
          ) : (
            <div className="border rounded-lg p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">
                    Source Entity
                  </label>
                  <select
                    value={newRel.sourceEntity ?? ""}
                    onChange={(e) =>
                      setNewRel((p) => ({ ...p, sourceEntity: e.target.value }))
                    }
                    className="w-full px-2 py-1 text-sm border rounded"
                  >
                    <option value="">Select...</option>
                    {entityNames.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    Target Entity
                  </label>
                  <select
                    value={newRel.targetEntity ?? ""}
                    onChange={(e) =>
                      setNewRel((p) => ({ ...p, targetEntity: e.target.value }))
                    }
                    className="w-full px-2 py-1 text-sm border rounded"
                  >
                    <option value="">Select...</option>
                    {entityNames.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">
                    Source Field
                  </label>
                  <input
                    type="text"
                    value={newRel.sourceField ?? ""}
                    onChange={(e) =>
                      setNewRel((p) => ({ ...p, sourceField: e.target.value }))
                    }
                    className="w-full px-2 py-1 text-sm border rounded"
                    placeholder="e.g. customerId"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Type</label>
                  <select
                    value={newRel.type ?? "belongs_to"}
                    onChange={(e) =>
                      setNewRel((p) => ({
                        ...p,
                        type: e.target.value as DetectedRelationship["type"],
                      }))
                    }
                    className="w-full px-2 py-1 text-sm border rounded"
                  >
                    <option value="belongs_to">belongs_to</option>
                    <option value="has_many">has_many</option>
                    <option value="many_to_many">many_to_many</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1 text-sm border rounded hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
