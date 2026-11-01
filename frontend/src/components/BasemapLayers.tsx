import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { TileLayer, useMap } from "react-leaflet";

/**
 * Basemap strategy for the Health Map.
 *
 * CARTO's public raster CDN (basemaps.cartocdn.com) used to serve Positron tiles
 * anonymously. It now answers **every** request with HTTP 200 and a fixed
 * 256x256 PNG that literally reads "API KEY REQUIRED — carto.com/basemaps/apikey".
 * Because the response is 200, Leaflet's `tileerror` event never fires, so a
 * plain onError fallback cannot detect it.
 *
 * We therefore try CARTO first (in case an operator later configures a keyless
 * mirror) and detect the placeholder by inspecting the decoded tile image. If a
 * placeholder is seen, we permanently switch this map instance to
 * OpenStreetMap standard tiles, desaturated via CSS so the choropleth cluster
 * colours stay dominant. If OSM also fails, the map degrades to a plain
 * #eef2f7 canvas with the polygons still drawn on top.
 *
 * No API key or paid service is used anywhere in this chain.
 */

export const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Zoom at which CARTO's own placement labels are allowed back in. Below this
 * the map shows only the regency/city names we draw ourselves (see
 * EastJavaMarkerMap's RegionLabelLayer) — two label systems at once made the
 * map unreadable and drowned out the cluster colours.
 */
const BASEMAP_LABEL_MIN_ZOOM = 10;

/** HTTP 200 "API KEY REQUIRED" placeholder emitted by CARTO is a tiny PNG (~2 KB). */
const CARTO_PLACEHOLDER_MAX_BYTES = 4096;

/**
 * Tile source chain:
 *  carto → OSM grayscale → plain (#eef2f7 canvas background, no tiles).
 */
type TileSource = "carto" | "osm" | "plain";

/**
 * Returns true when the tile URL yields CARTO's API-key placeholder rather than
 * a real map tile. Real Positron tiles are consistently larger than ~2 KB even
 * at low zoom, so a byte-size probe is a reliable, cheap discriminator.
 */
async function isCartoPlaceholder(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { mode: "cors", cache: "force-cache" });
    if (!response.ok) return true;
    const buffer = await response.arrayBuffer();
    return buffer.byteLength <= CARTO_PLACEHOLDER_MAX_BYTES;
  } catch {
    // Network/CORS failure also means "cannot use CARTO".
    return true;
  }
}

function BasemapLayers({
  showLabels,
  onSourceChange,
}: {
  showLabels: boolean;
  onSourceChange?: (source: TileSource) => void;
}) {
  const map = useMap();
  const [source, setSource] = useState<TileSource>("carto");
  // CARTO's place labels would sit on top of our own region names, so they are
  // only fetched once the user is zoomed in far enough for them to add detail.
  const [zoom, setZoom] = useState<number>(() => {
    try {
      return map.getZoom();
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const sync = () => {
      try {
        setZoom(map.getZoom());
      } catch {
        /* map detached */
      }
    };
    sync();
    map.on("zoomend", sync);
    return () => {
      map.off("zoomend", sync);
    };
  }, [map]);

  // Probe a representative tile covering East Java, then decide the source.
  useEffect(() => {
    let active = true;
    const zoom = Math.max(0, Math.min(6, Math.round(map.getZoom() || 6)));
    const center = map.getCenter();
    const scale = 2 ** zoom;
    const x = Math.floor(((center.lng + 180) / 360) * scale);
    const latRad = (center.lat * Math.PI) / 180;
    const y = Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale
    );
    const probeUrl = `https://a.basemaps.cartocdn.com/light_nolabels/${zoom}/${x}/${y}.png`;
    isCartoPlaceholder(probeUrl).then((placeholder) => {
      if (!active) return;
      const next: TileSource = placeholder ? "osm" : "carto";
      setSource(next);
      onSourceChange?.(next);
    });
    return () => {
      active = false;
    };
  }, [map, onSourceChange]);

  // Desaturate only the basemap tile pane while the OSM fallback is active.
  useEffect(() => {
    const container = map.getContainer();
    const flag = "tilik-basemap-fallback";
    if (source === "osm") container.classList.add(flag);
    else container.classList.remove(flag);
    return () => container.classList.remove(flag);
  }, [map, source]);

  // No tiles at all: keep the plain #eef2f7 canvas so polygons stay readable.
  if (source === "plain") {
    return null;
  }

  const isCarto = source === "carto";

  // Keep one base TileLayer mounted while the source changes. React Leaflet
  // updates its URL in place, so fallback never creates a layer outside the map.
  return (
    <>
      <TileLayer
        url={
          isCarto
            ? "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
            : "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        }
        subdomains={["a", "b", "c", "d"]}
        maxZoom={19}
        pane="basemapPane"
        attribution={isCarto ? CARTO_ATTRIBUTION : OSM_ATTRIBUTION}
        eventHandlers={{
          tileerror: () => {
            setSource((current) => {
              if (current === "carto") return "osm";
              if (current === "osm") return "plain";
              return current;
            });
          },
        }}
      />
      {isCarto && showLabels && zoom >= BASEMAP_LABEL_MIN_ZOOM && (
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
          subdomains={["a", "b", "c", "d"]}
          maxZoom={20}
          pane="labelsPane"
        />
      )}
    </>
  );
}

export default BasemapLayers;
