import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/lib/supabase";
import { usePrefs } from "@/lib/auth";
import { t } from "@/lib/i18n";
import type { Project } from "@/lib/types";
import { PageHeader, EmptyState } from "@/components/ui-widgets";
import { Badge } from "@/components/ui/badge";

// Fix Leaflet default icon paths broken by bundlers
delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  planning: "#f59e0b",
  on_hold: "#f97316",
  completed: "#3b82f6",
  cancelled: "#ef4444",
};

export default function MapPage() {
  const { language } = usePrefs();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id,name,status,latitude,longitude,state,district,village,budget,progress_percent")
        .order("name");
      if (error) throw error;
      return data as Project[];
    },
  });

  const projectsWithCoords = projects.filter((p) => p.latitude && p.longitude);
  // Projects without GPS — show in list below map
  const projectsWithoutCoords = projects.filter((p) => !p.latitude || !p.longitude);

  useEffect(() => {
    if (!containerRef.current) return;

    // Init map centered on Karnataka, India
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current).setView([13.0, 76.5], 7);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    // Add markers for projects with coordinates
    projectsWithCoords.forEach((project) => {
      const color = STATUS_COLORS[project.status] ?? "#6b7280";
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      L.marker([project.latitude!, project.longitude!], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width:180px">
            <strong style="font-size:13px">${project.name}</strong><br/>
            <span style="font-size:11px;color:#6b7280">${project.village ?? ""}, ${project.district ?? ""}, ${project.state ?? ""}</span><br/>
            <span style="font-size:11px">Status: <b>${project.status}</b></span><br/>
            <span style="font-size:11px">Progress: <b>${project.progress_percent}%</b></span><br/>
            <span style="font-size:11px">Budget: <b>₹${(project.budget ?? 0).toLocaleString("en-IN")}</b></span>
          </div>
        `);
    });

    // Fit bounds if markers exist
    if (projectsWithCoords.length > 0) {
      const bounds = L.latLngBounds(
        projectsWithCoords.map((p) => [p.latitude!, p.longitude!] as [number, number])
      );
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [projectsWithCoords]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div>
      <PageHeader
        title="Project Map"
        description={`${projects.length} projects across Karnataka`}
      />

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-3">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full border border-white shadow" style={{ background: color }} />
            <span className="text-xs capitalize text-muted-foreground">{status.replace("_", " ")}</span>
          </div>
        ))}
      </div>

      {/* Map container */}
      <div
        ref={containerRef}
        className="mb-4 w-full rounded-xl border overflow-hidden"
        style={{ height: "480px" }}
      />

      {/* Projects without GPS */}
      {projectsWithoutCoords.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            {projectsWithoutCoords.length} project(s) without GPS coordinates — add latitude/longitude to show on map:
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {projectsWithoutCoords.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-lg border bg-card p-3">
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[p.village, p.district, p.state].filter(Boolean).join(", ") || "No location"}
                  </p>
                </div>
                <Badge variant="outline" className="ml-auto shrink-0 capitalize text-xs">
                  {p.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {projects.length === 0 && (
        <EmptyState icon={MapPin} title="No projects" description="Create projects to see them on the map" />
      )}
    </div>
  );
}
