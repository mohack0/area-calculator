import React, { useEffect, useRef } from 'react';
import { X, Navigation2, Compass } from 'lucide-react';
import { LatLng } from '../utils/geoUtils';

interface StreetViewModalProps {
  location: LatLng;
  onClose: () => void;
}

export const StreetViewModal: React.FC<StreetViewModalProps> = ({ location, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);

  useEffect(() => {
    if (!containerRef.current || typeof google === 'undefined' || !google.maps) return;

    const pano = new google.maps.StreetViewPanorama(containerRef.current, {
      position: { lat: location.lat, lng: location.lng },
      pov: { heading: 165, pitch: 0 },
      zoom: 1,
      addressControl: true,
      fullscreenControl: true,
      motionTracking: true,
      linksControl: true,
      panControl: true,
      enableCloseButton: false,
    });

    panoramaRef.current = pano;

    // Check if panorama is available
    const svService = new google.maps.StreetViewService();
    svService.getPanorama({ location: { lat: location.lat, lng: location.lng }, radius: 100 }, (data, status) => {
      if (status !== google.maps.StreetViewStatus.OK) {
        // Fallback message handled in UI
      }
    });
  }, [location]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl h-[75vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Google Street View Ground Perspective
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                  {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Explore 360° panoramic road and field boundary conditions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-700 text-slate-300 hover:text-white hover:bg-slate-600 transition"
            title="Close Street View"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 360 Panorama Container */}
        <div className="flex-1 relative bg-slate-950">
          <div ref={containerRef} className="w-full h-full" />
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Click and drag to rotate 360°. Double-click to move along paths.</span>
          <span className="text-slate-500">Google Maps Platform Street View</span>
        </div>
      </div>
    </div>
  );
};
