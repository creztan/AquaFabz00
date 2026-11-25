import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { AlertTriangle, MapPin, Navigation } from "lucide-react";
const PIN_COLORS = {
  station: { bg: "#0f172a", border: "#ffffff", label: "Aqua Fabz Station" },
  customer: { bg: "#0284c7", border: "#ffffff", label: "Customer Pin" },
  pending: { bg: "#d97706", border: "#ffffff", label: "Pending Delivery" },
  frequent: { bg: "#dc2626", border: "#ffffff", label: "Frequent Area" },
  vending: { bg: "#0d9488", border: "#ffffff", label: "Vending Machine" }
};
function createMarkerIcon(kind, active = false) {
  const cfg = PIN_COLORS[kind];
  const size = kind === "station" ? 30 : active ? 26 : 20;
  const html = kind === "station" ? `<div style="width:${size}px;height:${size}px;border-radius:8px;background:${cfg.bg};border:2.5px solid #fff;box-shadow:0 3px 10px rgba(15,23,42,0.4);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px;">AF</div>` : `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${cfg.bg};border:2.5px solid #fff;box-shadow:0 2px 8px rgba(15,23,42,0.35);${active ? "outline:3px solid rgba(2,132,199,0.45);" : ""}"></div>`;
  return L.divIcon({
    className: "aqua-map-pin",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}
const LocationMap = ({
  centerLat = 10.1935,
  centerLng = 122.8586,
  zoom = 15,
  pins,
  heightClass = "h-[420px]",
  interactivePick = false,
  pickedCoords = null,
  onPickCoords,
  onSelectPin,
  selectedPinId = null
}) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerGroupRef = useRef(null);
  const pickedMarkerRef = useRef(null);
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [centerLat, centerLng],
      zoom,
      zoomControl: true
    });
    const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19
    });
    let errorCount = 0;
    tileLayer.on("tileerror", () => {
      errorCount += 1;
      if (errorCount >= 3) {
        setTilesUnavailable(true);
      }
    });
    tileLayer.on("tileload", () => {
      setTilesUnavailable(false);
    });
    tileLayer.addTo(map);
    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = group;
    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
      pickedMarkerRef.current = null;
    };
  }, []);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handleClick = (e) => {
      if (interactivePick && onPickCoords) {
        onPickCoords({
          lat: Number(e.latlng.lat.toFixed(6)),
          lng: Number(e.latlng.lng.toFixed(6))
        });
      }
    };
    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [interactivePick, onPickCoords]);
  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;
    group.clearLayers();
    pins.forEach((pin) => {
      const marker = L.marker([pin.lat, pin.lng], {
        icon: createMarkerIcon(pin.kind, selectedPinId === pin.id)
      });
      const popupHtml = `
        <div style="min-width:190px;font-family:DM Sans,sans-serif;">
          <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:2px;">${pin.label}</div>
          ${pin.sublabel ? `<div style="font-size:11px;color:#475569;margin-bottom:4px;">${pin.sublabel}</div>` : ""}
          <div style="font-size:12px;color:#334155;">${pin.address}</div>
          ${pin.landmark ? `<div style="font-size:11px;color:#64748b;margin-top:3px;">Landmark: ${pin.landmark}</div>` : ""}
          <div style="font-size:11px;color:#64748b;margin-top:4px;font-family:monospace;">${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}</div>
        </div>
      `;
      marker.bindPopup(popupHtml);
      marker.on("click", () => {
        if (onSelectPin) onSelectPin(pin);
      });
      marker.addTo(group);
    });
    if (pickedMarkerRef.current) {
      pickedMarkerRef.current.remove();
      pickedMarkerRef.current = null;
    }
    if (interactivePick && pickedCoords) {
      const draggable = L.marker([pickedCoords.lat, pickedCoords.lng], {
        draggable: true,
        icon: L.divIcon({
          className: "aqua-picked-pin",
          html: `<div style="width:26px;height:26px;border-radius:9999px;background:#0284c7;border:3px solid #fff;box-shadow:0 3px 10px rgba(2,132,199,0.5);outline:3px solid rgba(2,132,199,0.35);"></div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        })
      }).addTo(map);
      draggable.on("dragend", () => {
        const pos = draggable.getLatLng();
        if (onPickCoords) {
          onPickCoords({
            lat: Number(pos.lat.toFixed(6)),
            lng: Number(pos.lng.toFixed(6))
          });
        }
      });
      pickedMarkerRef.current = draggable;
    }
  }, [pins, selectedPinId, interactivePick, pickedCoords, onPickCoords, onSelectPin]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (pickedCoords && interactivePick) {
      map.panTo([pickedCoords.lat, pickedCoords.lng]);
    }
  }, [pickedCoords?.lat, pickedCoords?.lng, interactivePick]);
  const minLat = 10.184;
  const maxLat = 10.205;
  const minLng = 122.848;
  const maxLng = 122.871;
  const toPercent = (lat, lng) => {
    const x = (lng - minLng) / (maxLng - minLng) * 100;
    const y = (1 - (lat - minLat) / (maxLat - minLat)) * 100;
    return {
      x: Math.max(6, Math.min(94, x)),
      y: Math.max(8, Math.min(92, y))
    };
  };
  return <div className="space-y-2">
      {tilesUnavailable && <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <span className="font-semibold">Map tiles unavailable (offline or blocked).</span>{" "}
            Showing coordinate reference grid and written delivery addresses below.
          </div>
        </div>}

      <div className={`relative w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100 ${heightClass}`}>
        <div ref={containerRef} className={`h-full w-full ${tilesUnavailable ? "opacity-20" : ""}`} />

        {tilesUnavailable && <div
    className="absolute inset-0 z-[2] bg-slate-50/95 p-4"
    onClick={(e) => {
      if (!interactivePick || !onPickCoords) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const xPct = (e.clientX - rect.left) / rect.width;
      const yPct = (e.clientY - rect.top) / rect.height;
      const lng = minLng + xPct * (maxLng - minLng);
      const lat = maxLat - yPct * (maxLat - minLat);
      onPickCoords({
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6))
      });
    }}
  >
            <div className="h-full w-full rounded border border-slate-200 bg-white relative overflow-hidden">
              <div
    className="absolute inset-0 opacity-40"
    style={{
      backgroundImage: "linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)",
      backgroundSize: "40px 40px"
    }}
  />
              <div className="absolute left-3 top-2.5 text-[11px] font-medium text-slate-500">
                Binalbagan Service Area Reference Grid (Saved Coordinates)
              </div>

              {pins.map((pin) => {
    const pos = toPercent(pin.lat, pin.lng);
    const cfg = PIN_COLORS[pin.kind];
    return <button
      key={pin.id}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (onSelectPin) onSelectPin(pin);
      }}
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group focus:outline-none"
      title={`${pin.label} \u2014 ${pin.address}`}
    >
                    <span
      style={{ backgroundColor: cfg.bg }}
      className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow"
    >
                      {pin.kind === "station" ? "AF" : <MapPin className="h-3 w-3" />}
                    </span>
                    <span className="mt-1 whitespace-nowrap rounded bg-slate-900/85 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      {pin.label}
                    </span>
                  </button>;
  })}

              {interactivePick && pickedCoords && <div
    style={{
      left: `${toPercent(pickedCoords.lat, pickedCoords.lng).x}%`,
      top: `${toPercent(pickedCoords.lat, pickedCoords.lng).y}%`
    }}
    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
  >
                  <div className="h-6 w-6 rounded-full border-2 border-white bg-sky-600 shadow ring-4 ring-sky-500/30" />
                </div>}
            </div>
          </div>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-900" />
            Aqua Fabz Station
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-600" />
            Customer Pin
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-600" />
            Open Delivery
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-600" />
            Frequent Area
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-slate-500">
          <Navigation className="h-3.5 w-3.5" />
          Saved locations only (no live GPS)
        </span>
      </div>
    </div>;
};
export {
  LocationMap
};
