import type { InferredEntity } from "../types";

interface Step1EntitiesProps {
  entities: InferredEntity[];
  onUpdateEntity: (index: number, updates: Partial<InferredEntity>) => void;
}

function confidenceBadgeClass(confidence: number): string {
  if (confidence >= 85) return "bg-green-100 text-green-800";
  if (confidence >= 70) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

export function Step1Entities({
  entities,
  onUpdateEntity,
}: Step1EntitiesProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Step 1: Review Entities</h2>
      <p className="text-sm text-muted-foreground">
        Each Excel sheet was classified as an entity. Review and adjust.
      </p>
      <div className="space-y-3">
        {entities.map((entity, index) => (
          <div key={entity.name} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={entity.label}
                  onChange={(e) =>
                    onUpdateEntity(index, { label: e.target.value })
                  }
                  className="font-medium text-base border-b border-transparent hover:border-muted-foreground focus:border-primary focus:outline-none bg-transparent"
                  aria-label={`Entity name for ${entity.name}`}
                />
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                  {entity.entityType}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{Object.keys(entity.fields).length} fields</span>
                <span
                  className={`px-2 py-0.5 rounded text-xs ${confidenceBadgeClass(entity.confidence)}`}
                >
                  {entity.confidence}%
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Source: {entity.sourceSheet}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
