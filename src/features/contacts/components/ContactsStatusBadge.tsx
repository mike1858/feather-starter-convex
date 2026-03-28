// @generated-start imports
// @generated-end imports
// @custom-start imports
// @custom-end imports

interface ContactsStatusBadgeProps {
  status: "lead" | "active" | "inactive";
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  lead: { bg: "bg-blue-100", text: "text-blue-700" },
  active: { bg: "bg-green-100", text: "text-green-700" },
  inactive: { bg: "bg-gray-100", text: "text-gray-700" },
};

export function ContactsStatusBadge({ status }: ContactsStatusBadgeProps) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.lead;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

