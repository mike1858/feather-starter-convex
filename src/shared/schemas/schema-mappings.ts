import { z } from "zod";

export const mappingHistoryEntry = z.object({
  date: z.string(),
  oldName: z.string(),
  newName: z.string(),
});
export type MappingHistoryEntry = z.infer<typeof mappingHistoryEntry>;
