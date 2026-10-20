'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers } from 'lucide-react';
import { Finca } from '@/store/fincasStore';

export interface FincasMapOverviewProps {
  fincas: Finca[];
  onSelectFinca?: (finca: Finca) => void;
  height?: string;
}

const createFincaMarkerIcon = (label: string, color = '#10b981') => {
  const safeLabel = label.length > 18 ? label.slice(0, 16) + '...' : label;

  return L.divIcon({
    className: 'custom-finca-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));">
        <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid ${color}; border-radius: 6px; padding: 3px 8px; font-size: 11px; font-weight: 700; color: #ffffff; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 4px; display: flex; align-items: center; gap: 4px; box-sizing: border-box;" title="${label}">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: ${color}; flex-shrink: 0;"></span>
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${safeLabel}</span>
        </div>
        <svg width="32" height="38" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 0C8.05888 0 0 8.05888 0 18C0 28.5 18 44 18 44C18 44 36 28.5 36 18C36 8.05888 27.9411 0 18 0Z" fill="${color}"/>
          <circle cx="18" cy="17" r="7" fill="#ffffff"/>
          <circle cx="18" cy="17" r="4" fill="${color}"/>
        </svg>
      </div>
    `,
    iconSize: [140, 64],
    iconAnchor: [70, 64],
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

  const fincasWithCoords = fincas.filter(
    (f) => f.latitude != null && f.longitude != null && !isNaN(Number(f.latitude)) && !isNaN(Number(f.longitude))
  );

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [10.4631, -73.2532],
      zoom: 9,
      zoomControl: false,
      scrollWheelZoom: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Google Hybrid libre de 404s y parches
    const satLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      subdomains: ['0', '1', '2', '3'],
      maxZoom: 20,
      maxNativeZoom: 19,
      keepBuffer: 6,
      attribution: '&copy; Google Maps / Imagery',
    }).addTo(map);
    tileLayerRef.current = satLayer;

    const markersGroup = L.featureGroup();

    fincasWithCoords.forEach((finca) => {
      const lat = Number(finca.latitude);
      const lng = Number(finca.longitude);

      const marker = L.marker([lat, lng], {
        icon: createFincaMarkerIcon(finca.nombre),
      });

      const lotesCount = Array.isArray(finca.lotes) ? finca.lotes.length : 0;
      const popupContent = document.createElement('div');
      popupContent.style.cssText = 'padding: 8px 6px; font-family: Inter, sans-serif; min-width: 190px; max-width: 240px; box-sizing: border-box; word-break: break-word;';
      popupContent.innerHTML = `
        <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">${finca.nombre}</div>
        <div style="font-size: 12px; color: #475569; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
          <span>Ubicación:</span> <strong>${finca.ubicacion || 'Departamento del Cesar'}</strong>
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

    // RESIZEOBSERVER contra parches
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
  }, [fincas]);

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

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--color-border)', background: '#0b1120' }}>
      {/* Layer Toggle */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000 }}>
        <button
          type="button"
          onClick={() => setMapType((m) => (m === 'streets' ? 'satellite' : 'streets'))}
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
          <Layers size={14} />
          <span>{mapType === 'satellite' ? 'Satélite' : 'Mapa Calles'}</span>
        </button>
      </div>

      <div ref={mapContainerRef} style={{ width: '100%', height, background: '#0b1120' }} />
    </div>
  );
}
