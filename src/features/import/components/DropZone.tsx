import { useCallback, useState, useRef } from "react";

interface DropZoneProps {
  onFileSelected: (file: File) => void;
  isAnalyzing: boolean;
}

const ACCEPTED_EXTENSIONS = [".xlsx", ".xls"];

export function DropZone({ onFileSelected, isAnalyzing }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): boolean => {
    const extension = file.name
      .toLowerCase()
      .slice(file.name.lastIndexOf("."));
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setError("Please upload an .xlsx or .xls file");
      return false;
    }
    setError(null);
    return true;
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && validateFile(file)) {
        onFileSelected(file);
      }
    },
    [onFileSelected, validateFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && validateFile(file)) {
        onFileSelected(file);
      }
    },
    [onFileSelected, validateFile],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
        transition-colors duration-200
        ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
        ${isAnalyzing ? "pointer-events-none opacity-50" : ""}
      `}
      role="button"
      tabIndex={0}
      aria-label="Upload Excel file"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileInput}
        className="hidden"
        aria-hidden="true"
        data-testid="file-input"
      />
      {isAnalyzing ? (
        <div>
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            Analyzing your spreadsheet...
          </p>
        </div>
      ) : (
        <>
          <p className="text-lg font-medium">Drop your Excel file here</p>
          <p className="text-sm text-muted-foreground mt-1">
            or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Supports .xlsx and .xls files
          </p>
        </>
      )}
      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
    </div>
  );
}
