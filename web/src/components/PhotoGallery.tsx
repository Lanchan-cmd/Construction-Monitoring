import { useState } from "react";
import { X, ZoomIn, Images } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui-widgets";

interface Photo {
  id: string;
  public_url: string;
  caption?: string | null;
  photo_type?: string | null;
}

interface PhotoGalleryProps {
  photos: Photo[];
  loading?: boolean;
}

export function PhotoGallery({ photos, loading }: PhotoGalleryProps) {
  const [selected, setSelected] = useState<Photo | null>(null);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  if (!photos.length) {
    return (
      <EmptyState
        icon={Images}
        title="No photos yet"
        description="Upload site photos, inspection images, or progress shots."
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((photo) => (
          <button
            key={photo.id}
            onClick={() => setSelected(photo)}
            className="group relative aspect-square overflow-hidden rounded-2xl bg-muted shadow-card transition-all duration-200 hover:shadow-card-hover hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <img
              src={photo.public_url}
              alt={photo.caption ?? "Site photo"}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/30">
              <ZoomIn className="h-6 w-6 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            </div>
            {photo.photo_type && (
              <span className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white capitalize backdrop-blur-sm">
                {photo.photo_type}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4"
          onClick={() => setSelected(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
            onClick={() => setSelected(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selected.public_url}
              alt={selected.caption ?? "Site photo"}
              className="max-h-[85vh] w-auto object-contain"
            />
            {selected.caption && (
              <div className="bg-black/70 px-4 py-2 text-sm text-white backdrop-blur-sm">
                {selected.caption}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
