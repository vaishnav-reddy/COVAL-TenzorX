import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, X, MapPin, Loader2, Satellite, Map } from 'lucide-react';

// @ts-ignore - leaflet marker images
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
// @ts-ignore - leaflet marker images
import markerIcon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore - leaflet marker images
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

const indigoIcon = L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;background:#6366f1;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 10px rgba(99,102,241,0.6);"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -32],
});

interface SearchResult {
  id: string;
  display_name: string;
  lat: string;
  lon: string;
}

export interface MapViewProps {
  onLocationConfirm?: (location: { lat: number; lng: number; placeName: string }) => void;
  searchLocation?: string;
}

const TOMTOM_KEY = (import.meta as unknown as { env: { VITE_TOMTOM_KEY?: string } }).env.VITE_TOMTOM_KEY || '';

// Tile URLs
const streetUrl = () => TOMTOM_KEY
  ? `https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${TOMTOM_KEY}&tileSize=256&language=en-GB&view=IN`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const satelliteUrl = () =>
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

const labelsUrl = () =>
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

async function geocode(query: string): Promise<{ lat: number; lng: number; label: string } | null> {
  try {
    if (TOMTOM_KEY) {
      const res = await fetch(
        `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${TOMTOM_KEY}&countrySet=IN&limit=1&language=en-GB&typeahead=false`
      );
      const data = await res.json();
      const r = data.results?.[0];
      if (!r) return null;
      return { lat: r.position.lat, lng: r.position.lon, label: r.address.freeformAddress };
    } else {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ' India')}&format=json&countrycodes=in&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (!data[0]) return null;
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: data[0].display_name };
    }
  } catch {
    return null;
  }
}

export function MapView({ onLocationConfirm, searchLocation }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const streetLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const mapReadyRef = useRef(false);

  // Pending geocode to run once map is ready
  const pendingGeocode = useRef<string | null>(null);

  const [isSatellite, setIsSatellite] = useState(true);
  const [manualQuery, setManualQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState('');
  const [markerCoords, setMarkerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [searching, setSearching] = useState(false);
  const [autoLocating, setAutoLocating] = useState(false);
  const prevSearchLocation = useRef('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const placeMarker = useCallback((lat: number, lng: number) => {
    if (!mapRef.current) return;
    if (markerRef.current) markerRef.current.remove();
    markerRef.current = L.marker([lat, lng], { icon: indigoIcon }).addTo(mapRef.current);
    setMarkerCoords({ lat, lng });
    setShowPopup(true);
  }, []);

  // Handle map resize when container changes
  useEffect(() => {
    if (!mapContainer.current || !mapRef.current) return;
    
    const resizeObserver = new ResizeObserver(() => {
      mapRef.current?.invalidateSize();
    });
    
    resizeObserver.observe(mapContainer.current);
    return () => resizeObserver.disconnect();
  }, []);

  const flyAndPin = useCallback(async (query: string, isLocality: boolean) => {
    setAutoLocating(true);
    const result = await geocode(query);
    setAutoLocating(false);
    if (!result || !mapRef.current) return;
    const zoom = isLocality ? 16 : 13;
    mapRef.current.flyTo([result.lat, result.lng], zoom, { duration: 1.2 });
    placeMarker(result.lat, result.lng);
    setSelectedPlace(result.label);
    if (isLocality) setIsSatellite(true);
  }, [placeMarker]);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = L.map(mapContainer.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: false,
    });

    const streetLayer = L.tileLayer(streetUrl(), {
      attribution: TOMTOM_KEY ? '© TomTom' : '© OpenStreetMap contributors',
      maxZoom: 22,
    }); // not added by default — satellite is default

    const satelliteLayer = L.tileLayer(satelliteUrl(), {
      attribution: '© Esri, Maxar',
      maxZoom: 19,
    }).addTo(map);

    const labelsLayer = L.tileLayer(labelsUrl(), {
      attribution: '',
      maxZoom: 19,
      opacity: 1,
    }).addTo(map);

    streetLayerRef.current = streetLayer;
    satelliteLayerRef.current = satelliteLayer;
    labelsLayerRef.current = labelsLayer;

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      placeMarker(lat, lng);
      // reverse geocode
      try {
        if (TOMTOM_KEY) {
          const res = await fetch(
            `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json?key=${TOMTOM_KEY}&language=en-GB`
          );
          const data = await res.json();
          const addr = data.addresses?.[0]?.address;
          setSelectedPlace(addr
            ? [addr.streetName, addr.municipalitySubdivision, addr.municipality].filter(Boolean).join(', ')
            : `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } else {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          setSelectedPlace(data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      } catch {
        setSelectedPlace(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    });

    mapRef.current = map;
    mapReadyRef.current = true;

    // Force map to fill container after mount
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Run any pending geocode that arrived before map was ready
    if (pendingGeocode.current) {
      const pending = pendingGeocode.current;
      pendingGeocode.current = null;
      flyAndPin(pending, pending.includes(','));
    }

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapRef.current = null;
      mapReadyRef.current = false;
    };
  }, [flyAndPin, placeMarker]);

  // Satellite toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !streetLayerRef.current || !satelliteLayerRef.current || !labelsLayerRef.current) return;
    if (isSatellite) {
      if (map.hasLayer(streetLayerRef.current)) map.removeLayer(streetLayerRef.current);
      if (!map.hasLayer(satelliteLayerRef.current)) satelliteLayerRef.current.addTo(map);
      if (!map.hasLayer(labelsLayerRef.current)) labelsLayerRef.current.addTo(map);
      // only zoom in if user explicitly toggled AND a location is already pinned
      if (map.getZoom() < 15 && markerCoords) map.setZoom(16);
    } else {
      if (map.hasLayer(satelliteLayerRef.current)) map.removeLayer(satelliteLayerRef.current);
      if (map.hasLayer(labelsLayerRef.current)) map.removeLayer(labelsLayerRef.current);
      if (!map.hasLayer(streetLayerRef.current)) streetLayerRef.current.addTo(map);
    }
  }, [isSatellite]);

  // React to city/locality changes from the form
  useEffect(() => {
    if (!searchLocation || searchLocation === prevSearchLocation.current) return;
    prevSearchLocation.current = searchLocation;
    const isLocality = searchLocation.includes(',');

    if (!mapReadyRef.current) {
      // Map not ready yet — queue it
      pendingGeocode.current = searchLocation;
    } else {
      flyAndPin(searchLocation, isLocality);
    }
  }, [searchLocation, flyAndPin]);

  // Manual search input
  function handleManualSearch(value: string) {
    setManualQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (value.length < 2) { setSuggestions([]); return; }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        if (TOMTOM_KEY) {
          const res = await fetch(
            `https://api.tomtom.com/search/2/search/${encodeURIComponent(value)}.json?key=${TOMTOM_KEY}&countrySet=IN&limit=6&language=en-GB&typeahead=true`
          );
          const data = await res.json();
          setSuggestions((data.results || []).map((r: {
            id: string;
            address: { freeformAddress: string };
            position: { lat: number; lon: number };
          }) => ({
            id: r.id,
            display_name: r.address.freeformAddress,
            lat: String(r.position.lat),
            lon: String(r.position.lon),
          })));
        } else {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value + ' India')}&format=json&countrycodes=in&limit=6`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          setSuggestions(data.map((d: { place_id: number; display_name: string; lat: string; lon: string }) => ({
            id: String(d.place_id),
            display_name: d.display_name,
            lat: d.lat,
            lon: d.lon,
          })));
        }
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }

  async function handleSearchEnter() {
    if (!manualQuery.trim()) return;
    // If suggestions exist, pick the first one
    if (suggestions.length > 0) {
      selectSuggestion(suggestions[0]);
      return;
    }
    // Otherwise geocode directly
    setSearching(true);
    const result = await geocode(manualQuery);
    setSearching(false);
    if (!result || !mapRef.current) return;
    mapRef.current.flyTo([result.lat, result.lng], 16, { duration: 1 });
    placeMarker(result.lat, result.lng);
    setSelectedPlace(result.label);
    setSuggestions([]);
    setIsSatellite(true);
  }

  function selectSuggestion(s: SearchResult) {
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    if (!mapRef.current) return;
    mapRef.current.flyTo([lat, lng], 17, { duration: 1 });
    placeMarker(lat, lng);
    setSelectedPlace(s.display_name);
    setManualQuery(s.display_name.split(',')[0]);
    setSuggestions([]);
    setIsSatellite(true);
  }

  function handleConfirm() {
    if (!markerCoords) return;
    onLocationConfirm?.({ ...markerCoords, placeName: selectedPlace });
    setShowPopup(false);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="px-4 py-3 border-b border-gray-100 relative z-20 bg-white flex items-center gap-2">
        <div className="flex-1 relative">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
            {searching || autoLocating
              ? <Loader2 className="w-4 h-4 text-indigo-400 shrink-0 animate-spin" />
              : <Search className="w-4 h-4 text-gray-400 shrink-0" />
            }
            <input
              type="text"
              value={manualQuery}
              onChange={(e) => handleManualSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchEnter()}
              placeholder={searchLocation ? `Showing: ${searchLocation}` : 'Search city, locality, address...'}
              className="flex-1 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
            />
            {manualQuery && (
              <button onClick={() => { setManualQuery(''); setSuggestions([]); }}>
                <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
            <button
              onClick={handleSearchEnter}
              className="shrink-0 px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-md transition-colors"
            >
              Go
            </button>
          </div>

          {autoLocating && (
            <p className="text-[10px] text-indigo-500 mt-1 px-1 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Locating {searchLocation}...
            </p>
          )}

          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-30">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectSuggestion(s)}
                  className="w-full flex items-start gap-2 px-3 py-2.5 hover:bg-indigo-50 text-left border-b border-gray-50 last:border-0 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                  <span className="text-xs text-gray-700 leading-relaxed line-clamp-2">{s.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Satellite / Street toggle */}
        <button
          onClick={() => setIsSatellite(v => !v)}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
            isSatellite
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
          }`}
        >
          {isSatellite ? <Map className="w-3.5 h-3.5" /> : <Satellite className="w-3.5 h-3.5" />}
          {isSatellite ? 'Street' : 'Satellite'}
        </button>
      </div>

      {/* Map container */}
      <div className="flex-1 relative overflow-hidden">
        <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

        {isSatellite && (
          <div className="absolute top-3 left-3 z-[999] bg-black/60 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm pointer-events-none">
            🛰 Satellite · Esri World Imagery
          </div>
        )}

        {showPopup && markerCoords && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg p-4 w-72 z-[1000] border border-gray-100">
            <button onClick={() => setShowPopup(false)} className="absolute top-2.5 right-2.5 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-start gap-2 mb-3 pr-4">
              <MapPin className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2">
                  {selectedPlace || 'Selected location'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {markerCoords.lat.toFixed(6)}, {markerCoords.lng.toFixed(6)}
                </p>
              </div>
            </div>
            <button
              onClick={handleConfirm}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Confirm Location
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
