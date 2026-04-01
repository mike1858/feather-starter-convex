import { z } from "zod";

export const IMPORT_STATUS_VALUES = [
  "draft", "analyzing", "confirming", "generating",
  "importing", "complete", "failed",
] as const;
export const importStatus = z.enum(IMPORT_STATUS_VALUES);
export type ImportStatus = z.infer<typeof importStatus>;

export const IMPORT_ERROR_SEVERITY_VALUES = ["green", "yellow", "red"] as const;
export const importErrorSeverity = z.enum(IMPORT_ERROR_SEVERITY_VALUES);
export type ImportErrorSeverity = z.infer<typeof importErrorSeverity>;
