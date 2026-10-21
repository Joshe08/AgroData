'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, MapPin, Compass, Eye, CheckCircle2, AlertTriangle, Droplets, Info } from 'lucide-react';
import { Finca, Lote } from '@/store/fincasStore';

export interface FincaParcelasMapProps {
  finca: Finca;
  lotes: Lote[];
  selectedLoteId?: string | number | null;
  onSelectLote?: (lote: Lote) => void;
  height?: string;
}

const statusStyles: Record<string, { fill: string; stroke: string; label: string }> = {
  ACTIVO: { fill: '#22c55e', stroke: '#15803d', label: 'En Producción' },
  PASTOREO: { fill: '#f97316', stroke: '#c2410c', label: 'Pastoreo Rotacional' },
  PREPARACION: { fill: '#eab308', stroke: '#a16207', label: 'En Preparación' },
  DESCANSO: { fill: '#a8a29e', stroke: '#57534e', label: 'En Descanso / Barbecho' },
  RIEGO: { fill: '#0ea5e9', stroke: '#0369a1', label: 'Riego Intensivo' },
  RESERVA: { fill: '#166534', stroke: '#14532d', label: 'Reserva / Ronda Hídrica' },
};

// Recorte de polígono Sutherland-Hodgman contra un semiplano en 2D (Lat = eje 0, Lng = eje 1)
function clipPolygonAgainstLine(
  polygon: [number, number][],
  axis: 0 | 1,
  value: number,
  isGreater: boolean
): [number, number][] {
  if (polygon.length === 0) return [];
  const output: [number, number][] = [];

  const isInside = (pt: [number, number]) =>
    isGreater ? pt[axis] >= value : pt[axis] <= value;

  const intersect = (
    p1: [number, number],
    p2: [number, number]
  ): [number, number] => {
    const dAxis = p2[axis] - p1[axis];
    if (Math.abs(dAxis) < 1e-9) return p1;
    const t = (value - p1[axis]) / dAxis;
    const otherAxis = axis === 0 ? 1 : 0;
    const otherVal = p1[otherAxis] + t * (p2[otherAxis] - p1[otherAxis]);
    return axis === 0 ? [value, otherVal] : [otherVal, value];
  };

  let prev = polygon[polygon.length - 1];
  for (let i = 0; i < polygon.length; i++) {
    const curr = polygon[i];
    if (isInside(curr)) {
      if (!isInside(prev)) {
        output.push(intersect(prev, curr));
      }
      output.push(curr);
    } else if (isInside(prev)) {
      output.push(intersect(prev, curr));
    }
    prev = curr;
  }

  return output;
}

// Subdivide el polígono real de la finca de forma proporcional a las hectáreas de cada parcela
function partitionPolygonProportional(
  fincaPolygon: [number, number][],
  items: { id: string | number; areaHa: number }[],
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }
): Map<string | number, [number, number][]> {
  const result = new Map<string | number, [number, number][]>();
  if (items.length === 0) return result;

  if (items.length === 1) {
    result.set(items[0].id, fincaPolygon);
    return result;
  }

  const { minLat, maxLat, minLng, maxLng } = bounds;
  const widthLng = maxLng - minLng;
  const heightLat = maxLat - minLat;

  // Elegir eje de mayor longitud para trazar las divisiones
  const axis: 0 | 1 = heightLat >= widthLng ? 0 : 1;
  const minVal = axis === 0 ? minLat : minLng;
  const maxVal = axis === 0 ? maxLat : maxLng;
  const totalWeight = items.reduce((s, it) => s + Math.max(it.areaHa, 0.1), 0);

  let currentVal = minVal;
  const range = maxVal - minVal;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const weight = Math.max(item.areaHa, 0.1);
    const fraction = weight / totalWeight;
    const nextVal = i === items.length - 1 ? maxVal : currentVal + range * fraction;

    // Recortar estrictamente dentro del polígono delimitado de la finca
    let slice = clipPolygonAgainstLine(fincaPolygon, axis, currentVal, true);
    slice = clipPolygonAgainstLine(slice, axis, nextVal, false);

    if (slice.length >= 3) {
      result.set(item.id, slice);
    } else {
      result.set(item.id, fincaPolygon);
    }

    currentVal = nextVal;
  }

  return result;
}

// Genera un polígono cuadrangular base para una finca según sus hectáreas
function generateFincaBasePolygon(centerLat: number, centerLng: number, ha: number): [number, number][] {
  const safeHa = ha && ha > 0 ? ha : 10;
  const sideMeters = Math.sqrt(safeHa * 10000);
  const deltaLat = (sideMeters / 111320) / 2;
  const deltaLng = (sideMeters / (111320 * Math.cos((centerLat * Math.PI) / 180))) / 2;

  return [
    [centerLat + deltaLat, centerLng - deltaLng],
    [centerLat + deltaLat, centerLng + deltaLng],
    [centerLat - deltaLat, centerLng + deltaLng],
    [centerLat - deltaLat, centerLng - deltaLng],
  ];
}

export default function LeafletFincaParcelasMapInner({
  finca,
  lotes,
  selectedLoteId,
  onSelectLote,
  height = '540px',
}: FincaParcelasMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonsGroupRef = useRef<L.FeatureGroup | null>(null);
  const fincaPerimeterGroupRef = useRef<L.FeatureGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [mapType, setMapType] = useState<'satellite' | 'streets'>('satellite');
  const [showLegend, setShowLegend] = useState(true);

  const lastFittedFincaIdRef = useRef<string | number | null>(null);
  const lastPerimeterHashRef = useRef<string>('');

  const baseLat = finca.latitude != null && !isNaN(Number(finca.latitude)) ? Number(finca.latitude) : 10.4631;
  const baseLng = finca.longitude != null && !isNaN(Number(finca.longitude)) ? Number(finca.longitude) : -73.2532;

  // 1. Perímetro exacto de la finca
  const effectiveFincaPerimeter = useMemo<[number, number][]>(() => {
    if (finca.coordenadas) {
      let coords: [number, number][] = [];
      if (Array.isArray(finca.coordenadas)) {
        coords = finca.coordenadas.map((c: any) => [
          Array.isArray(c) ? Number(c[0]) : Number(c.lat),
          Array.isArray(c) ? Number(c[1]) : Number(c.lng),
        ]);
      } else if (typeof finca.coordenadas === 'string') {
        try {
          const parsed = JSON.parse(finca.coordenadas);
          if (Array.isArray(parsed)) {
            coords = parsed.map((c: any) => [
              Array.isArray(c) ? Number(c[0]) : Number(c.lat),
              Array.isArray(c) ? Number(c[1]) : Number(c.lng),
            ]);
          }
        } catch {
          coords = [];
        }
      }
      if (coords.length >= 3) return coords;
    }

    return generateFincaBasePolygon(baseLat, baseLng, finca.hectareas || 10);
  }, [finca.coordenadas, finca.hectareas, baseLat, baseLng]);

  // 2. Bounding Box y Centroide
  const fincaBounds = useMemo(() => {
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    let sumLat = 0, sumLng = 0;

    effectiveFincaPerimeter.forEach(([lat, lng]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      sumLat += lat;
      sumLng += lng;
    });

    const centroid: [number, number] = [
      sumLat / effectiveFincaPerimeter.length,
      sumLng / effectiveFincaPerimeter.length,
    ];

    return { minLat, maxLat, minLng, maxLng, centroid };
  }, [effectiveFincaPerimeter]);

  // Métricas de cabida de la finca
  const fincaTotalHa = Math.max(finca.hectareas || 10, 0.1);
  const totalLotesHa = useMemo(() => lotes.reduce((s, l) => s + (l.hectareas || 0), 0), [lotes]);
  const freeFincaHa = Math.max(0, parseFloat((fincaTotalHa - totalLotesHa).toFixed(2)));

  // 3. Distribución PROPORCIONAL EXACTA DENTRO DEL PERÍMETRO REAL DEL PREDIO
  const { parsedLotesWithCoords, freeAreaPolygon } = useMemo(() => {
    // Si la suma de lotes es menor que el área de la finca, incluimos el área libre como un ítem de partición
    // para que los lotes NO rellenen la totalidad de la finca si miden menos.
    const partitionItems: { id: string | number; areaHa: number }[] = lotes.map((l) => ({
      id: l.id,
      areaHa: Math.max(l.hectareas || 1, 0.1),
    }));

    if (freeFincaHa > 0.1) {
      partitionItems.push({
        id: '__FREE_AREA__',
        areaHa: freeFincaHa,
      });
    }

    const polygonMap = partitionPolygonProportional(effectiveFincaPerimeter, partitionItems, fincaBounds);

    const lotesResult = lotes.map((lote) => {
      let coords: [number, number][] | null = null;

      // Si el lote tiene coordenadas explícitas válidas
      if (lote.coordenadas) {
        if (Array.isArray(lote.coordenadas) && lote.coordenadas.length >= 3) {
          coords = lote.coordenadas.map((c: any) => [
            Array.isArray(c) ? Number(c[0]) : Number(c.lat),
            Array.isArray(c) ? Number(c[1]) : Number(c.lng),
          ]);
        } else if (typeof lote.coordenadas === 'string') {
          try {
            const parsed = JSON.parse(lote.coordenadas);
            if (Array.isArray(parsed) && parsed.length >= 3) {
              coords = parsed.map((c: any) => [
                Array.isArray(c) ? Number(c[0]) : Number(c.lat),
                Array.isArray(c) ? Number(c[1]) : Number(c.lng),
              ]);
            }
          } catch {
            coords = null;
          }
        }
      }

      // Si no tiene coordenadas propias, adopta su porción proporcional exacta dentro del perímetro
      if (!coords || coords.length < 3) {
        coords = polygonMap.get(lote.id) || null;
      }

      const percentOfFinca = (((lote.hectareas || 1) / fincaTotalHa) * 100).toFixed(1);

      return {
        ...lote,
        polygonCoords: coords || effectiveFincaPerimeter,
        percentOfFinca,
      };
    });

    const freePolyCoords = polygonMap.get('__FREE_AREA__') || null;

    return {
      parsedLotesWithCoords: lotesResult,
      freeAreaPolygon: freePolyCoords,
    };
  }, [lotes, effectiveFincaPerimeter, fincaBounds, fincaTotalHa, freeFincaHa]);

  // Inicializar Leaflet y ResizeObserver
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialCenter = fincaBounds.centroid;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 15,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const satTileLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      subdomains: ['0', '1', '2', '3'],
      maxZoom: 20,
      maxNativeZoom: 19,
      keepBuffer: 6,
      attribution: '&copy; Google Maps / Imagery',
    }).addTo(map);
    tileLayerRef.current = satTileLayer;

    const fincaPerimeterGroup = L.featureGroup().addTo(map);
    fincaPerimeterGroupRef.current = fincaPerimeterGroup;

    const polygonsGroup = L.featureGroup().addTo(map);
    polygonsGroupRef.current = polygonsGroup;

    mapInstanceRef.current = map;

    const ro = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    ro.observe(mapContainerRef.current);

    const t1 = setTimeout(() => map.invalidateSize(), 60);
    const t2 = setTimeout(() => map.invalidateSize(), 200);
    const t3 = setTimeout(() => map.invalidateSize(), 500);

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
  }, []);

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

  // Renderizar la Zona Perimetral de la Finca y el Área Libre
  useEffect(() => {
    const map = mapInstanceRef.current;
    const perimeterGroup = fincaPerimeterGroupRef.current;
    if (!map || !perimeterGroup) return;

    perimeterGroup.clearLayers();

    // 1. Polígono perimetral de la finca (Las 23 ha completas)
    const fincaPoly = L.polygon(effectiveFincaPerimeter, {
      color: '#10b981',
      weight: 3,
      dashArray: '8, 6',
      fillColor: '#10b981',
      fillOpacity: 0.06,
    });

    fincaPoly.bindTooltip(
      `
      <div style="font-family: Inter, sans-serif; padding: 4px; max-width: 220px; box-sizing: border-box;">
        <div style="font-size: 11px; font-weight: 700; color: #10b981; text-transform: uppercase;">Perímetro Global del Predio</div>
        <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${finca.nombre}</div>
        <div style="font-size: 11px; color: #475569; margin-top: 2px;">Área Total: ${finca.hectareas} ha</div>
      </div>
      `,
      { sticky: true, opacity: 0.95 }
    );

    fincaPoly.addTo(perimeterGroup);

    // 2. Área Libre / Remanente de la Finca (Si los lotes no cubren el 100% de las 23 ha)
    if (freeAreaPolygon && freeFincaHa > 0.1) {
      const freePoly = L.polygon(freeAreaPolygon, {
        color: '#64748b',
        weight: 1.5,
        dashArray: '5, 5',
        fillColor: '#334155',
        fillOpacity: 0.22,
      });

      freePoly.bindTooltip(
        `
        <div style="font-family: Inter, sans-serif; padding: 4px; max-width: 220px; box-sizing: border-box;">
          <div style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Área Libre / Sin Parcelar</div>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px;">${freeFincaHa} ha disponibles</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${(((freeFincaHa) / fincaTotalHa) * 100).toFixed(1)}% del predio libre para pastoreo o nuevos lotes</div>
        </div>
        `,
        { sticky: true, opacity: 0.95 }
      );

      freePoly.addTo(perimeterGroup);

      // Etiqueta del Área Libre compacta
      const freeBounds = freePoly.getBounds();
      const freeCenter = freeBounds.getCenter();
      const freeLabel = L.marker(freeCenter, {
        icon: L.divIcon({
          className: 'free-area-label',
          html: `
            <div style="background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px); border: 1px dashed #64748b; border-radius: 5px; padding: 1px 5px; color: #94a3b8; text-align: center; max-width: 95px; box-sizing: border-box; overflow: hidden; pointer-events: none;">
              <div style="font-size: 8px; font-weight: 700; text-transform: uppercase;">Libre</div>
              <div style="font-size: 9px; font-weight: 700; color: #e2e8f0; white-space: nowrap;">${freeFincaHa} ha</div>
            </div>
          `,
          iconSize: [95, 26],
          iconAnchor: [47, 13],
        }),
      });
      freeLabel.addTo(perimeterGroup);
    }

    // 3. Marcador de Sede / Entrada en el centroide de la finca (compacto)
    const safeFincaName = finca.nombre.length > 14 ? finca.nombre.slice(0, 12) + '...' : finca.nombre;
    const fincaIcon = L.divIcon({
      className: 'finca-hq-marker',
      html: `
        <div style="background: rgba(15, 23, 42, 0.95); border: 1.5px solid #10b981; border-radius: 6px; padding: 2px 6px; color: #ffffff; font-size: 10px; font-weight: 700; max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; gap: 5px; box-shadow: 0 4px 12px rgba(0,0,0,0.6); box-sizing: border-box;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981; flex-shrink: 0;"></span>
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${safeFincaName}</span>
        </div>
      `,
      iconSize: [110, 26],
      iconAnchor: [55, 28],
    });

    L.marker(fincaBounds.centroid, { icon: fincaIcon }).addTo(perimeterGroup);
  }, [effectiveFincaPerimeter, finca.nombre, finca.hectareas, fincaBounds, freeAreaPolygon, freeFincaHa, fincaTotalHa]);

  // Renderizar las parcelas / lotes con sus proporciones exactas y etiquetas compactas
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = polygonsGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    parsedLotesWithCoords.forEach((lote) => {
      const st = statusStyles[lote.status || 'ACTIVO'] || statusStyles.ACTIVO;
      const isSelected = String(selectedLoteId) === String(lote.id);

      const polygon = L.polygon(lote.polygonCoords, {
        color: isSelected ? '#38bdf8' : st.stroke,
        weight: isSelected ? 3.5 : 2,
        fillColor: isSelected ? '#38bdf8' : st.fill,
        fillOpacity: isSelected ? 0.70 : 0.48,
        dashArray: isSelected ? '4, 4' : undefined,
      });

      polygon.bindTooltip(
        `
        <div style="font-family: Inter, sans-serif; padding: 2px; max-width: 200px; box-sizing: border-box; word-break: break-word;">
          <div style="font-weight: 700; color: #0f172a; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${lote.nombre}</div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">
            <strong>${lote.hectareas} ha</strong> (${lote.percentOfFinca}% de finca) • ${st.label}
          </div>
          ${lote.cultivoActual ? `<div style="font-size: 11px; color: #15803d; font-weight: 600; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Cultivo: ${lote.cultivoActual}</div>` : ''}
          ${lote.tipoSuelo ? `<div style="font-size: 10px; color: #64748b; margin-top: 2px;">Suelo: ${lote.tipoSuelo}</div>` : ''}
        </div>
        `,
        {
          permanent: false,
          sticky: true,
          direction: 'top',
          opacity: 0.95,
        }
      );

      const bounds = polygon.getBounds();
      const center = bounds.getCenter();
      const safeLoteName = lote.nombre.length > 12 ? lote.nombre.slice(0, 10) + '...' : lote.nombre;

      const labelMarker = L.marker(center, {
        icon: L.divIcon({
          className: 'lote-center-label',
          html: `
            <div style="background: rgba(15, 23, 42, 0.90); backdrop-filter: blur(4px); border: 1px solid ${isSelected ? '#38bdf8' : st.stroke}; border-radius: 5px; padding: 2px 4px; color: #ffffff; text-align: center; max-width: 86px; box-sizing: border-box; overflow: hidden; pointer-events: none; box-shadow: 0 2px 6px rgba(0,0,0,0.5);">
              <div style="font-size: 9px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 78px;" title="${lote.nombre}">
                ${safeLoteName}
              </div>
              <div style="font-size: 9px; color: #38bdf8; font-weight: 700; white-space: nowrap;">
                ${lote.hectareas} ha <span style="color: #94a3b8; font-size: 8px;">(${lote.percentOfFinca}%)</span>
              </div>
            </div>
          `,
          iconSize: [86, 28],
          iconAnchor: [43, 14],
        }),
      });

      polygon.on('mouseover', () => {
        if (!isSelected) {
          polygon.setStyle({ fillOpacity: 0.75, weight: 3 });
        }
      });

      polygon.on('mouseout', () => {
        if (!isSelected) {
          polygon.setStyle({ fillOpacity: 0.48, weight: 2 });
        }
      });

      polygon.on('click', () => {
        if (onSelectLote) {
          onSelectLote(lote);
        }
        map.fitBounds(polygon.getBounds(), { padding: [60, 60], maxZoom: 18 });
      });

      polygon.addTo(group);
      labelMarker.addTo(group);
    });
  }, [parsedLotesWithCoords, selectedLoteId, onSelectLote]);

  // Encuadrar el mapa ÚNICAMENTE cuando cambia la finca o su perímetro
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentFincaId = finca.id;
    const perimeterHash = JSON.stringify(effectiveFincaPerimeter);

    if (
      lastFittedFincaIdRef.current !== currentFincaId ||
      lastPerimeterHashRef.current !== perimeterHash
    ) {
      const fincaPolyBounds = L.latLngBounds(effectiveFincaPerimeter);
      if (fincaPolyBounds.isValid()) {
        map.fitBounds(fincaPolyBounds, { padding: [40, 40], maxZoom: 17 });
      }
      lastFittedFincaIdRef.current = currentFincaId;
      lastPerimeterHashRef.current = perimeterHash;
    }
  }, [finca.id, effectiveFincaPerimeter]);

  return (
    <div style={{ position: 'relative', width: '100%', height, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--color-border)', boxShadow: '0 8px 30px rgba(0,0,0,0.3)', boxSizing: 'border-box', background: '#0b1120' }}>
      {/* Contenedor Leaflet */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#0b1120' }} />

      {/* Indicador de Cabida Proporcional de la Finca */}
      <div
        className="map-finca-badge"
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.94)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: 8,
          padding: '6px 12px',
          fontSize: 11,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          maxWidth: 'calc(100% - 180px)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0 }}></span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Predio: <strong style={{ color: '#34d399' }}>{finca.nombre}</strong> ({finca.hectareas} ha) • Parcelado: <strong style={{ color: '#38bdf8' }}>{totalLotesHa} ha</strong> {freeFincaHa > 0 && <span>• Libre: <strong style={{ color: '#94a3b8' }}>{freeFincaHa} ha</strong></span>}
        </span>
      </div>

      {/* Selector de Capas Flotante */}
      <div
        className="map-layer-selector"
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--color-border)',
          borderRadius: 10,
          padding: 4,
          display: 'flex',
          gap: 4,
        }}
      >
        <button
          type="button"
          onClick={() => setMapType('satellite')}
          style={{
            padding: '5px 10px',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            background: mapType === 'satellite' ? '#22c55e' : 'transparent',
            color: mapType === 'satellite' ? '#000' : 'var(--color-text-muted)',
            transition: 'all 0.2s',
          }}
        >
          Satelital
        </button>
        <button
          type="button"
          onClick={() => setMapType('streets')}
          style={{
            padding: '5px 10px',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            background: mapType === 'streets' ? '#22c55e' : 'transparent',
            color: mapType === 'streets' ? '#000' : 'var(--color-text-muted)',
            transition: 'all 0.2s',
          }}
        >
          Topográfico
        </button>
      </div>

      {/* Leyenda Agronómica Flotante */}
      <div
        className="map-legend-box"
        style={{
          position: 'absolute',
          bottom: 14,
          left: 14,
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.94)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          padding: '8px 12px',
          maxWidth: '260px',
          boxSizing: 'border-box',
          overflow: 'hidden',
          boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
        }}
      >
        <div
          onClick={() => setShowLegend(!showLegend)}
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--color-text-subtle)',
            textTransform: 'uppercase',
            marginBottom: showLegend ? 6 : 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
          }}
        >
          <span>Leyenda de Lotes</span>
          <span style={{ fontSize: 10, color: '#38bdf8' }}>{showLegend ? 'Ocultar' : 'Ver'}</span>
        </div>

        {showLegend && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
              <span style={{ width: 14, height: 2, borderBottom: '2px dashed #10b981', flexShrink: 0 }}></span>
              <span style={{ color: '#34d399', fontWeight: 600, fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Límites de la Finca ({finca.hectareas} ha)</span>
            </div>
            {freeFincaHa > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: 'rgba(51, 65, 85, 0.5)', border: '1px dashed #64748b', flexShrink: 0 }} />
                <span style={{ color: '#94a3b8', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Área Libre ({freeFincaHa} ha)
                </span>
              </div>
            )}
            {Object.entries(statusStyles).map(([key, item]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: item.fill, border: `1px solid ${item.stroke}`, flexShrink: 0 }} />
                <span style={{ color: 'var(--color-text-muted)', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
