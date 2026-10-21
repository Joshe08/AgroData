'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Undo2, Trash2, Sparkles, MapPin, CheckCircle2, Info, Move, Layers, Navigation } from 'lucide-react';

export interface FincaPerimeterDrawerProps {
  initialPoints?: { lat: number; lng: number }[];
  centerLat?: number;
  centerLng?: number;
  targetHectareas?: number;
  onPointsChange: (points: { lat: number; lng: number }[], computedAreaHa: number) => void;
  height?: string;
}

// Cálculo geodésico de área de polígono en hectáreas (WGS84 esférico)
export function calculatePolygonAreaHa(coords: { lat: number; lng: number }[]): number {
  if (coords.length < 3) return 0;
  const R = 6378137; // Radio ecuatorial terrestre en metros
  let total = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    const p1 = coords[i];
    const p2 = coords[j];
    const x1 = (p1.lng * Math.PI) / 180;
    const y1 = (p1.lat * Math.PI) / 180;
    const x2 = (p2.lng * Math.PI) / 180;
    const y2 = (p2.lat * Math.PI) / 180;
    total += (x2 - x1) * (2 + Math.sin(y1) + Math.sin(y2));
  }
  const areaM2 = Math.abs((total * R * R) / 2);
  return parseFloat((areaM2 / 10000).toFixed(2));
}

// Genera un polígono cuadrangular inicial centrado
function generateTargetSquare(centerLat: number, centerLng: number, ha: number) {
  const safeHa = ha && ha > 0 ? ha : 10;
  const sideMeters = Math.sqrt(safeHa * 10000);
  const deltaLat = (sideMeters / 111320) / 2;
  const deltaLng = (sideMeters / (111320 * Math.cos((centerLat * Math.PI) / 180))) / 2;

  return [
    { lat: parseFloat((centerLat + deltaLat).toFixed(6)), lng: parseFloat((centerLng - deltaLng).toFixed(6)) },
    { lat: parseFloat((centerLat + deltaLat).toFixed(6)), lng: parseFloat((centerLng + deltaLng).toFixed(6)) },
    { lat: parseFloat((centerLat - deltaLat).toFixed(6)), lng: parseFloat((centerLng + deltaLng).toFixed(6)) },
    { lat: parseFloat((centerLat - deltaLat).toFixed(6)), lng: parseFloat((centerLng - deltaLng).toFixed(6)) },
  ];
}

// Icono interactivo para los vértices arrastrables
function createDraggableVertexIcon(number: number) {
  return L.divIcon({
    className: 'draggable-perimeter-vertex',
    html: `
      <div style="
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: #10b981;
        border: 2.5px solid #ffffff;
        color: #042f2e;
        font-size: 11px;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 10px rgba(16, 185, 129, 0.8), 0 3px 8px rgba(0,0,0,0.5);
        cursor: grab;
        transition: transform 0.15s ease;
        user-select: none;
      ">
        ${number}
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

export default function LeafletFincaPerimeterDrawerInner({
  initialPoints = [],
  centerLat = 10.4631,
  centerLng = -73.2532,
  targetHectareas,
  onPointsChange,
  height = '440px',
}: FincaPerimeterDrawerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const pointsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const polylineLayerRef = useRef<L.Polyline | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  // Ref que siempre tiene los puntos actuales sin pasar por closure de useEffect
  const pointsRef = useRef<{ lat: number; lng: number }[]>([]);
  const onPointsChangeRef = useRef(onPointsChange);
  // Guardar el centro inicial en refs para que no cause re-init del mapa al cambiar el formulario
  const initCenterLatRef = useRef(centerLat);
  const initCenterLngRef = useRef(centerLng);

  const hasInitial = initialPoints && initialPoints.length >= 3;
  // Modo de interacción: 'pan' (arrastrar mapa libremente) o 'draw' (clic añade vértices)
  // Si no hay puntos aún, iniciamos en modo 'draw' para que al hacer clic marque de inmediato el perímetro real
  const [drawMode, setDrawMode] = useState<'pan' | 'draw'>(hasInitial ? 'pan' : 'draw');

  const [points, setPoints] = useState<{ lat: number; lng: number }[]>(() => {
    if (initialPoints && initialPoints.length >= 3) return initialPoints;
    return [];
  });

  const [liveAreaHa, setLiveAreaHa] = useState<number>(() => calculatePolygonAreaHa(points));
  const [mapType, setMapType] = useState<'satellite' | 'streets'>('satellite');

  // Sincronizar si initialPoints cambia desde el exterior
  useEffect(() => {
    if (initialPoints && initialPoints.length >= 3) {
      setPoints(initialPoints);
      setLiveAreaHa(calculatePolygonAreaHa(initialPoints));
      if (mapInstanceRef.current) {
        const bounds = L.latLngBounds(initialPoints.map((p) => [p.lat, p.lng]));
        if (bounds.isValid()) {
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
        }
      }
    }
  }, [initialPoints]);

  // Mantener refs sincronizadas (sin causar re-renders ni re-inits del mapa)
  useEffect(() => {
    pointsRef.current = points;
  }, [points]);
  useEffect(() => {
    onPointsChangeRef.current = onPointsChange;
  }, [onPointsChange]);

  // Inicializar Leaflet UNA SOLA VEZ — deps vacías para que no se destruya al cambiar el formulario
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Usar el centro inicial almacenado en ref — no se ve afectado por cambios del formulario
    const startLat = pointsRef.current.length > 0 ? pointsRef.current[0].lat : initCenterLatRef.current;
    const startLng = pointsRef.current.length > 0 ? pointsRef.current[0].lng : initCenterLngRef.current;

    const map = L.map(mapContainerRef.current, {
      center: [startLat, startLng],
      zoom: 15,
      zoomControl: false,
      dragging: true,
      scrollWheelZoom: true,
    });

    // Asegurar controles de navegación activos
    map.dragging.enable();
    map.scrollWheelZoom.enable();

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const satTileLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      subdomains: ['0', '1', '2', '3'],
      maxZoom: 20,
      maxNativeZoom: 19,
      keepBuffer: 6,
      attribution: '&copy; Google Maps / Imagery',
    }).addTo(map);
    tileLayerRef.current = satTileLayer;

    const pointsGroup = L.layerGroup().addTo(map);
    pointsLayerGroupRef.current = pointsGroup;

    mapInstanceRef.current = map;

    // Centrar suavemente al primer polígono disponible
    if (pointsRef.current.length >= 3) {
      const bounds = L.latLngBounds(pointsRef.current.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
    }

    const ro = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    ro.observe(mapContainerRef.current);

    const t1 = setTimeout(() => map.invalidateSize(), 60);
    const t2 = setTimeout(() => map.invalidateSize(), 200);
    const t3 = setTimeout(() => map.invalidateSize(), 500);

    // Teardown seguro sin errores al retroceder
    return () => {
      ro.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.stop();
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch {
          // Teardown seguro
        }
        mapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manejador de clics para agregar puntos cuando drawMode === 'draw'
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (drawMode !== 'draw') return;
      const newPt = {
        lat: parseFloat(e.latlng.lat.toFixed(6)),
        lng: parseFloat(e.latlng.lng.toFixed(6)),
      };
      // Calcular fuera del updater para evitar setState-dentro-de-render
      const next = [...pointsRef.current, newPt];
      const newArea = calculatePolygonAreaHa(next);
      setPoints(next);
      setLiveAreaHa(newArea);
      // Diferir callback externo al siguiente tick (evita el error de React)
      setTimeout(() => onPointsChangeRef.current(next, newArea), 0);
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [drawMode]);

  // Alternar capa base (satélite / calles)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    if (mapType === 'satellite') {
      const satLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 20,
        maxNativeZoom: 19,
        keepBuffer: 6,
        attribution: '&copy; Google Maps / Imagery',
      }).addTo(map);
      tileLayerRef.current = satLayer;
    } else {
      const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        maxNativeZoom: 18,
        keepBuffer: 6,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
      tileLayerRef.current = streetLayer;
    }

    map.invalidateSize();
  }, [mapType]);

  // ─── Actualizar polígono/polilínea sin recrear markers ───────────────────────
  // Se ejecuta en cada cambio de `points` pero solo actualiza la geometría del
  // polígono existente. Los markers solo se recrean cuando cambia el NÚMERO de puntos.
  const markersRef = useRef<L.Marker[]>([]);
  const prevLengthRef = useRef<number>(-1);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = pointsLayerGroupRef.current;
    if (!map || !group) return;

    const len = points.length;
    const prevLen = prevLengthRef.current;

    // ── Solo reconstruir markers si cambió la cantidad de puntos ──
    if (len !== prevLen) {
      prevLengthRef.current = len;
      group.clearLayers();
      markersRef.current = [];

      points.forEach((pt, idx) => {
        const marker = L.marker([pt.lat, pt.lng], {
          icon: createDraggableVertexIcon(idx + 1),
          draggable: true,
          autoPan: true,
        });

        marker.bindTooltip(
          `<div style="font-family: Inter, sans-serif; font-size: 11px; padding: 2px 4px;">
            <strong>Vértice ${idx + 1}</strong>: Arrastra para mover
          </div>`,
          { direction: 'top', opacity: 0.95 }
        );

        // Durante el arrastre: actualiza el polígono visualmente usando ref
        marker.on('drag', () => {
          const latLng = marker.getLatLng();
          const current = pointsRef.current.map((p, i) =>
            i === idx ? { lat: latLng.lat, lng: latLng.lng } : p
          );
          if (polygonLayerRef.current && current.length >= 3) {
            polygonLayerRef.current.setLatLngs(current.map((p) => [p.lat, p.lng] as [number, number]));
            setLiveAreaHa(calculatePolygonAreaHa(current));
          } else if (polylineLayerRef.current && current.length === 2) {
            polylineLayerRef.current.setLatLngs(current.map((p) => [p.lat, p.lng] as [number, number]));
          }
        });

        // Al soltar: confirma la posición final en el estado
        marker.on('dragend', () => {
          const latLng = marker.getLatLng();
          // Calcular fuera del updater para evitar setState-dentro-de-render
          const updated = [...pointsRef.current];
          updated[idx] = {
            lat: parseFloat(latLng.lat.toFixed(6)),
            lng: parseFloat(latLng.lng.toFixed(6)),
          };
          const newArea = calculatePolygonAreaHa(updated);
          setPoints(updated);
          setLiveAreaHa(newArea);
          // Diferir callback externo al siguiente tick
          setTimeout(() => onPointsChangeRef.current(updated, newArea), 0);
        });

        marker.addTo(group);
        markersRef.current.push(marker);
      });
    } else {
      // Número de puntos igual → solo actualizar posición de markers existentes
      points.forEach((pt, idx) => {
        const m = markersRef.current[idx];
        if (m) m.setLatLng([pt.lat, pt.lng]);
      });
    }

    // ── Actualizar polígono / polilínea ──
    if (polygonLayerRef.current) {
      map.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }
    if (polylineLayerRef.current) {
      map.removeLayer(polylineLayerRef.current);
      polylineLayerRef.current = null;
    }

    // interactive: false permite arrastrar el mapa a través del polígono
    if (points.length >= 3) {
      const polyCoords = points.map((p) => [p.lat, p.lng] as [number, number]);
      const polygon = L.polygon(polyCoords, {
        color: '#10b981',
        weight: 3,
        dashArray: '6, 6',
        fillColor: '#10b981',
        fillOpacity: 0.28,
        interactive: false,
      });
      polygon.addTo(map);
      polygonLayerRef.current = polygon;
    } else if (points.length === 2) {
      const lineCoords = points.map((p) => [p.lat, p.lng] as [number, number]);
      const line = L.polyline(lineCoords, {
        color: '#10b981',
        weight: 2.5,
        dashArray: '4, 4',
        interactive: false,
      });
      line.addTo(map);
      polylineLayerRef.current = line;
    }

    setLiveAreaHa(calculatePolygonAreaHa(points));
  }, [points]);

  const handleUndo = () => {
    const next = pointsRef.current.slice(0, -1);
    const newArea = calculatePolygonAreaHa(next);
    setPoints(next);
    setLiveAreaHa(newArea);
    setTimeout(() => onPointsChangeRef.current(next, newArea), 0);
  };

  const handleClear = () => {
    setPoints([]);
    setLiveAreaHa(0);
    onPointsChange([], 0);
  };

  const handleResetToTarget = () => {
    const square = generateTargetSquare(centerLat, centerLng, targetHectareas || 10);
    setPoints(square);
    const newArea = calculatePolygonAreaHa(square);
    setLiveAreaHa(newArea);
    onPointsChange(square, newArea);

    if (mapInstanceRef.current) {
      const bounds = L.latLngBounds(square.map((p) => [p.lat, p.lng]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--color-border)', boxShadow: '0 4px 16px rgba(0,0,0,0.25)', background: '#0b1120', touchAction: 'none' }}>
      {/* Contenedor Leaflet */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#0b1120', touchAction: 'none' }} />

      {/* Barra Superior con Métricas y Controles de Vértices */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          right: 10,
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {/* Indicador de Área Determinada en Tiempo Real */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(16, 185, 129, 0.5)',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            pointerEvents: 'auto',
            maxWidth: '100%',
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#34d399', fontWeight: 700 }}>
            <Move size={14} />
            <span>{points.length} {points.length === 1 ? 'punto' : 'puntos'}</span>
          </div>

          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)' }} />

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Superficie:</span>
            <span style={{ color: '#38bdf8', fontWeight: 800, fontSize: 13 }}>
              {liveAreaHa.toFixed(2)} ha
            </span>
            <span style={{ color: 'var(--color-text-subtle)', fontSize: 10 }}>
              ({(liveAreaHa * 10000).toLocaleString('es-CO')} m²)
            </span>
          </div>
        </div>

        {/* Botones de Acción */}
        <div style={{ display: 'flex', gap: 6, pointerEvents: 'auto', flexWrap: 'wrap' }}>
          {/* Alternar modo Arrastrar Mapa vs Marcar Puntos */}
          <button
            type="button"
            onClick={() => setDrawMode(drawMode === 'pan' ? 'draw' : 'pan')}
            className="btn-secondary"
            style={{
              padding: '5px 10px',
              fontSize: 11,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: drawMode === 'pan' ? '#10b981' : 'rgba(15, 23, 42, 0.92)',
              color: drawMode === 'pan' ? '#022c22' : '#34d399',
              borderColor: '#10b981',
              fontWeight: 700,
            }}
            title={drawMode === 'pan' ? 'Modo Mover Mapa activo: puedes arrastrar y navegar libremente' : 'Modo Marcar activo: haz clic para añadir nuevos vértices'}
          >
            {drawMode === 'pan' ? <Navigation size={12} /> : <MapPin size={12} />}
            <span>{drawMode === 'pan' ? 'Mover Mapa' : '+ Añadir Punto'}</span>
          </button>

          <button
            type="button"
            onClick={() => setMapType(mapType === 'satellite' ? 'streets' : 'satellite')}
            className="btn-secondary"
            style={{ padding: '5px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(15, 23, 42, 0.92)', color: '#94a3b8' }}
            title="Cambiar capa de mapa"
          >
            <Layers size={12} />
            <span>{mapType === 'satellite' ? 'Satelital' : 'Calles'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetToTarget}
            className="btn-secondary"
            style={{ padding: '5px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(15, 23, 42, 0.92)', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
            title="Generar polígono de referencia con los hectáreas indicados"
          >
            <Sparkles size={12} />
            <span>Ajustar a {targetHectareas || 10} ha</span>
          </button>

          <button
            type="button"
            onClick={handleUndo}
            disabled={points.length === 0}
            className="btn-secondary"
            style={{ padding: '5px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(15, 23, 42, 0.92)', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.4)', opacity: points.length === 0 ? 0.5 : 1 }}
            title="Deshacer último punto"
          >
            <Undo2 size={12} />
            <span>Deshacer</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={points.length === 0}
            className="btn-secondary"
            style={{ padding: '5px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(15, 23, 42, 0.92)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.4)', opacity: points.length === 0 ? 0.5 : 1 }}
            title="Limpiar todos los puntos"
          >
            <Trash2 size={12} />
            <span>Limpiar</span>
          </button>
        </div>
      </div>

      {/* Guía Inferior Profesional */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 8,
          padding: '5px 12px',
          fontSize: 11,
          color: 'var(--color-text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          maxWidth: 'calc(100% - 100px)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        <Info size={13} color="#34d399" style={{ flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {drawMode === 'pan'
            ? 'Arrastra cualquier parte del mapa para navegar. Arrastra los puntos verdes numerados para encajar linderos.'
            : 'Haz clic en el mapa satelital para agregar nuevos vértices al polígono.'}
        </span>
      </div>
    </div>
  );
}
