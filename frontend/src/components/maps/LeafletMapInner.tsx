'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Crosshair, Layers, MapPin, Loader2 } from 'lucide-react';

export interface MapPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  onChange?: (coords: { latitude: number; longitude: number; address?: string }) => void;
  height?: string;
  readOnly?: boolean;
}

const createCustomPin = (color = '#16a34a') => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="position: relative; width: 36px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));">
        <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 0C8.05888 0 0 8.05888 0 18C0 28.5 18 44 18 44C18 44 36 28.5 36 18C36 8.05888 27.9411 0 18 0Z" fill="${color}"/>
          <circle cx="18" cy="17" r="7" fill="#ffffff"/>
          <circle cx="18" cy="17" r="4" fill="${color}"/>
        </svg>
      </div>
    `,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -40],
  });
};

export default function LeafletMapInner({
  latitude,
  longitude,
  onChange,
  height = '340px',
  readOnly = false,
}: MapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(
    latitude != null && longitude != null ? { lat: Number(latitude), lng: Number(longitude) } : null
  );
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [searchError, setSearchError] = useState('');

  const streetTiles = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const satelliteTiles = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

  const updateLocation = useCallback((lat: number, lng: number, address?: string) => {
    setCurrentCoords({ lat, lng });
    if (onChange) {
      onChange({
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lng.toFixed(6)),
        address,
      });
    }
  }, [onChange]);

  const fetchAddress = async (lat: number, lng: number): Promise<string | undefined> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es`,
        { headers: { 'User-Agent': 'AgroData-App/1.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        const city = data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || data.address?.county;
        const state = data.address?.state;
        if (city && state) return `${city}, ${state}`;
        return data.display_name?.split(',').slice(0, 3).join(',');
      }
    } catch {
      // Ignore geocoding network errors
    }
    return undefined;
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialLat = latitude != null ? Number(latitude) : 10.4631;
    const initialLng = longitude != null ? Number(longitude) : -73.2532;
    const initialZoom = latitude != null && longitude != null ? 14 : 9;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const initialTiles = L.tileLayer(mapType === 'satellite' ? satelliteTiles : streetTiles, {
      attribution: '&copy; OpenStreetMap / Esri',
      maxZoom: 19,
    }).addTo(map);
    tileLayerRef.current = initialTiles;

    if (latitude != null && longitude != null) {
      const marker = L.marker([Number(latitude), Number(longitude)], {
        icon: createCustomPin(),
        draggable: !readOnly,
      }).addTo(map);

      if (!readOnly) {
        marker.on('dragend', async () => {
          const pos = marker.getLatLng();
          const addr = await fetchAddress(pos.lat, pos.lng);
          updateLocation(pos.lat, pos.lng, addr);
        });
      }

      markerRef.current = marker;
    }

    if (!readOnly) {
      map.on('click', async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const newMarker = L.marker([lat, lng], {
            icon: createCustomPin(),
            draggable: true,
          }).addTo(map);

          newMarker.on('dragend', async () => {
            const pos = newMarker.getLatLng();
            const addr = await fetchAddress(pos.lat, pos.lng);
            updateLocation(pos.lat, pos.lng, addr);
          });

          markerRef.current = newMarker;
        }

        const addr = await fetchAddress(lat, lng);
        updateLocation(lat, lng, addr);
      });
    }

    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    tileLayerRef.current.setUrl(mapType === 'satellite' ? satelliteTiles : streetTiles);
  }, [mapType]);

  useEffect(() => {
    if (latitude != null && longitude != null && mapInstanceRef.current) {
      const lat = Number(latitude);
      const lng = Number(longitude);
      setCurrentCoords({ lat, lng });

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], {
          icon: createCustomPin(),
          draggable: !readOnly,
        }).addTo(mapInstanceRef.current);

        if (!readOnly) {
          marker.on('dragend', async () => {
            const pos = marker.getLatLng();
            const addr = await fetchAddress(pos.lat, pos.lng);
            updateLocation(pos.lat, pos.lng, addr);
          });
        }
        markerRef.current = marker;
      }
    }
  }, [latitude, longitude, readOnly, updateLocation]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || !mapInstanceRef.current) return;
    setIsSearching(true);
    setSearchError('');

    try {
      const query = searchQuery.includes('Colombia') || searchQuery.includes('Cesar')
        ? searchQuery
        : `${searchQuery}, Cesar, Colombia`;

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=es`,
        { headers: { 'User-Agent': 'AgroData-App/1.0' } }
      );

      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lng = parseFloat(results[0].lon);

          mapInstanceRef.current.flyTo([lat, lng], 15, { duration: 1.2 });

          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            const marker = L.marker([lat, lng], {
              icon: createCustomPin(),
              draggable: !readOnly,
            }).addTo(mapInstanceRef.current);

            if (!readOnly) {
              marker.on('dragend', async () => {
                const pos = marker.getLatLng();
                const addr = await fetchAddress(pos.lat, pos.lng);
                updateLocation(pos.lat, pos.lng, addr);
              });
            }
            markerRef.current = marker;
          }

          updateLocation(lat, lng, results[0].display_name);
        } else {
          setSearchError('No se encontró la ubicación. Intenta con otro municipio.');
        }
      }
    } catch {
      setSearchError('Error de red al buscar ubicación.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleGetCurrentPosition = () => {
    if (!navigator.geolocation) {
      setSearchError('Tu dispositivo o navegador no soporta geolocalización GPS.');
      return;
    }

    setIsLocating(true);
    setSearchError('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setIsLocating(false);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.2 });

          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            const marker = L.marker([lat, lng], {
              icon: createCustomPin(),
              draggable: !readOnly,
            }).addTo(mapInstanceRef.current);

            if (!readOnly) {
              marker.on('dragend', async () => {
                const p = marker.getLatLng();
                const addr = await fetchAddress(p.lat, p.lng);
                updateLocation(p.lat, p.lng, addr);
              });
            }
            markerRef.current = marker;
          }

          const addr = await fetchAddress(lat, lng);
          updateLocation(lat, lng, addr);
        }
      },
      (err) => {
        setIsLocating(false);
        setSearchError('No se pudo obtener la posición GPS: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
      {!readOnly && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            right: 12,
            zIndex: 1000,
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <form
            onSubmit={handleSearch}
            style={{
              flex: 1,
              minWidth: 200,
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 10,
              padding: '0 10px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            <Search size={15} style={{ color: 'var(--color-text-subtle)', flexShrink: 0, marginRight: 6 }} />
            <input
              type="text"
              placeholder="Buscar municipio o predio (ej: Codazzi, La Paz)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: 13,
                height: 36,
                outline: 'none',
              }}
            />
            {isSearching ? (
              <Loader2 size={15} style={{ animation: 'spin 1s linear infinite', color: '#4ade80', flexShrink: 0 }} />
            ) : (
              <button
                type="submit"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4ade80',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 6px',
                }}
              >
                Buscar
              </button>
            )}
          </form>

          <button
            type="button"
            onClick={handleGetCurrentPosition}
            disabled={isLocating}
            title="Capturar mi ubicación GPS actual"
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
              color: '#38bdf8',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            <Crosshair size={15} className={isLocating ? 'animate-spin' : ''} />
            <span>GPS</span>
          </button>

          <button
            type="button"
            onClick={() => setMapType(m => m === 'streets' ? 'satellite' : 'streets')}
            title="Alternar capa satelital"
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
            <span>{mapType === 'satellite' ? 'Satélite' : 'Mapa'}</span>
          </button>
        </div>
      )}

      <div ref={mapContainerRef} style={{ width: '100%', height, background: '#1e293b' }} />

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
          padding: '6px 12px',
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: 'var(--color-text)',
        }}
      >
        <MapPin size={14} color="#4ade80" />
        {currentCoords ? (
          <span>
            Lat: <strong>{currentCoords.lat.toFixed(5)}</strong> · Lng: <strong>{currentCoords.lng.toFixed(5)}</strong>
          </span>
        ) : (
          <span style={{ color: 'var(--color-text-muted)' }}>
            {readOnly ? 'Sin coordenadas registradas' : 'Haz click en el mapa para fijar el predio'}
          </span>
        )}
      </div>

      {searchError && (
        <div
          style={{
            position: 'absolute',
            top: 56,
            left: 12,
            right: 12,
            zIndex: 1000,
            background: 'rgba(239, 68, 68, 0.95)',
            color: '#ffffff',
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{searchError}</span>
          <button
            type="button"
            onClick={() => setSearchError('')}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
