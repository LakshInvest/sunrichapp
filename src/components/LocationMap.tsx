import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MAP_ATTRIBUTION, MAP_TILES, type LocationValue } from "./locationShared";

const PIN_HTML = `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg"><path d="M15 0C6.7 0 0 6.7 0 15c0 11 15 27 15 27s15-16 15-27C30 6.7 23.3 0 15 0Z" fill="#0B2545"/><circle cx="15" cy="15" r="6" fill="#2EA3C7"/></svg>`;

/** Draggable-pin OpenStreetMap map. Browser-only: always loaded via React.lazy. */
export default function LocationMap({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [value.lat, value.lng],
      zoom: 16,
      scrollWheelZoom: false,
    });
    L.tileLayer(MAP_TILES, { attribution: MAP_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    const icon = L.divIcon({ html: PIN_HTML, className: "", iconSize: [30, 42], iconAnchor: [15, 42] });
    const marker = L.marker([value.lat, value.lng], { draggable: true, icon }).addTo(map);
    marker.on("dragend", () => {
      const p = marker.getLatLng();
      onChangeRef.current({ lat: p.lat, lng: p.lng, accuracy: null });
    });
    mapRef.current = map;
    markerRef.current = marker;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // GPS or prop updates re-centre the map without killing drag state.
  useEffect(() => {
    mapRef.current?.setView([value.lat, value.lng], mapRef.current.getZoom());
    markerRef.current?.setLatLng([value.lat, value.lng]);
  }, [value.lat, value.lng]);

  return <div ref={containerRef} className="h-56 w-full overflow-hidden rounded-xl border border-border" />;
}
