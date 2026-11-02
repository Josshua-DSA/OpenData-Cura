// Helper geometri untuk peta: konversi GeoJSON (lng, lat) ke format Leaflet (lat, lng).

export interface KabupatenFeature {
  type: "Feature";
  properties: { name: string; id: string; type: "kabupaten" | "kota" };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
}

export interface EastJavaGeoJSON {
  type: "FeatureCollection";
  features: KabupatenFeature[];
}

// Normalise Polygon | MultiPolygon coordinates to a list of rings ([lat, lng]).
export function extractPolygons(feature: KabupatenFeature): [number, number][][] {
  const { type, coordinates } = feature.geometry;
  const toRing = (ring: number[][]): [number, number][] =>
    ring.map(([lng, lat]) => [lat, lng] as [number, number]);

  if (type === "Polygon") {
    return (coordinates as number[][][]).map(toRing);
  }
  return (coordinates as number[][][][]).flatMap((poly) => poly.map(toRing));
}
