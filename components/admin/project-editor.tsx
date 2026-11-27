"use client";

import { CheckCircle2, ExternalLink, Loader2, MapPin, Plus, Trash2, UserCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { Avatar } from "@/components/avatar";
import { ModuleHeader } from "@/components/dashboard/module-grid";
import { Panel } from "@/components/dashboard/panel";
import { personOption, SearchSelect } from "@/components/documents/search-select";
import {
  errorBoxClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/documents/styles";
import { coordinateError, coordinatesError, mapLinks, parseCoordinatePair } from "@/lib/coordinates";
import type { Person } from "@/lib/person";
import type { ProjectAddress, ProjectDetails } from "@/lib/projects";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { randomId } from "@/lib/uuid";

const PROVINCES = [
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Northwest Territories",
  "Nova Scotia",
  "Nunavut",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Yukon",
];

// Offered as you type a position (any other text is fine too)
const POSITION_SUGGESTIONS = [
  "Project Manager",
  "Superintendent",
  "Foreman",
  "Safety Representative",
  "First Aid",
  "Site Supervisor",
];

type RoleRow = { key: string; position: string; userId: string };

const toRows = (project: ProjectDetails): RoleRow[] =>
  project.roles.map((r) => ({ key: r.id, position: r.position, userId: r.user_id ?? "" }));

// What would be saved, to tell whether anything changed
const snapshot = (address: ProjectAddress, roles: RoleRow[]) =>
  JSON.stringify([address, roles.map((r) => [r.position.trim(), r.userId])]);

export function ProjectEditor({ project, people }: { project: ProjectDetails; people: Person[] }) {
  const router = useRouter();
  const positionListId = useId();
  const [address, setAddress] = useState<ProjectAddress>(project.address);
  const [roles, setRoles] = useState<RoleRow[]>(() => toRows(project));
  const [saved, setSaved] = useState(() => snapshot(project.address, toRows(project)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const workerOptions = useMemo(
    () => [{ value: "", label: "Unassigned" }, ...people.map((p) => personOption(p))],
    [people],
  );
  const personById = useMemo(() => new Map(people.map((p) => [p.user_id, p])), [people]);

  const dirty = snapshot(address, roles) !== saved;
  const missingPosition = roles.some((r) => !r.position.trim());
  const coordsError = coordinatesError(address.latitude, address.longitude);
  const links = mapLinks(address.latitude, address.longitude, project.job_name);

  const setField = (field: keyof ProjectAddress, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
    setJustSaved(false);
  };
  const updateRole = (key: string, change: Partial<RoleRow>) => {
    setRoles((prev) => prev.map((r) => (r.key === key ? { ...r, ...change } : r)));
    setJustSaved(false);
  };
  const addRole = () => {
    setRoles((prev) => [...prev, { key: randomId(), position: "", userId: "" }]);
    setJustSaved(false);
  };
  const removeRole = (key: string) => {
    setRoles((prev) => prev.filter((r) => r.key !== key));
    setJustSaved(false);
  };

  async function save() {
    setShowErrors(true);
    setError(null);
    if (coordsError) {
      setError(coordsError);
      return;
    }
    if (missingPosition) {
      setError("Every role needs a position. Fill it in or remove the row.");
      return;
    }
    setSaving(true);
    const { error: rpcError } = await createClient().rpc("save_project_details", {
      p_job_number: project.job_number,
      p_address: address,
      p_roles: roles.map((r) => ({ position: r.position.trim(), user_id: r.userId || null })),
    });
    setSaving(false);
    if (rpcError) {
      setError(`Couldn't save: ${rpcError.message}`);
      return;
    }
    setSaved(snapshot(address, roles));
    setShowErrors(false);
    setJustSaved(true);
    router.refresh();
  }

  const field = (
    id: keyof ProjectAddress,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div>
      <label htmlFor={`address-${id}`} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <input
        id={`address-${id}`}
        value={address[id]}
        onChange={(e) => setField(id, e.target.value)}
        className={inputClass}
        {...props}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Address and roles side by side on wide screens */}
      <div className="grid grid-cols-1 items-start gap-5 2xl:grid-cols-2">
        <Panel>
          <ModuleHeader title="Address" description="Where the project is" icon={MapPin} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              {field("street", "Street address", { autoComplete: "address-line1" })}
            </div>
            {field("unit", "Unit / suite (optional)", { autoComplete: "address-line2" })}
            {field("city", "City", { autoComplete: "address-level2" })}
            <div>
              <label htmlFor="address-province" className="mb-1.5 block text-sm font-medium">
                Province / territory
              </label>
              <SearchSelect
                id="address-province"
                value={address.province}
                onChange={(v) => setField("province", v)}
                placeholder="Choose…"
                searchPlaceholder="Search provinces"
                options={PROVINCES.map((p) => ({ value: p, label: p }))}
              />
            </div>
            {field("postal_code", "Postal code", { autoComplete: "postal-code", placeholder: "A1A 1A1" })}
            {field("country", "Country", { autoComplete: "country-name", placeholder: "Canada" })}
          </div>

          {/* Map coordinates */}
          <div className="mt-6 border-t border-border pt-5">
            <h3 className="text-sm font-semibold">Map coordinates (optional)</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Decimal degrees. In Google Maps, right-click the spot and click the numbers to copy them, then
              paste both into Latitude.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(["latitude", "longitude"] as const).map((kind) => {
                const fieldError =
                  coordinateError(address[kind], kind) ??
                  (showErrors && coordsError && !address[kind].trim() ? coordsError : null);
                return (
                  <div key={kind}>
                    <label
                      htmlFor={`address-${kind}`}
                      className="mb-1.5 block text-sm font-medium capitalize"
                    >
                      {kind}
                    </label>
                    <input
                      id={`address-${kind}`}
                      value={address[kind]}
                      inputMode="decimal"
                      placeholder={kind === "latitude" ? "43.6532" : "-79.3832"}
                      onChange={(e) => setField(kind, e.target.value)}
                      // Pasting "43.6532, -79.3832" fills both fields
                      onPaste={(e) => {
                        const pair = parseCoordinatePair(e.clipboardData.getData("text"));
                        if (!pair) return;
                        e.preventDefault();
                        setAddress((prev) => ({ ...prev, ...pair }));
                        setJustSaved(false);
                      }}
                      aria-invalid={fieldError ? true : undefined}
                      aria-describedby={fieldError ? `address-${kind}-error` : undefined}
                      className={cn(inputClass, fieldError && "border-red-400")}
                    />
                    {fieldError && (
                      <p
                        id={`address-${kind}-error`}
                        className="mt-1.5 text-xs text-red-600 dark:text-red-400"
                      >
                        {fieldError}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {links && (
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={links.google}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(secondaryButtonClass, "inline-flex items-center gap-1.5 py-1.5 text-xs")}
                >
                  Check in Google Maps <ExternalLink className="h-3.5 w-3.5" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
                <a
                  href={links.apple}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(secondaryButtonClass, "inline-flex items-center gap-1.5 py-1.5 text-xs")}
                >
                  Check in Apple Maps <ExternalLink className="h-3.5 w-3.5" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </div>
            )}
          </div>
        </Panel>

        <Panel>
          <ModuleHeader
            title="Project roles"
            description="Who fills each position on this project"
            icon={UserCog}
            tone="violet"
            action={
              <button
                type="button"
                onClick={addRole}
                className={cn(secondaryButtonClass, "flex items-center gap-1.5")}
              >
                <Plus className="h-4 w-4" />
                Add role
              </button>
            }
          />

          {roles.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No roles yet. Use <strong>Add role</strong> to add one.
            </p>
          ) : (
            // No overflow-hidden here: it would cut off the worker dropdown when it opens
            <div className="rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="w-[40%] rounded-tl-xl px-3 py-2.5">
                      Position
                    </th>
                    <th scope="col" className="px-3 py-2.5">
                      Worker
                    </th>
                    <th scope="col" className="w-12 rounded-tr-xl px-3 py-2.5">
                      <span className="sr-only">Remove</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {roles.map((role, i) => {
                    const worker = role.userId ? personById.get(role.userId) : undefined;
                    const invalid = showErrors && !role.position.trim();
                    return (
                      <tr key={role.key} className="align-middle">
                        <td className="px-3 py-2">
                          <input
                            value={role.position}
                            onChange={(e) => updateRole(role.key, { position: e.target.value })}
                            list={positionListId}
                            placeholder="e.g. Foreman"
                            aria-label={`Position, row ${i + 1}`}
                            aria-invalid={invalid || undefined}
                            className={cn(inputClass, "py-2", invalid && "border-red-400")}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Avatar color={worker?.color ?? "#d1d5db"} className="h-8 w-8" />
                            <SearchSelect
                              value={role.userId}
                              onChange={(v) => updateRole(role.key, { userId: v })}
                              options={workerOptions}
                              placeholder="Choose a worker…"
                              searchPlaceholder="Search people"
                              className="min-w-0 flex-1"
                              aria-label={`Worker, row ${i + 1}`}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeRole(role.key)}
                            aria-label={`Remove role, row ${i + 1}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-red-500/10 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <datalist id={positionListId}>
            {POSITION_SUGGESTIONS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Panel>
      </div>

      {/* Save bar */}
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-3 rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
        {error && <p className={cn(errorBoxClass, "mr-auto")}>{error}</p>}
        {!error && (
          <p className="mr-auto text-sm text-muted-foreground" aria-live="polite">
            {justSaved ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> Saved
              </span>
            ) : dirty ? (
              "You have unsaved changes"
            ) : (
              "No changes"
            )}
          </p>
        )}
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={() => {
            setAddress(project.address);
            setRoles(toRows(project));
            setError(null);
            setShowErrors(false);
          }}
          className={cn(secondaryButtonClass, "disabled:opacity-50")}
        >
          Discard
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className={cn(primaryButtonClass, "flex items-center gap-2 disabled:opacity-50")}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
