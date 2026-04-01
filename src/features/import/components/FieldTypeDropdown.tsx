interface FieldTypeDropdownProps {
  value: string;
  onChange: (newType: string) => void;
}

const FIELD_TYPES = [
  "string",
  "text",
  "number",
  "boolean",
  "enum",
  "date",
  "reference",
  "email",
  "url",
  "currency",
  "percentage",
] as const;

export function FieldTypeDropdown({ value, onChange }: FieldTypeDropdownProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1 text-sm border rounded bg-background cursor-pointer hover:border-primary"
      aria-label="Field type"
    >
      {FIELD_TYPES.map((type) => (
        <option key={type} value={type}>
          {type}
        </option>
      ))}
    </select>
  );
}
