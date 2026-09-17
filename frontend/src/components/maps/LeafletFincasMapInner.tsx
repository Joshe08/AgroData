'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, MapPin, Navigation, Eye } from 'lucide-react';

export interface FincaMapItem {
  id: string | number;
  nombre: string;
  ubicacion: string;
  hectareas: number;
  latitude?: number | null;
  longitude?: number | null;
  lotes?: any[];
}

export interface FincasMapOverviewProps {
  fincas: FincaMapItem[];
  onSelectFinca?: (finca: FincaMapItem) => void;
  height?: string;
}

const createFincaMarkerIcon = (label: string, color = '#16a34a') => {
  return L.divIcon({
    className: 'custom-finca-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.6));">
        <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid ${color}; border-radius: 6px; padding: 3px 8px; font-size: 11px; font-weight: 700; color: #ffffff; white-space: nowrap; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: ${color};"></span>
          ${label}
        </div>
        <svg width="32" height="38" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 0C8.05888 0 0 8.05888 0 18C0 28.5 18 44 18 44C18 44 36 28.5 36 18C36 8.05888 27.9411 0 18 0Z" fill="${color}"/>
          <circle cx="18" cy="17" r="7" fill="#ffffff"/>
          <circle cx="18" cy="17" r="4" fill="${color}"/>
        </svg>
      </div>
    `,
    iconSize: [120, 64],
    iconAnchor: [60, 64],
    popupAnchor: [0, -60],
  });
};

export default function LeafletFincasMapInner({
  fincas,
  onSelectFinca,
  height = '500px',
}: FincasMapOverviewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('satellite');
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const streetTiles = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const satelliteTiles = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const satelliteLabels = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
  const labelsLayerRef = useRef<L.TileLayer | null>(null);

  const fincasWithCoords = fincas.filter(
    (f) => f.latitude != null && f.longitude != null && !isNaN(Number(f.latitude)) && !isNaN(Number(f.longitude))
  );

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center in Cesar default
    const map = L.map(mapContainerRef.current, {
      center: [10.4631, -73.2532],
      zoom: 9,
      zoomControl: false,
      scrollWheelZoom: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const initialTiles = L.tileLayer(mapType === 'satellite' ? satelliteTiles : streetTiles, {
      attribution: '&copy; OpenStreetMap / Esri',
      maxZoom: 19,
    }).addTo(map);
    tileLayerRef.current = initialTiles;

    const markersGroup = L.featureGroup();

    fincasWithCoords.forEach((finca) => {
      const lat = Number(finca.latitude);
      const lng = Number(finca.longitude);

      const marker = L.marker([lat, lng], {
        icon: createFincaMarkerIcon(finca.nombre),
      });

      const lotesCount = Array.isArray(finca.lotes) ? finca.lotes.length : 0;
      const popupContent = document.createElement('div');
      popupContent.style.cssText = 'padding: 8px 6px; font-family: Inter, sans-serif; min-width: 210px;';
      popupContent.innerHTML = `
        <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">${finca.nombre}</div>
        <div style="font-size: 12px; color: #475569; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
          📍 ${finca.ubicacion || 'Departamento del Cesar'}
        </div>
        <div style="font-size: 11px; color: #64748b; margin-bottom: 8px; font-family: monospace;">
          GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}
        </div>
        <div style="display: flex; gap: 8px; margin-bottom: 10px; font-size: 11px; font-weight: 600;">
          <span style="background: #e2e8f0; padding: 3px 8px; border-radius: 6px; color: #334155;">${finca.hectareas} ha</span>
          <span style="background: #e0f2fe; padding: 3px 8px; border-radius: 6px; color: #0369a1;">${lotesCount} parcelas</span>
        </div>
      `;

      if (onSelectFinca) {
        const btn = document.createElement('button');
        btn.textContent = 'Ver detalles de finca';
        btn.style.cssText = 'width: 100%; background: #16a34a; color: #fff; border: none; border-radius: 6px; padding: 7px; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.2s;';
        btn.onclick = () => onSelectFinca(finca);
        popupContent.appendChild(btn);
      }

      marker.bindPopup(popupContent);
      marker.addTo(markersGroup);
    });

    markersGroup.addTo(map);

    if (fincasWithCoords.length > 0) {
      map.fitBounds(markersGroup.getBounds(), { padding: [50, 50], maxZoom: 15 });
    }

    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [fincas]);

  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    tileLayerRef.current.setUrl(mapType === 'satellite' ? satelliteTiles : streetTiles);

    if (mapType === 'satellite') {
      if (!labelsLayerRef.current) {
        labelsLayerRef.current = L.tileLayer(satelliteLabels, { maxZoom: 19 });
      }
      if (!mapInstanceRef.current.hasLayer(labelsLayerRef.current)) {
        labelsLayerRef.current.addTo(mapInstanceRef.current);
      }
    } else {
      if (labelsLayerRef.current && mapInstanceRef.current.hasLayer(labelsLayerRef.current)) {
        mapInstanceRef.current.removeLayer(labelsLayerRef.current);
      }
    }
  }, [mapType]);

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
      {/* Layer Toggle */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000 }}>
        <button
          type="button"
          onClick={() => setMapType(m => m === 'streets' ? 'satellite' : 'streets')}
          style={{
            height: 38,
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 10,
            color: mapType === 'satellite' ? '#fbbf24' : '#ffffff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          <Layers size={15} />
          <span>{mapType === 'satellite' ? 'Vista Satélite' : 'Vista Mapa'}</span>
        </button>
      </div>

      {/* Map */}
      <div ref={mapContainerRef} style={{ width: '100%', height, background: '#1e293b' }} />

      {/* Bottom Summary Badge */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 8,
          padding: '6px 14px',
          fontSize: 12,
          color: 'var(--color-text)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <MapPin size={14} color="#4ade80" />
        <span>
          <strong>{fincasWithCoords.length}</strong> de <strong>{fincas.length}</strong> fincas geolocalizadas en el Cesar
        </span>
      </div>
    </div>
  );
}
