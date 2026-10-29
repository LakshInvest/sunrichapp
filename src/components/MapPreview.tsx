import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MAP_ATTRIBUTION, MAP_TILES } from "./locationShared";

const PIN_HTML = `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg"><path d="M15 0C6.7 0 0 6.7 0 15c0 11 15 27 15 27s15-16 15-27C30 6.7 23.3 0 15 0Z" fill="#0B2545"/><circle cx="15" cy="15" r="6" fill="#2EA3C7"/></svg>`;

/** Read-only map preview with a fixed pin. Browser-only: load via React.lazy. */
export default function MapPreview({
  lat,
  lng,
  className,
}: {
  lat: number;
  lng: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 16,
      dragging: false,
      touchZoom: false,
      doubleClickZoom: false,
      scrollWheelZoom: false,
      boxZoom: false,
      keyboard: false,
      zoomControl: false,
    });
    L.tileLayer(MAP_TILES, { attribution: MAP_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    const icon = L.divIcon({ html: PIN_HTML, className: "", iconSize: [30, 42], iconAnchor: [15, 42] });
    L.marker([lat, lng], { draggable: false, interactive: false, icon }).addTo(map);
    mapRef.current = map;
    // The sheet mounts mid-animation: re-measure once it settles.
    const t = window.setTimeout(() => map.invalidateSize(), 200);
    return () => {
      window.clearTimeout(t);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={className ?? "h-36 w-full overflow-hidden rounded-xl border border-border"}
    />
  );
}
