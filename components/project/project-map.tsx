import { ExternalLink, MapPin } from "lucide-react";
import { secondaryButtonClass } from "@/components/documents/styles";
import { coordinatesError, mapLinks } from "@/lib/coordinates";
import { cn } from "@/lib/utils";

// How much area around the pin the map shows (degrees each way; ~650 m)
const SPAN = 0.006;

// OpenStreetMap's embeddable map: free, no API key needed.
function embedUrl(lat: number, lng: number) {
  const bbox = [lng - SPAN, lat - SPAN, lng + SPAN, lat + SPAN].map((n) => n.toFixed(6)).join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lng}`;
}

// A map with a pin on the project, plus buttons to open it in Google / Apple Maps.
// Without coordinates it says how to add them.
export function ProjectMap({
  latitude,
  longitude,
  label,
  editHref,
}: {
  latitude: string;
  longitude: string;
  label: string;
  editHref: string;
}) {
  const valid = latitude.trim() && longitude.trim() && !coordinatesError(latitude, longitude);
  if (!valid) {
    return (
      <div className="flex h-full min-h-56 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center">
        <MapPin className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium">No map location yet</p>
        <p className="text-xs text-muted-foreground">
          Add the project&apos;s coordinates on{" "}
          <a
            href={editHref}
            className="font-medium text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
          >
            Edit projects
          </a>{" "}
          to show it here.
        </p>
      </div>
    );
  }

  const lat = Number(latitude);
  const lng = Number(longitude);
  const links = mapLinks(latitude, longitude, label)!;
  const linkClass = cn(secondaryButtonClass, "inline-flex items-center gap-1.5 py-1.5 text-xs");

  return (
    <div className="flex h-full flex-col gap-2">
      <iframe
        title={`Map of ${label}`}
        src={embedUrl(lat, lng)}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="min-h-56 w-full flex-1 rounded-xl border border-border bg-muted"
      />
      <div className="flex flex-wrap items-center gap-2">
        <a href={links.google} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Google Maps <ExternalLink className="h-3.5 w-3.5" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <a href={links.apple} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Apple Maps <ExternalLink className="h-3.5 w-3.5" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <span className="ml-auto text-[0.7rem] text-muted-foreground">
          Map ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline"
          >
            OpenStreetMap
          </a>
        </span>
      </div>
    </div>
  );
}
