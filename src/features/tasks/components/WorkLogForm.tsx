import { useState } from "react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "~/convex/_generated/api";
import { Button } from "@/ui/button";
import { parseTimeInput } from "@/shared/utils/time-parser";
import type { Id } from "~/convex/_generated/dataModel";

export function WorkLogForm({ taskId }: { taskId: Id<"tasks"> }) {
  const [body, setBody] = useState("");
  const [timeInput, setTimeInput] = useState("");

  const { mutateAsync: createWorkLog } = useMutation({
    mutationFn: useConvexMutation(api.workLogs.mutations.create),
  });

  const handleSubmit = async () => {
    const trimmedBody = body.trim();
    if (!trimmedBody) return;

    const timeMinutes = timeInput ? parseTimeInput(timeInput) : undefined;

    await createWorkLog({
      taskId,
      body: trimmedBody,
      timeMinutes,
    });

    setBody("");
    setTimeInput("");
  };

  return (
    <div className="mb-3 flex flex-col gap-2">
      <textarea
        className="w-full rounded border border-input bg-transparent px-2 py-1.5 text-sm placeholder:text-primary/30 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        placeholder="What did you work on?"
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <input
          className="w-32 rounded border border-input bg-transparent px-2 py-1 text-sm placeholder:text-primary/30 focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="e.g. 30m, 1h30m"
          value={timeInput}
          onChange={(e) => setTimeInput(e.target.value)}
        />
        <Button size="sm" onClick={handleSubmit}>
          Log work
        </Button>
      </div>
    </div>
  );
}
