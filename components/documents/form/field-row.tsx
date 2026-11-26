import type { TemplateField } from "@/lib/documents";

const RequiredMark = ({ required }: { required?: boolean }) =>
  required ? <span className="ml-0.5 text-red-500">*</span> : null;

// The frame around one field: its label, the input (children) and any error.
// Sections, checklists and checkboxes are laid out differently.
export function FieldRow({
  field,
  error,
  children,
}: {
  field: TemplateField;
  error?: string;
  children: React.ReactNode;
}) {
  const errorText = error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>;

  // A heading that starts a group of fields
  if (field.type === "section") {
    return (
      <div className="-mb-1 mt-3 border-b border-foreground/10 pb-2">
        <h2 className="text-base font-semibold tracking-tight">{field.label}</h2>
      </div>
    );
  }

  // Checklist item: question on the left, Yes / No / N/A on the right
  if (field.type === "yes_no_na") {
    return (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <span id={`${field.id}-label`} className="text-sm font-medium">
            {field.label}
            <RequiredMark required={field.required} />
          </span>
          {children}
        </div>
        {errorText}
      </div>
    );
  }

  // Checkboxes carry their own label
  if (field.type === "checkbox") {
    return (
      <div>
        {children}
        {errorText}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-200">
      <label htmlFor={field.id} className="mb-1.5 block text-sm font-medium">
        {field.label}
        <RequiredMark required={field.required} />
      </label>
      {children}
      {errorText}
    </div>
  );
}

export { RequiredMark };
