interface SampleDataPreviewProps {
  columns: string[];
  sampleRows: unknown[][];
  compact?: boolean;
}

export function SampleDataPreview({
  columns,
  sampleRows,
  compact = true,
}: SampleDataPreviewProps) {
  if (sampleRows.length === 0) return null;

  if (compact) {
    return (
      <div className="space-y-1 text-xs text-muted-foreground">
        {columns.map((col, i) => (
          <div key={col} className="flex gap-2">
            <span className="font-medium min-w-[120px]">{col}:</span>
            <span>
              {sampleRows
                .map((row) => String(row[i] ?? ""))
                .slice(0, 3)
                .join(", ")}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-xs w-full">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-2 py-1 text-left font-medium border-b">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sampleRows.map((row, rowIdx) => (
            <tr key={rowIdx} className="border-b last:border-0">
              {columns.map((_, colIdx) => (
                <td key={colIdx} className="px-2 py-1">
                  {String(row[colIdx] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
