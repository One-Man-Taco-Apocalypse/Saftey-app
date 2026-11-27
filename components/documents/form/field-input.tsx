"use client";

import { ExternalLink, MessagesSquare } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import type { AnswerValue, TemplateField } from "@/lib/documents";
import type { Person } from "@/lib/person";
import type { Project } from "@/lib/projects";
import type { TalkOption } from "@/lib/toolbox-talks";
import { cn } from "@/lib/utils";
import { JobPicker } from "../job-picker";
import { PhotoUpload, type PhotoItem } from "../photo-upload";
import { SearchSelect, type SearchSelectOption } from "../search-select";
import { SignaturePad } from "../signature-pad";
import { SignatureTable, type SignatureRow } from "../signature-table";
import { inputClass } from "../styles";
import { RequiredMark } from "./field-row";
import { YesNoNaInput } from "./yes-no-na-input";

// Things every field might need from the form (same for every field)
export type FieldContext = {
  projects: Project[];
  people: Person[];
  personOptions: SearchSelectOption[]; // `people` as dropdown options (built once)
  currentUserId: string;
  crewIds: string[];
  firstSignerLabel?: string; // label of the "Completed by" field
  talks: TalkOption[]; // the toolbox talk library, for "toolbox_talk" fields
};

// Pick a toolbox talk; once picked, shows it with a link to read it again
function TalkSelect({
  id,
  value,
  onChange,
  invalid,
  talks,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  invalid: boolean;
  talks: TalkOption[];
}) {
  const chosen = talks.find((t) => t.id === value);
  return (
    <div className="flex flex-col gap-2">
      <SearchSelect
        id={id}
        value={value}
        onChange={onChange}
        invalid={invalid}
        placeholder="Choose a toolbox talk…"
        searchPlaceholder="Search talks"
        options={talks.map((t) => ({
          value: t.id,
          label: t.code ? `${t.code} · ${t.title}` : t.title,
          description: t.category,
        }))}
      />
      {chosen && (
        <Link
          href={`/dashboard/toolbox-talks/${chosen.id}`}
          target="_blank"
          className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-sky-500/10 px-2.5 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-500/15 dark:text-sky-300"
        >
          <MessagesSquare className="h-3.5 w-3.5" />
          Read this talk
          <ExternalLink className="h-3 w-3" />
          <span className="sr-only">(opens in a new tab)</span>
        </Link>
      )}
      {talks.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No toolbox talks yet. Add some on Admin › Toolbox talks.
        </p>
      )}
    </div>
  );
}

// Pick a person, with their colour dot beside the dropdown
function PersonSelect({
  id,
  value,
  onChange,
  invalid,
  ctx,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  invalid: boolean;
  ctx: FieldContext;
}) {
  const chosen = ctx.people.find((p) => p.user_id === value);
  return (
    <div className="flex items-center gap-3">
      <Avatar color={chosen?.color ?? "#d1d5db"} className="h-9 w-9" />
      <SearchSelect
        id={id}
        value={value}
        onChange={onChange}
        invalid={invalid}
        className="min-w-0 flex-1"
        placeholder="Choose a person…"
        searchPlaceholder="Search people"
        options={ctx.personOptions}
      />
    </div>
  );
}

// The input for one field, drawn according to its type.
export function FieldInput({
  field,
  value,
  onChange,
  invalid,
  ctx,
  photos,
  onPhotosChange,
  onSignatureChange,
  signatureRows,
  onSignatureRowsChange,
}: {
  field: TemplateField;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
  invalid: boolean;
  ctx: FieldContext;
  photos: PhotoItem[];
  onPhotosChange: (p: PhotoItem[]) => void;
  onSignatureChange: (png: Blob | null) => void;
  signatureRows: SignatureRow[];
  onSignatureRowsChange: (rows: SignatureRow[]) => void;
}) {
  const cls = cn(inputClass, invalid && "border-red-400 dark:border-red-400");
  const text = typeof value === "string" || typeof value === "number" ? String(value) : "";

  switch (field.type) {
    case "toolbox_talk":
      return (
        <TalkSelect id={field.id} value={text} onChange={onChange} invalid={invalid} talks={ctx.talks} />
      );

    case "job":
      return (
        <JobPicker id={field.id} projects={ctx.projects} value={text} onChange={onChange} invalid={invalid} />
      );

    // "completed_by" starts as the signed-in user; "person" starts empty
    case "completed_by":
    case "person":
      return <PersonSelect id={field.id} value={text} onChange={onChange} invalid={invalid} ctx={ctx} />;

    case "datetime":
      return (
        <input
          id={field.id}
          type="datetime-local"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        />
      );

    case "yes_no_na":
      return <YesNoNaInput id={field.id} value={text} onChange={onChange} invalid={invalid} />;

    case "section":
      return null; // drawn by FieldRow

    case "select":
      return (
        <SearchSelect
          id={field.id}
          value={text}
          onChange={onChange}
          invalid={invalid}
          options={(field.options ?? []).map((o) => ({ value: o, label: o }))}
        />
      );

    case "textarea":
      return (
        <textarea
          id={field.id}
          rows={4}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className={cn(cls, "resize-y")}
        />
      );

    case "checkbox":
      return (
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm font-medium">
          <input
            id={field.id}
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 shrink-0 accent-sky-600"
          />
          <span>
            {field.label}
            <RequiredMark required={field.required} />
            {field.requestDocument && (
              <span className="block text-xs font-normal text-muted-foreground">
                Everyone on the signature list will be asked to complete one
              </span>
            )}
          </span>
        </label>
      );

    case "photos":
      return <PhotoUpload id={field.id} photos={photos} onChange={onPhotosChange} />;

    case "signature":
      return <SignaturePad id={field.id} onChange={onSignatureChange} invalid={invalid} />;

    case "signatures":
      return (
        <SignatureTable
          rows={signatureRows}
          onChange={onSignatureRowsChange}
          people={ctx.people}
          currentUserId={ctx.currentUserId}
          quickAddGroups={[{ label: "My crew", userIds: ctx.crewIds }]}
          firstSignerLabel={ctx.firstSignerLabel}
          invalid={invalid}
        />
      );

    case "number":
    case "date":
    case "text":
      return (
        <input
          id={field.id}
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          value={text}
          onChange={(e) =>
            onChange(
              field.type === "number"
                ? e.target.value === ""
                  ? null
                  : Number(e.target.value)
                : e.target.value,
            )
          }
          className={cls}
        />
      );

    default:
      // A type this form doesn't know about: show it instead of guessing
      return (
        <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          Unknown field type &quot;{String(field.type)}&quot; for &quot;{field.label}&quot;. Check this
          template&apos;s fields in Supabase.
        </p>
      );
  }
}
