import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { loadGoogleMaps } from "@/lib/gmaps";
import { sameSpot } from "@/lib/maps";
import type { LocationValue } from "./locationShared";

/**
 * Interactive Google map with a draggable pin (Maps JavaScript API, browser
 * side). Tap the map or drag the pin to fine-tune the delivery location.
 */
export function PinMap({
  value,
  onChange,
  className = "h-44 w-full overflow-hidden rounded-xl border border-border",
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  className?: string;
}) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    // Google calls this global when the key/referrer is rejected — show our fallback.
    window.gm_authFailure = () => {
      if (alive) setFailed(true);
    };
    loadGoogleMaps()
      .then((maps) => {
        if (!alive || !divRef.current) return;
        const map = new maps.Map(divRef.current, {
          center: { lat: value.lat, lng: value.lng },
          zoom: 16,
          clickableIcons: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: "greedy",
        });
        const marker = new maps.Marker({
          map,
          position: { lat: value.lat, lng: value.lng },
          draggable: true,
        });
        marker.addListener("dragend", () => {
          const p = marker.getPosition();
          if (p) onChangeRef.current({ lat: p.lat(), lng: p.lng(), accuracy: null });
        });
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (e.latLng) onChangeRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng(), accuracy: null });
        });
        mapRef.current = map;
        markerRef.current = marker;
        setReady(true);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
      mapRef.current = null;
      markerRef.current = null;
    };
    // Mount-once: the pin starts at the value at mount time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconcile external value changes (search pick / GPS) without a map rebuild.
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    const pos = marker.getPosition();
    if (pos && sameSpot({ lat: pos.lat(), lng: pos.lng() }, value)) return;
    map.setCenter({ lat: value.lat, lng: value.lng });
    marker.setPosition({ lat: value.lat, lng: value.lng });
  }, [value]);

  if (failed) {
    return (
      <div className={`${className} flex items-center justify-center gap-2 bg-muted text-muted-foreground`}>
        <MapPin className="h-4 w-4 text-secondary" aria-hidden />
        <span className="text-xs font-medium">📍 {value.lat.toFixed(4)}, {value.lng.toFixed(4)}</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={divRef} className="h-full w-full" data-testid="pinmap" />
      {!ready && <div className="absolute inset-0 animate-pulse bg-muted" />}
    </div>
  );
}
