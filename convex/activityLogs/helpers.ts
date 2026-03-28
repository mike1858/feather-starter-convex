import { MutationCtx } from "@cvx/_generated/server";
import { Id } from "@cvx/_generated/dataModel";

type EntityType = "task" | "project" | "subtask";
type ActionType =
  | "created"
  | "status_changed"
  | "assigned"
  | "unassigned"
  | "edited"
  | "deleted"
  | "completed"
  | "promoted";

export async function logActivity(
  ctx: MutationCtx,
  params: {
    entityType: EntityType;
    entityId: string;
    action: ActionType;
    actor: Id<"users">;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await ctx.db.insert("activityLogs", {
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    actor: params.actor,
    metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
  });
}
