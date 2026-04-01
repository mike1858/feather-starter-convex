// @generated-start imports
import { useForm } from "@tanstack/react-form";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "~/convex/_generated/api";
import { useTranslation } from "react-i18next";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
// @generated-end imports
// @custom-start imports
// @custom-end imports

interface ContactsFormProps {
  mode: "inline" | "full";
  defaultValues?: Partial<Record<string, unknown>>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ContactsForm({
  mode,
  defaultValues,
  onSuccess,
  onCancel,
}: ContactsFormProps) {
  const { t } = useTranslation("contacts");
  const { mutateAsync: createItem } = useMutation({
    mutationFn: useConvexMutation(api.contacts.mutations.create),
  });

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      company: "",
      status: "lead",
      phone: "",
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
          name="name"
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
        name="name"
        children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs tracking-wide text-muted-foreground uppercase">
              {t("fields.name", "Name")}
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
        name="email"
        children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs tracking-wide text-muted-foreground uppercase">
              {t("fields.email", "Email")}
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
        name="company"
        children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs tracking-wide text-muted-foreground uppercase">
              {t("fields.company", "Company")}
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
        name="status"
        children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs tracking-wide text-muted-foreground uppercase">
              {t("fields.status", "Status")}
            </label>





            <Select
              value={field.state.value as string}
              onValueChange={(val) => field.handleChange(val)}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            {field.state.meta.errors.length > 0 && (
              <span className="text-xs text-destructive mt-1">
                {field.state.meta.errors[0]}
              </span>
            )}
          </div>
        )}
      />
      <form.Field
        name="phone"
        children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs tracking-wide text-muted-foreground uppercase">
              {t("fields.phone", "Phone")}
            </label>

            <Input
              value={field.state.value as string}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              className="h-10"
              maxLength={ 50 }
            />





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
