export interface FieldConfig {
  type: "string" | "text" | "boolean" | "number" | "enum";
  required: boolean;
  max?: number;
  default?: unknown;
  values?: string[];
  colors?: Record<string, number>;
  transitions?: Record<string, string[]>;
  showOn?: string[] | "all";
  hideOn?: string[];
  filterable?: boolean;
  sortable?: boolean;
  width?: "auto" | "xs" | "sm" | "md" | "lg" | "xl";
}

export interface BehaviorConfig {
  softDelete: boolean;
  auditTrail: boolean;
  immutable: boolean;
  assignable: boolean;
  orderable: boolean;
}

export interface AccessConfig {
  scope: "owner" | "team" | "public" | "custom";
  permissions: {
    create: string;
    read: string;
    update: string;
    delete: string;
  };
  sharing: boolean;
}

export interface ColumnConfig {
  field: string;
  width?: string;
  type?: string;
  sortable?: boolean;
}

export interface FilteredView {
  name: string;
  label: string;
  filter: Record<string, unknown>;
  navEntry?: boolean;
}

export interface ViewConfig {
  default: { defaultView: string; enabledViews: string[] };
  table?: {
    design: string;
    pageSize: number;
    groupBy?: string;
    columns?: ColumnConfig[];
  };
  card?: { size: string; orientation: string; imageStyle: string };
  list?: { density: string; emphasis?: string };
  detail?: { display: string };
  pagination?: Record<string, { mode: string; pageSize?: number }>;
  filteredViews?: FilteredView[];
}

export interface RelationshipConfig {
  type: "children" | "has_many" | "belongs_to" | "embedded";
  target?: string;
  required?: boolean;
  onDelete?: "cascade" | "nullify" | "restrict";
  column?: string;
  table?: string;
  fields?: Record<string, FieldConfig>;
}

export interface IndexConfig {
  name: string;
  fields: string[];
}

export interface FeatureConfig {
  name: string;
  label: string;
  labelPlural: string;
  fields: Record<string, FieldConfig>;
  timestamps: "both" | "createdAt" | "updatedAt" | false;
  behaviors: BehaviorConfig;
  access: AccessConfig;
  views: ViewConfig;
  operations: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
  relationships?: Record<string, RelationshipConfig>;
  indexes?: IndexConfig[];
  search?: boolean;
  searchFields?: string[];
  i18n?: { languages: string[] };
}
