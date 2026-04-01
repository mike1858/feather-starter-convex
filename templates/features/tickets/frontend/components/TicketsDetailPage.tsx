import { useState, useEffect } from "react";
import {
  Pencil,
  Trash2,
  X,
  Check,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/ui/button";

interface TicketsDetailPageProps {
  item: Record<string, unknown> | null;
  isLoading: boolean;
  onSave?: (item: Record<string, unknown>) => void;
  onDelete?: (item: Record<string, unknown>) => void;
}

export function TicketsDetailPage({
  item,
  isLoading,
  onSave,
  onDelete,
}: TicketsDetailPageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});

  // Sync edit data when item changes
  useEffect(() => {
    if (item) {
      setEditData({ ...item });
    }
  }, [item]);

  const handleEditToggle = () => {
    if (isEditing) {
      // Discard changes
      if (item) setEditData({ ...item });
    }
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
    onSave?.(editData);
    setIsEditing(false);
  };

  const handleFieldChange = (field: string, value: unknown) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading || !item) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="h-6 w-48 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="h-3 w-16 rounded bg-muted animate-pulse" />
              <div className="h-5 w-full rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Field rendering (read mode)
  const renderFieldValue = (_fieldKey: string, field: { type: string }, value: unknown) => {
    if (value == null || value === "") {
      return <span className="text-sm text-primary/40 italic">Not set</span>;
    }

    switch (field.type) {
      case "boolean":
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-primary">
            {value ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <X className="h-4 w-4 text-primary/20" />
            )}
            {value ? "Yes" : "No"}
          </span>
        );
      case "enum":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            <span className="text-sm text-primary">{value as string}</span>
          </span>
        );
      case "text":
        return <p className="prose text-sm text-primary">{value as string}</p>;
      case "link":
        return (
          <a
            href={value as string}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline inline-flex items-center gap-1 text-sm"
          >
            {value as string} <ExternalLink className="h-3 w-3" />
          </a>
        );
      case "image":
        return (
          <img
            src={value as string}
            alt=""
            className="rounded-md max-h-48 object-cover"
          />
        );
      default:
        return <span className="text-sm text-primary">{String(value)}</span>;
    }
  };

  // Field rendering (edit mode)
  const renderFieldInput = (fieldKey: string, field: { type: string }, value: unknown) => {
    switch (field.type) {
      case "boolean":
        return (
          <button
            type="button"
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              value ? "bg-primary" : "bg-muted"
            }`}
            onClick={() => handleFieldChange(fieldKey, !value)}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                value ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        );
      case "text":
        return (
          <textarea
            className="w-full rounded border border-input bg-transparent px-3 py-2 text-sm"
            rows={4}
            value={(value as string) ?? ""}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
          />
        );
      case "enum":
        return (
          <select
            className="h-9 w-full rounded border border-input bg-transparent px-3 text-sm"
            value={(value as string) ?? ""}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
          >
            <option value="">Select...</option>
            {/* Enum values populated at generation time */}
          </select>
        );
      case "number":
        return (
          <input
            type="number"
            className="h-9 w-full rounded border border-input bg-transparent px-3 text-sm"
            value={(value as number) ?? ""}
            onChange={(e) => handleFieldChange(fieldKey, Number(e.target.value))}
          />
        );
      default:
        return (
          <input
            type="text"
            className="h-9 w-full rounded border border-input bg-transparent px-3 text-sm"
            value={(value as string) ?? ""}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
          />
        );
    }
  };

  // Field definitions from YAML
  const fields = [
    { key: "title", label: "title", type: "string" },
    { key: "description", label: "description", type: "text" },
    { key: "status", label: "status", type: "enum" },
    { key: "priority", label: "priority", type: "enum" },
  ];

  // Action bar component
  const actionBar = (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        {/* Breadcrumb */}
        {!isEditing && (
          <nav className="flex items-center gap-1 text-xs text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">
              Tickets
            </a>
            <ChevronRight className="h-3 w-3" />
            <span className="text-primary">
              {item.title as string}
            </span>
          </nav>
        )}

        {isEditing && (
          <span className="text-sm font-semibold text-primary">
            Editing {item.title as string}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <Button variant="ghost" size="sm" onClick={handleEditToggle}>
              Discard Changes
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() => onDelete?.(item)}
              aria-label="Delete Ticket"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete
            </Button>
          </>
        )}
      </div>
    </div>
  );

  // Detail content
  const detailContent = (
    <div className={`flex gap-8 max-w-4xl`}>
      {/* Main content */}
      <div className="flex-1 flex flex-col gap-6 p-6">
        {/* Header (page mode only) */}
        {!isEditing && (
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold tracking-tight text-primary">
                {item.title as string}
              </h1>
              <span className="inline-flex items-center gap-1.5 text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                <span>{item.status as string}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                <span>{item.priority as string}</span>
              </span>
            </div>
          </div>
        )}

        {/* Field groups */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {fields.map((f) => (
                <div
                  key={f.key}
                  className={`flex flex-col gap-1 ${isEditing ? "transition-opacity duration-150" : ""}`}
                >
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {f.label}
                  </span>
                  {isEditing
                    ? renderFieldInput(f.key, f, editData[f.key])
                    : renderFieldValue(f.key, f, item[f.key])}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timestamps footer */}
      </div>

      {/* Sidebar (page mode only) */}
      {/* @custom-start detail-sidebar */}
      {/* @custom-end detail-sidebar */}
    </div>
  );

  {/* Full page mode */}
  return (
    <div className="flex flex-col h-full">
      {actionBar}
      {detailContent}
    </div>
  );


}
