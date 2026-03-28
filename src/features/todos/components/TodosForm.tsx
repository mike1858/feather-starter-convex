// @generated-start imports
import { useForm } from "@tanstack/react-form";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "~/convex/_generated/api";
import { useTranslation } from "react-i18next";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";
import { Switch } from "@/ui/switch";
// @generated-end imports
// @custom-start imports
// @custom-end imports

interface TodosFormProps {
  mode: "inline" | "full";
  defaultValues?: Partial<Record<string, unknown>>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TodosForm({
  mode,
  defaultValues,
  onSuccess,
  onCancel,
}: TodosFormProps) {
  const { t } = useTranslation("todos");
  const { mutateAsync: createItem } = useMutation({
    mutationFn: useConvexMutation(api.todos.mutations.create),
  });

  const form = useForm({
    defaultValues: {
      title: "",
      completed: false,
      ...defaultValues,
    } as Record<string, unknown>,
    onSubmit: async ({ value }) => {
      await createItem(value as any);
      form.reset();
      onSuccess?.();
    },
  });

  // @generated-start inline
  if (mode === "inline") {
    return (
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <form.Field
          name="title"
          children={(field) => (
            <Input
              placeholder={t("form.addInline")}
              autoComplete="off"
              required
              value={field.state.value as string}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              className="flex-1 bg-transparent"
            />
          )}
        />
        <Button type="submit" size="sm">
          {t("form.submit", "Add")}
        </Button>
      </form>
    );
  }
  // @generated-end inline

  // @generated-start full
  return (
    <form
      className="flex flex-col gap-6 max-w-xl"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <form.Field
        name="title"
        children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs tracking-wide text-muted-foreground uppercase">
              {t("fields.title", "Title")}
            </label>

            <Input
              value={field.state.value as string}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              className="h-10"
              maxLength={ 200 }
            />





            {field.state.meta.errors.length > 0 && (
              <span className="text-xs text-destructive mt-1">
                {field.state.meta.errors[0]}
              </span>
            )}
          </div>
        )}
      />
      <form.Field
        name="completed"
        children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs tracking-wide text-muted-foreground uppercase">
              {t("fields.completed", "Completed")}
            </label>



            <div className="flex items-center gap-2">
              <Switch
                checked={field.state.value as boolean}
                onCheckedChange={(checked) => field.handleChange(checked)}
              />
              <span className="text-sm text-primary">
                {t("fields.completed", "Completed")}
              </span>
            </div>



            {field.state.meta.errors.length > 0 && (
              <span className="text-xs text-destructive mt-1">
                {field.state.meta.errors[0]}
              </span>
            )}
          </div>
        )}
      />

      {/* Actions */}
      <div className="flex items-center gap-4 pt-4 border-t border-border">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            {t("form.discard")}
          </Button>
        )}
        <Button type="submit" size="sm">
          {defaultValues ? t("form.save") : t("form.create")}
        </Button>
      </div>
    </form>
  );
  // @generated-end full
  // @custom-start form
  // @custom-end form
}
