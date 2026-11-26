"use client";

import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef } from "react";

export type PhotoItem = { id: string; file: File; previewUrl: string };

// Pick or take photos, see thumbnails, remove any before submitting.
export function PhotoUpload({
  id,
  photos,
  onChange,
}: {
  id: string;
  photos: PhotoItem[];
  onChange: (photos: PhotoItem[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Free the preview images' memory when leaving the page
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(
    () => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)),
    [],
  );

  function addFiles(files: FileList | null) {
    if (!files) return;
    const added = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      }));
    onChange([...photos, ...added]);
    if (inputRef.current) inputRef.current.value = ""; // allow picking the same file again
  }

  function remove(photo: PhotoItem) {
    URL.revokeObjectURL(photo.previewUrl);
    onChange(photos.filter((p) => p.id !== photo.id));
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative aspect-square overflow-hidden rounded-xl border border-white/60 dark:border-white/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local preview, not a hosted image */}
            <img src={photo.previewUrl} alt={photo.file.name} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(photo)}
              aria-label={`Remove ${photo.file.name}`}
              className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}

        {/* Add photo tile */}
        <label
          htmlFor={id}
          className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-foreground/15 text-muted-foreground transition hover:border-sky-400 hover:bg-sky-500/5 hover:text-sky-600"
        >
          <ImagePlus className="h-6 w-6" />
          <span className="text-xs font-medium">Add photo</span>
        </label>
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => addFiles(e.target.files)}
      />
    </div>
  );
}
