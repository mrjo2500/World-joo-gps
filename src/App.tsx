import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MessageCircle, 
  Send, 
  Map as MapIcon, 
  Navigation, 
  Search as SearchIcon, 
  X, 
  Loader2, 
  Box, 
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message, MapContext } from './types';
import { OpenStreetMapProvider } from 'leaflet-geosearch';

// Fix for default marker icons
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const MapController = ({ 
  setContext, 
  is3D 
}: { 
  setContext: (ctx: MapContext) => void;
  is3D: boolean;
}) => {
  const map = useMap();
  
  const updateContext = () => {
    const center = map.getCenter();
    const zoom = map.getZoom();
    const bounds = map.getBounds();
    
    setContext({
      center: [center.lat, center.lng],
      zoom,
      bounds: {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      },
    });
  };

  useMapEvents({
    moveend: updateContext,
    zoomend: updateContext,
  });

  useEffect(() => {
    updateContext();
  }, []);

  return null;
};

export default function App() {
  const [context, setContext] = useState<MapContext>({
    center: [30.0444, 31.2357], // Cairo
    zoom: 15,
    bounds: { north: 0, south: 0, east: 0, west: 0 }
  });
  const [is3D, setIs3D] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const mapRef = useRef<L.Map | null>(null);
  const provider = new OpenStreetMapProvider();

  // Keyboard Movement for Drone with Momentum
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        setIsMoving(true);
        const accel = 0.0005;
        setVelocity(prev => {
          let nx = prev.x;
          let ny = prev.y;
          if (key === 'w') ny += accel;
          if (key === 's') ny -= accel;
          if (key === 'a') nx -= accel;
          if (key === 'd') nx += accel;
          // Clamp velocity
          return { x: Math.max(-0.01, Math.min(0.01, nx)), y: Math.max(-0.01, Math.min(0.01, ny)) };
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
        setIsMoving(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Physics Loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (!mapRef.current) return;
      
      const { lat, lng } = mapRef.current.getCenter();
      if (Math.abs(velocity.x) > 0.00001 || Math.abs(velocity.y) > 0.00001) {
        mapRef.current.panTo([lat + velocity.y, lng + velocity.x], { animate: false });
        
        // Friction when not pressing keys
        if (!isMoving) {
          setVelocity(prev => ({ x: prev.x * 0.9, y: prev.y * 0.9 }));
        }
      }
    }, 16);
    return () => clearInterval(interval);
  }, [velocity, isMoving]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    try {
      const results = await provider.search({ query: searchQuery });
      if (results && results.length > 0) {
        const { x, y } = results[0];
        if (mapRef.current) {
          mapRef.current.flyTo([y, x], 16, {
            duration: 1.5,
            easeLinearity: 0.25
          });
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden font-sans text-slate-200">
      {/* Map Layer with High-Speed Transitions */}
      <div 
        className={`absolute inset-0 transition-all duration-[1500ms] cubic-bezier(0.2, 0, 0, 1) z-0 ${
          is3D ? 'perspective-map' : ''
        }`}
      >
        <MapContainer 
          center={[30.0444, 31.2357]} 
          zoom={15} 
          className="w-full h-full"
          zoomControl={false}
          ref={mapRef}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="map-tiles"
          />
          <MapController setContext={setContext} is3D={is3D} />
        </MapContainer>
      </div>

      {/* mr Joo world - Drone HUD Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
        {/* Cinematic Vignette & Motion Blur Overlay */}
        <div className={`absolute inset-0 transition-opacity duration-300 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)] ${isMoving ? 'backdrop-blur-[1px]' : ''}`} />
        
        {/* Professional Frame */}
        <div className="absolute inset-0 border-[1px] border-white/5 m-2 rounded-[60px]" />
        
        {/* Drone Hardware: Detailed Chassis */}
        <div className="absolute bottom-[-40px] left-1/2 -translate-x-1/2 w-[800px] h-[300px] opacity-90 transition-transform duration-500" style={{ transform: `translateX(-50%) rotateX(10deg) ${isMoving ? 'scale(1.02)' : 'scale(1)'}` }}>
          {/* Main Body */}
          <svg viewBox="0 0 800 300" className="w-full h-full text-zinc-900 fill-current drop-shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <path d="M200 300 L300 200 L500 200 L600 300 Z" className="text-zinc-800" />
            <path d="M350 220 L450 220 L480 280 L320 280 Z" className="text-blue-600/20" />
            
            {/* mr Joo world Text on the Chassis */}
            <text x="400" y="260" textAnchor="middle" className="fill-blue-500 font-black text-[14px] tracking-[0.5em] uppercase">mr Joo world</text>
            
            {/* LED Status Lights */}
            <circle cx="320" cy="230" r="4" className="fill-red-600 animate-pulse" />
            <circle cx="480" cy="230" r="4" className="fill-green-600 animate-pulse" />
          </svg>
        </div>

        {/* Tactical Crosshair */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-32 h-32 border border-white/5 rounded-full flex items-center justify-center">
            <div className="w-16 h-16 border border-blue-500/10 rounded-full" />
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_20px_#3b82f6]" />
          </div>
          <div className="absolute top-1/2 left-[-60px] w-40 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-y-1/2" />
          <div className="absolute top-1/2 right-[-60px] w-40 h-[1px] bg-gradient-to-l from-transparent via-white/10 to-transparent -translate-y-1/2" />
        </div>

        {/* Vertical Altitude Slider */}
        <div className="absolute left-10 top-1/2 -translate-y-1/2 pointer-events-auto flex flex-col items-center gap-6 group">
          <span className="text-[9px] font-bold text-white/40 tracking-widest uppercase vertical-text">Altitude</span>
          <div className="relative h-64 w-12 flex items-center justify-center">
            <svg viewBox="0 0 40 200" className="absolute inset-0 w-full h-full text-white/5 fill-none stroke-current stroke-[2px]">
              <path d="M30 10 Q10 100 30 190" strokeDasharray="4 4" />
            </svg>
            <input 
              type="range" 
              min="3" 
              max="18" 
              step="0.1"
              value={context.zoom}
              onChange={(e) => {
                const newZoom = parseFloat(e.target.value);
                mapRef.current?.setZoom(newZoom);
              }}
              className="vertical-range absolute w-64 h-8 bg-transparent appearance-none cursor-pointer"
              style={{ transform: 'rotate(-90deg)' }}
            />
          </div>
          <span className="text-xs font-mono text-blue-500 font-bold">{(context.zoom * 100).toFixed(0)}m</span>
        </div>

        {/* Bottom Quick Controls */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-auto flex gap-6">
          <button 
            onClick={() => setIs3D(!is3D)}
            className={`px-8 py-3 rounded-full text-[10px] font-black tracking-widest uppercase transition-all shadow-2xl border ${
              is3D 
                ? 'bg-blue-600 border-blue-400 text-white shadow-blue-600/30' 
                : 'bg-black/40 backdrop-blur-xl border-white/10 text-white/60 hover:bg-white/5'
            }`}
          >
            {is3D ? 'Perspective: 3D' : 'Perspective: 2D'}
          </button>
          
          <button 
            onClick={() => mapRef.current?.setView([30.0444, 31.2357], 15)}
            className="px-8 py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full text-[10px] font-black tracking-widest uppercase text-white/60 hover:text-white transition-all shadow-2xl"
          >
            Reset Base
          </button>
        </div>

        {/* Signal & Tech Indicators */}
        <div className="absolute top-12 right-12 flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-white/30 tracking-widest uppercase">Signal</span>
            <div className="flex gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`w-1 h-3 rounded-full ${i <= 4 ? 'bg-blue-500' : 'bg-white/10'}`} />
              ))}
            </div>
          </div>
          <div className="w-10 h-10 border border-white/10 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* Top Search Bar - Minimal */}
      <div className="absolute top-8 right-32 z-20 w-64 pointer-events-auto">
        <form onSubmit={handleSearch} className="relative">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="GOTO_LOC..." 
            className="w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-full px-6 py-2 text-[10px] font-bold tracking-widest uppercase outline-none focus:border-blue-500/50 transition-all placeholder:text-white/20"
          />
          <SearchIcon size={12} className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20" />
        </form>
      </div>

      <style>{`
        .leaflet-container {
          filter: saturate(1.4) contrast(1.1) brightness(1) sepia(0.05);
          background: #000 !important;
        }
        .map-tiles {
          opacity: 1;
          transition: filter 0.3s ease;
        }
        .perspective-map {
          transform: perspective(1000px) rotateX(65deg) scale(2.2) translateY(-25%);
          filter: saturate(1.6) contrast(1.3) brightness(1.05);
        }
        .perspective-map .leaflet-container {
          box-shadow: inset 0 0 100px rgba(0,0,0,1);
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .vertical-text {
          writing-mode: vertical-lr;
          text-orientation: mixed;
          transform: rotate(180deg);
        }
        .vertical-range {
          -webkit-appearance: none;
          width: 256px;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          outline: none;
        }
        .vertical-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          background: #3b82f6;
          border: 2px solid white;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        }
      `}</style>
    </div>
  );
}
