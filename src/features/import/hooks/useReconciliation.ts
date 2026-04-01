import { useState, useCallback } from "react";
import {
  detectReimport,
  type ReconciliationResult,
  type StoredMapping,
} from "~/templates/pipeline/excel/reconciliation";
import type { SheetMetadata } from "~/templates/pipeline/excel/parser";

interface UseReconciliationReturn {
  results: Map<string, ReconciliationResult>;
  isChecking: boolean;
  checkForReimport: (
    sheets: SheetMetadata[],
    storedMappings: Map<string, StoredMapping[]>,
  ) => void;
  reset: () => void;
}

/**
 * Hook that triggers reconciliation by comparing new sheet metadata
 * against stored mappings. Returns reconciliation results or empty map
 * (first import).
 */
export function useReconciliation(): UseReconciliationReturn {
  const [results, setResults] = useState<Map<string, ReconciliationResult>>(
    new Map(),
  );
  const [isChecking, setIsChecking] = useState(false);

  const checkForReimport = useCallback(
    (
      sheets: SheetMetadata[],
      storedMappings: Map<string, StoredMapping[]>,
    ) => {
      setIsChecking(true);
      try {
        const reconciliationResults = detectReimport(sheets, storedMappings);
        setResults(reconciliationResults);
      } finally {
        setIsChecking(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setResults(new Map());
  }, []);

  return {
    results,
    isChecking,
    checkForReimport,
    reset,
  };
}
