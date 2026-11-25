import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { AlertTriangle, Navigation } from "lucide-react";

const PIN_COLORS = {
  station: { bg: "#0f172a", accent: "#38bdf8", label: "Aqua Fabz Station" },
  vending: { bg: "#0d9488", accent: "#ffffff", label: "Vending Machine" },
  customer: { bg: "#0284c7", accent: "#ffffff", label: "Customer Pin" },
  pending: { bg: "#d97706", accent: "#ffffff", label: "Open Delivery" },
  frequent: { bg: "#dc2626", accent: "#ffffff", label: "Frequent Area" },
  delivered: { bg: "#059669", accent: "#ffffff", label: "Delivered" },
  picked: { bg: "#0284c7", accent: "#ffffff", label: "Selected Pin" }
};

function getInnerGlyphPaths(kind) {
  switch (kind) {
    case "station":
      // House silhouette with doorway
      return `<path d="M14 8.2L8.4 13.1H10.1V19H12.9V15.4H15.1V19H17.9V13.1H19.6L14 8.2Z" fill="#38bdf8"/><path d="M12.9 19V15.4H15.1V19" fill="#ffffff"/>`;
    case "vending":
      // Dispenser kiosk box + droplet dot
      return `<rect x="10.2" y="9" width="7.6" height="9.5" rx="1.4" fill="none" stroke="#ffffff" stroke-width="1.5"/><rect x="11.8" y="10.8" width="4.4" height="3.2" rx="0.6" fill="#ffffff"/><circle cx="14" cy="16.2" r="1.1" fill="#ffffff"/>`;
    case "customer":
      // Person / customer silhouette
      return `<circle cx="14" cy="11.1" r="2.1" fill="#ffffff"/><path d="M10.1 17.5C10.1 15.4 11.8 14.1 14 14.1C16.2 14.1 17.9 15.4 17.9 17.5" fill="#ffffff"/>`;
    case "pending":
      // Delivery parcel cube
      return `<path d="M14 9L18.2 11.3V15.9L14 18.2L9.8 15.9V11.3L14 9Z" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/><path d="M9.8 11.3L14 13.6L18.2 11.3M14 13.6V18.2" stroke="#ffffff" stroke-width="1.3" stroke-linejoin="round" fill="none"/>`;
    case "frequent":
      // 4-point highlight star
      return `<path d="M14 8.6L15.45 12.15L19 13.6L15.45 15.05L14 18.6L12.55 15.05L9 13.6L12.55 12.15L14 8.6Z" fill="#ffffff"/>`;
    case "delivered":
      // Checkmark
      return `<path d="M9.6 13.7L12.6 16.7L18.6 10.6" fill="none" stroke="#ffffff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>`;
    case "picked":
      // Target crosshair + plus
      return `<circle cx="14" cy="13.6" r="4.2" fill="none" stroke="#ffffff" stroke-width="1.5"/><path d="M14 11V16.2M11.4 13.6H16.6" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>`;
    default:
      return `<circle cx="14" cy="13.6" r="3" fill="#ffffff"/>`;
  }
}

function buildMarkerHtml(kind, active = false, width = 30) {
  const cfg = PIN_COLORS[kind] || PIN_COLORS.customer;
  const height = Math.round(width * 1.22);
  const halo =
    active || kind === "picked"
      ? `filter: drop-shadow(0 0 4px rgba(2,132,199,0.65)) drop-shadow(0 3px 6px rgba(15,23,42,0.35));`
      : `filter: drop-shadow(0 2px 5px rgba(15,23,42,0.32));`;

  if (kind === "station") {
    return `<svg width="${width}" height="${height}" viewBox="0 0 28 34" xmlns="http://www.w3.org/2000/svg" style="display:block;${halo}">
      <path d="M4 7C4 3.686 6.686 1 10 1H18C21.314 1 24 3.686 24 7V21C24 24.314 21.314 27 18 27H16.6L14 32.5L11.4 27H10C6.686 27 4 24.314 4 21V7Z" fill="${cfg.bg}" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
      ${getInnerGlyphPaths("station")}
    </svg>`;
  }

  return `<svg width="${width}" height="${height}" viewBox="0 0 28 34" xmlns="http://www.w3.org/2000/svg" style="display:block;${halo}">
    <path d="M14 1.5C7.649 1.5 2.5 6.649 2.5 13C2.5 20.85 11.75 29.8 13.42 31.34C13.75 31.65 14.25 31.65 14.58 31.34C16.25 29.8 25.5 20.85 25.5 13C25.5 6.649 20.351 1.5 14 1.5Z" fill="${cfg.bg}" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
    ${getInnerGlyphPaths(kind)}
  </svg>`;
}

function createMarkerIcon(kind, active = false) {
  const width = kind === "station" ? 34 : active ? 32 : 27;
  const height = Math.round(width * 1.22);
  return L.divIcon({
    className: "aqua-map-pin",
    html: buildMarkerHtml(kind, active, width),
    iconSize: [width, height],
    iconAnchor: [width / 2, height - 2],
    popupAnchor: [0, -(height - 4)]
  });
}

const PinSymbol = ({ kind, size = 20 }) => {
  const cfg = PIN_COLORS[kind] || PIN_COLORS.customer;
  const height = Math.round(size * 1.2);
  if (kind === "station") {
    return (
      <svg
        width={size}
        height={height}
        viewBox="0 0 28 34"
        className="shrink-0 drop-shadow-xs"
        aria-hidden="true"
      >
        <path
          d="M4 7C4 3.686 6.686 1 10 1H18C21.314 1 24 3.686 24 7V21C24 24.314 21.314 27 18 27H16.6L14 32.5L11.4 27H10C6.686 27 4 24.314 4 21V7Z"
          fill={cfg.bg}
          stroke="#ffffff"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M14 8.2L8.4 13.1H10.1V19H12.9V15.4H15.1V19H17.9V13.1H19.6L14 8.2Z"
          fill="#38bdf8"
        />
        <path d="M12.9 19V15.4H15.1V19" fill="#ffffff" />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 28 34"
      className="shrink-0 drop-shadow-xs"
      aria-hidden="true"
    >
      <path
        d="M14 1.5C7.649 1.5 2.5 6.649 2.5 13C2.5 20.85 11.75 29.8 13.42 31.34C13.75 31.65 14.25 31.65 14.58 31.34C16.25 29.8 25.5 20.85 25.5 13C25.5 6.649 20.351 1.5 14 1.5Z"
        fill={cfg.bg}
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {kind === "vending" && (
        <>
          <rect
            x="10.2"
            y="9"
            width="7.6"
            height="9.5"
            rx="1.4"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <rect x="11.8" y="10.8" width="4.4" height="3.2" rx="0.6" fill="#ffffff" />
          <circle cx="14" cy="16.2" r="1.1" fill="#ffffff" />
        </>
      )}
      {kind === "customer" && (
        <>
          <circle cx="14" cy="11.1" r="2.1" fill="#ffffff" />
          <path
            d="M10.1 17.5C10.1 15.4 11.8 14.1 14 14.1C16.2 14.1 17.9 15.4 17.9 17.5"
            fill="#ffffff"
          />
        </>
      )}
      {kind === "pending" && (
        <>
          <path
            d="M14 9L18.2 11.3V15.9L14 18.2L9.8 15.9V11.3L14 9Z"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M9.8 11.3L14 13.6L18.2 11.3M14 13.6V18.2"
            stroke="#ffffff"
            strokeWidth="1.3"
            strokeLinejoin="round"
            fill="none"
          />
        </>
      )}
      {kind === "frequent" && (
        <path
          d="M14 8.6L15.45 12.15L19 13.6L15.45 15.05L14 18.6L12.55 15.05L9 13.6L12.55 12.15L14 8.6Z"
          fill="#ffffff"
        />
      )}
      {kind === "delivered" && (
        <path
          d="M9.6 13.7L12.6 16.7L18.6 10.6"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {kind === "picked" && (
        <>
          <circle
            cx="14"
            cy="13.6"
            r="4.2"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <path
            d="M14 11V16.2M11.4 13.6H16.6"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
};

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
    const binalbaganBounds = L.latLngBounds([10.130, 122.780], [10.260, 122.950]);
    const map = L.map(containerRef.current, {
      center: [centerLat, centerLng],
      zoom,
      minZoom: 11,
      maxZoom: 19,
      maxBounds: binalbaganBounds,
      maxBoundsViscosity: 1.0,
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
      const w = 34;
      const h = Math.round(w * 1.22);
      const draggable = L.marker([pickedCoords.lat, pickedCoords.lng], {
        draggable: true,
        icon: L.divIcon({
          className: "aqua-picked-pin",
          html: buildMarkerHtml("picked", true, w),
          iconSize: [w, h],
          iconAnchor: [w / 2, h - 2],
          popupAnchor: [0, -(h - 4)]
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
    } else {
      map.panTo([centerLat, centerLng]);
    }
  }, [centerLat, centerLng, pickedCoords?.lat, pickedCoords?.lng, interactivePick]);

  const minLat = 10.160;
  const maxLat = 10.225;
  const minLng = 122.835;
  const maxLng = 122.885;
  const toPercent = (lat, lng) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    const y = (1 - (lat - minLat) / (maxLat - minLat)) * 100;
    return {
      x: Math.max(6, Math.min(94, x)),
      y: Math.max(8, Math.min(92, y))
    };
  };

  return (
    <div className="space-y-2">
      {tilesUnavailable && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <span className="font-semibold">Map tiles unavailable (offline or blocked).</span>{" "}
            Showing coordinate reference grid and written delivery addresses below.
          </div>
        </div>
      )}

      <div
        className={`relative w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100 ${heightClass}`}
      >
        <div ref={containerRef} className={`h-full w-full ${tilesUnavailable ? "opacity-20" : ""}`} />

        {tilesUnavailable && (
          <div
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
                  backgroundImage:
                    "linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)",
                  backgroundSize: "40px 40px"
                }}
              />
              <div className="absolute left-3 top-2.5 text-[11px] font-medium text-slate-500">
                Binalbagan Service Area Reference Grid (Saved Coordinates)
              </div>

              {pins.map((pin) => {
                const pos = toPercent(pin.lat, pin.lng);
                return (
                  <button
                    key={pin.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectPin) onSelectPin(pin);
                    }}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center group focus:outline-none"
                    title={`${pin.label} — ${pin.address}`}
                  >
                    <PinSymbol kind={pin.kind} size={pin.kind === "station" ? 28 : 24} />
                    <span className="mt-0.5 whitespace-nowrap rounded bg-slate-900/85 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      {pin.label}
                    </span>
                  </button>
                );
              })}

              {interactivePick && pickedCoords && (
                <div
                  style={{
                    left: `${toPercent(pickedCoords.lat, pickedCoords.lng).x}%`,
                    top: `${toPercent(pickedCoords.lat, pickedCoords.lng).y}%`
                  }}
                  className="absolute -translate-x-1/2 -translate-y-full pointer-events-none"
                >
                  <PinSymbol kind="picked" size={28} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/90 px-3.5 py-2.5 text-xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Map Symbol Guide
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 whitespace-nowrap">
            <Navigation className="h-3.5 w-3.5 text-slate-400" />
            Saved locations only (no live GPS)
          </span>
        </div>

        <div className="flex flex-wrap items-start gap-x-5 gap-y-2.5">
          {["station", "vending", "pending", "delivered", "frequent", "customer"]
            .filter((kind) =>
              pins.length > 0
                ? pins.some((p) => p.kind === kind)
                : kind !== "vending" && kind !== "delivered"
            )
            .map((kind) => {
              const count = pins.filter((p) => p.kind === kind).length;
              const legendMeta = {
                station: {
                  title: "Aqua Fabz Station",
                  desc: "Main water station HQ"
                },
                vending: {
                  title: "Vending Machine",
                  desc: "Station-owned water kiosk"
                },
                customer: {
                  title: "Customer Pin",
                  desc: "Saved location (no pending order)"
                },
                pending: {
                  title: "Open Delivery",
                  desc: "Waiting / out for delivery"
                },
                delivered: {
                  title: "Delivered",
                  desc: "Delivery completed"
                },
                frequent: {
                  title: "Frequent Area",
                  desc: "2+ completed deliveries"
                }
              }[kind];
              return (
                <div key={kind} className="inline-flex items-start gap-2">
                  <div className="pt-0.5">
                    <PinSymbol kind={kind} size={20} />
                  </div>
                  <div className="leading-tight">
                    <div className="font-semibold text-slate-800">
                      {legendMeta.title}
                      {count > 0 && (
                        <span className="ml-1 font-mono text-[11px] font-medium text-slate-500 tabular-nums">
                          ({count})
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {legendMeta.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          {interactivePick && (
            <div className="inline-flex items-start gap-2">
              <div className="pt-0.5">
                <PinSymbol kind="picked" size={20} />
              </div>
              <div className="leading-tight">
                <div className="font-semibold text-sky-800">Selected Pin</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Click map or drag to move
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { LocationMap };
