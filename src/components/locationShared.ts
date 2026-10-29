/** Browser-safe location types shared by the picker and the Leaflet map module. */

export type LocationValue = {
  lat: number;
  lng: number;
  accuracy: number | null;
};

/** Default map centre (Pune) used when GPS hasn't run yet. */
export const DEFAULT_LOCATION: LocationValue = { lat: 18.402252, lng: 76.584212, accuracy: null };

export const MAP_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
