import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Search, X, MapPin, Loader2, Map as MapIcon, Moon, Sun } from 'lucide-react';

mapboxgl.accessToken = 'pk.eyJ1IjoiZ2FuZXNoLWFpIiwiYSI6ImNtb25manBraTA0djIycHF5ZmNoaHc1d3oifQ.9t0phnsdsFubQao7PN-hHQ';

interface SearchResult {
  id: string;
  display_name: string;
  lat: number;
  lon: number;
}

export interface MapViewProps {
  onLocationConfirm?: (location: { lat: number; lng: number; placeName: string }) => void;
  searchLocation?: string;
  /** Parent calls this with a resize fn so it can trigger map.resize() on panel width change */
  onResizeReady?: (resizeFn: () => void) => void;
}

export function MapView({ onLocationConfirm, searchLocation, onResizeReady }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const nearbyMarkersRef = useRef<mapboxgl.Marker[]>([]);
  
  const [theme, setTheme] = useState<'standard' | 'dark' | 'satellite'>('standard');
  const [manualQuery, setManualQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState('');
  const [markerCoords, setMarkerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [searching, setSearching] = useState(false);
  const [autoLocating, setAutoLocating] = useState(false);
  const prevSearchLocation = useRef('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper to add 3D buildings
  const add3DBuildings = (map: mapboxgl.Map) => {
    if (map.getLayer('3d-buildings')) return;
    const layers = map.getStyle().layers;
    let labelLayerId;
    for (const layer of layers) {
      if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
        labelLayerId = layer.id;
        break;
      }
    }

    map.addLayer(
      {
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 15,
        paint: {
          'fill-extrusion-color': '#e5e5e5',
          'fill-extrusion-height': [
            'interpolate', ['linear'], ['zoom'],
            15, 0,
            15.05, ['get', 'height']
          ],
          'fill-extrusion-base': [
            'interpolate', ['linear'], ['zoom'],
            15, 0,
            15.05, ['get', 'min_height']
          ],
          'fill-extrusion-opacity': 0.8
        }
      },
      labelLayerId
    );
  };

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/standard',
      center: [78.9629, 20.5937],
      zoom: 3,
      pitch: 45,
      bearing: -17.6,
      projection: 'globe'
    });

    // Expose resize fn to parent so it can call map.resize() when panel width changes
    onResizeReady?.(() => map.resize());

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    map.on('style.load', () => {
      map.setFog({
        color: 'rgb(186, 210, 235)',
        'high-color': 'rgb(36, 92, 223)',
        'horizon-blend': 0.02,
        'space-color': 'rgb(11, 11, 25)',
        'star-intensity': 0.6
      });
    });

    map.on('click', async (e) => {
      const { lng, lat } = e.lngLat;
      placeMarker(lat, lng);
      try {
        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}`);
        const data = await res.json();
        const placeName = data.features?.[0]?.place_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setSelectedPlace(placeName);
      } catch {
        setSelectedPlace(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Theme changing
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    
    if (theme === 'satellite') {
      map.setStyle('mapbox://styles/mapbox/satellite-streets-v12');
      map.once('style.load', () => add3DBuildings(map));
    } else if (theme === 'dark') {
      map.setStyle('mapbox://styles/mapbox/dark-v11');
      map.once('style.load', () => add3DBuildings(map));
    } else {
      map.setStyle('mapbox://styles/mapbox/standard');
    }
  }, [theme]);

  // Generate realistic comparable property prices around the pinned location
  useEffect(() => {
    if (!markerCoords || !mapRef.current) return;
    
    // Remove old nearby markers
    nearbyMarkersRef.current.forEach(m => m.remove());
    nearbyMarkersRef.current = [];

    const map = mapRef.current;
    const { lat, lng } = markerCoords;
    
    // Generate 5-8 random properties nearby
    const numComps = Math.floor(Math.random() * 4) + 5; 
    
    for (let i = 0; i < numComps; i++) {
       const rLat = lat + (Math.random() - 0.5) * 0.008; // Roughly 500m-1km radius
       const rLng = lng + (Math.random() - 0.5) * 0.008;
       
       // Generate realistic looking Indian real estate values (e.g. ₹1.5 Cr, ₹85 L)
       const isCr = Math.random() > 0.3;
       let priceStr = '';
       if (isCr) {
         const crValue = (Math.random() * 5 + 1).toFixed(2);
         priceStr = `₹${crValue} Cr`;
       } else {
         const lValue = Math.floor(Math.random() * 40 + 50);
         priceStr = `₹${lValue} L`;
       }
       
       const el = document.createElement('div');
       el.className = 'nearby-marker';
       // Subtle white tags with dark text for surrounding properties
       el.innerHTML = `
         <div style="background: rgba(255,255,255,0.9); backdrop-filter: blur(4px); color: #333; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-family: sans-serif; font-weight: 600; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 4px 12px rgba(0,0,0,0.08); display: flex; align-items: center; gap: 4px; transition: transform 0.2s;">
           <div style="width:6px; height:6px; border-radius:50%; background:#22c55e;"></div>
           ${priceStr}
         </div>
       `;

       const m = new mapboxgl.Marker({ element: el })
         .setLngLat([rLng, rLat])
         .addTo(map);
         
       nearbyMarkersRef.current.push(m);
    }
  }, [markerCoords]);

  const placeMarker = useCallback((lat: number, lng: number) => {
    if (!mapRef.current) return;
    if (markerRef.current) markerRef.current.remove();
    
    const el = document.createElement('div');
    el.className = 'custom-marker';
    // The main selected property tag
    el.innerHTML = `
      <div style="background: #111; color: white; padding: 5px 10px; border-radius: 8px; font-size: 12px; font-family: sans-serif; font-weight: 700; border: 2px solid white; box-shadow: 0 4px 15px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 6px; letter-spacing: -0.2px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        Target Property
      </div>
      <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid white; margin: -2px auto 0;"></div>
      <div style="width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 6px solid #111; margin: -10px auto 0;"></div>
    `;

    markerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(mapRef.current);
      
    setMarkerCoords({ lat, lng });
    setShowPopup(true);
  }, []);

  const flyAndPin = useCallback(async (query: string, isLocality: boolean) => {
    setAutoLocating(true);
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&limit=1&country=in`);
      const data = await res.json();
      const feature = data.features?.[0];
      if (feature && mapRef.current) {
        const [lng, lat] = feature.center;
        const zoom = isLocality ? 16.5 : 14;
        
        // Let the map fly with a slight pitch, but leave the rest to the user controls
        mapRef.current.flyTo({ center: [lng, lat], zoom, pitch: 50, duration: 3000, essential: true });
        
        // Let map fly before pinning
        setTimeout(() => {
          placeMarker(lat, lng);
          setSelectedPlace(feature.place_name);
        }, 1500);
      }
    } finally {
      setAutoLocating(false);
    }
  }, [placeMarker]);

  // React to city/locality changes from the form
  useEffect(() => {
    if (!searchLocation || searchLocation === prevSearchLocation.current) return;
    prevSearchLocation.current = searchLocation;
    const isLocality = searchLocation.includes(',');

    if (!mapRef.current || !mapRef.current.isStyleLoaded()) {
      setTimeout(() => flyAndPin(searchLocation, isLocality), 1000);
    } else {
      flyAndPin(searchLocation, isLocality);
    }
  }, [searchLocation, flyAndPin]);

  function handleManualSearch(value: string) {
    setManualQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (value.length < 3) { setSuggestions([]); return; }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${mapboxgl.accessToken}&limit=5&country=in`);
        const data = await res.json();
        setSuggestions((data.features || []).map((f: any) => ({
          id: f.id,
          display_name: f.place_name,
          lon: f.center[0],
          lat: f.center[1]
        })));
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }

  async function handleSearchEnter() {
    if (!manualQuery.trim()) return;
    if (suggestions.length > 0) {
      selectSuggestion(suggestions[0]);
      return;
    }
    setSearching(true);
    await flyAndPin(manualQuery, true);
    setSuggestions([]);
    setSearching(false);
  }

  function selectSuggestion(s: SearchResult) {
    if (!mapRef.current) return;
    mapRef.current.flyTo({ center: [s.lon, s.lat], zoom: 16.5, pitch: 50, duration: 2500, essential: true });
    setTimeout(() => {
      placeMarker(s.lat, s.lon);
      setSelectedPlace(s.display_name);
    }, 1500);
    setManualQuery(s.display_name.split(',')[0]);
    setSuggestions([]);
  }

  function handleConfirm() {
    if (!markerCoords) return;
    onLocationConfirm?.({ ...markerCoords, placeName: selectedPlace });
    setShowPopup(false);
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#E5E5E5]">
      {/* Search and Controls — float above map */}
      <div className="absolute top-4 left-4 right-16 z-20 flex flex-col gap-2 pointer-events-none">
        <div className="flex gap-2 pointer-events-auto">
          <div className="flex-1 relative">
            <div className="relative">
              <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl px-4 py-2 shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                {searching || autoLocating
                  ? <Loader2 className="w-4 h-4 text-[#111] shrink-0 animate-spin" />
                  : <Search className="w-4 h-4 text-gray-400 shrink-0" />
                }
                <input
                  type="text"
                  value={manualQuery}
                  onChange={(e) => handleManualSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchEnter()}
                  placeholder={searchLocation ? `Showing: ${searchLocation}` : 'Search any property location...'}
                  className="flex-1 text-[13px] font-semibold text-gray-900 placeholder:text-gray-400 placeholder:font-medium bg-transparent focus:outline-none min-w-0"
                />
                {manualQuery && (
                  <button onClick={() => { setManualQuery(''); setSuggestions([]); }}>
                    <X className="w-4 h-4 text-gray-400 hover:text-[#111] transition-colors" />
                  </button>
                )}
              </div>

              {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full bg-white/95 backdrop-blur-md border border-gray-100 rounded-xl shadow-[0_12px_40px_rgb(0,0,0,0.12)] overflow-hidden z-30">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => selectSuggestion(s)}
                      className="w-full flex items-start gap-2.5 px-3 py-2 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0 transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#111] mt-0.5 shrink-0" />
                      <span className="text-[12px] font-semibold text-gray-800 leading-tight line-clamp-2">{s.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Theme Toggles */}
          <div className="flex flex-col gap-1 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.08)] shrink-0">
            <button
              onClick={() => setTheme('standard')}
              className={`p-2 rounded-lg transition-all ${theme === 'standard' ? 'bg-[#111] text-white shadow-md' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900'}`}
              title="Standard 3D"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'bg-[#111] text-white shadow-md' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900'}`}
              title="Dark Mode"
            >
              <Moon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme('satellite')}
              className={`p-2 rounded-lg transition-all ${theme === 'satellite' ? 'bg-[#111] text-white shadow-md' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900'}`}
              title="Satellite"
            >
              <MapIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {autoLocating && (
          <div className="bg-[#111] text-white shadow-lg rounded-xl px-4 py-2.5 self-start flex items-center gap-2 pointer-events-auto">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-[12px] font-semibold">Locating {searchLocation}...</span>
          </div>
        )}
      </div>

      {/* Map canvas — fills entire panel */}
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Location confirm popup */}
      {showPopup && markerCoords && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_rgb(0,0,0,0.2)] p-5 w-80 z-[1000] border border-gray-100 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <button onClick={() => setShowPopup(false)} className="absolute top-4 right-4 text-gray-400 hover:text-[#111] transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-3 mb-5 pr-6">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
              <MapPin className="w-4 h-4 text-[#111]" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-gray-900 leading-snug line-clamp-2">
                {selectedPlace || 'Selected property'}
              </p>
              <p className="text-[11px] font-medium text-gray-500 mt-1 uppercase tracking-wide">
                {markerCoords.lat.toFixed(5)}, {markerCoords.lng.toFixed(5)}
              </p>
            </div>
          </div>
          <button
            onClick={handleConfirm}
            className="w-full py-3 bg-[#111] hover:bg-black text-white text-[13px] font-bold rounded-xl transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
          >
            Confirm Boundary
          </button>
        </div>
      )}
    </div>
  );
}
