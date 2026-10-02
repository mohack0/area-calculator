import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  Compass,
  Pencil,
  MousePointer2,
  Sliders,
  Footprints,
  Calculator,
  ShieldCheck,
  Github,
  Layers,
  MapPin,
} from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<'methods' | 'units' | 'hosting'>('methods');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fade-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Field Measure Pro Guide</h2>
              <p className="text-xs text-slate-400">Agricultural boundary measurement & land units guide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 pt-2 gap-2 shrink-0">
          <button
            onClick={() => setActiveSection('methods')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeSection === 'methods'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MousePointer2 className="w-3.5 h-3.5" />
            <span>Measurement Modes</span>
          </button>
          <button
            onClick={() => setActiveSection('units')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeSection === 'units'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Land Units & Formulas</span>
          </button>
          <button
            onClick={() => setActiveSection('hosting')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeSection === 'hosting'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub Hosting & Keys</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-300">
          {activeSection === 'methods' && (
            <div className="space-y-4">
              <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/80 space-y-1.5">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <MousePointer2 className="w-4 h-4 text-green-400" />
                  <span>1. Point-by-Point Mode</span>
                </div>
                <p>
                  Click or tap anywhere on the high-resolution satellite map to place boundary corner vertices.
                  Clicking near the first vertex auto-snaps the parcel closed and calculates the geodesic area instantly.
                </p>
              </div>

              <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/80 space-y-1.5">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Pencil className="w-4 h-4 text-emerald-400" />
                  <span>2. Freehand Draw Mode</span>
                </div>
                <p>
                  Drag your finger or mouse across the map to outline curvy parcel borders, hedgerows, or canal banks.
                  Releasing the gesture automatically closes the loop and runs the Ramer-Douglas-Peucker (RDP) algorithm to generate clean corners.
                </p>
              </div>

              <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/80 space-y-1.5">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Footprints className="w-4 h-4 text-blue-400" />
                  <span>3. Live GPS Walk Mode</span>
                </div>
                <p>
                  Walk physically along the perimeter of your field with your smartphone or tablet. The engine
                  filters high-accuracy GPS positions and records boundary corners as you walk each edge.
                </p>
              </div>

              <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/80 space-y-1.5">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>4. Real-Time Touch Vertex Dragging</span>
                </div>
                <p>
                  Switch to Edit & Adjust mode to drag any corner vertex with continuous, real-time polygon resizing.
                  Click the (+) midpoint badge between any two corners to insert a new corner point.
                </p>
              </div>
            </div>
          )}

          {activeSection === 'units' && (
            <div className="space-y-4">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider text-emerald-400">
                  WGS84 Authalic Geodesic Calculations
                </h4>
                <p>
                  All surface area and boundary length calculations account for the curvature of the Earth
                  using the WGS84 authalic sphere (radius = 6,371,007.2 meters).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <span className="font-bold text-white block mb-1">Standard Global Units</span>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    <li>• 1 Acre = 4,046.856 m² (43,560 sq ft)</li>
                    <li>• 1 Hectare = 10,000 m² (2.471 Acres)</li>
                    <li>• 1 Square Meter = 10.764 sq ft</li>
                  </ul>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <span className="font-bold text-white block mb-1">Indian Regional Units</span>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    <li>• 1 Bigha (Standard) = 2,529.285 m²</li>
                    <li>• 1 Bigha (Uttarakhand) = 809.37 m² (0.2 Acre)</li>
                    <li>• 1 Guntha (MH/KA/GJ) = 101.17 m²</li>
                    <li>• 1 Kanal (Punjab/Haryana) = 505.86 m²</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'hosting' && (
            <div className="space-y-3.5">
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-2">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Github className="w-4 h-4 text-emerald-400" />
                  <span>Hosted on GitHub Pages</span>
                </h4>
                <p>
                  This project compiles into a 100% static, client-side web application. It includes automated GitHub Actions
                  workflows for instant zero-configuration deployment to GitHub Pages.
                </p>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1.5 font-mono text-[11px]">
                <div className="text-slate-400 font-bold">Quick Build & Deploy:</div>
                <div className="text-emerald-400">git push origin main</div>
                <div className="text-slate-400">GitHub Actions builds and deploys to:</div>
                <div className="text-blue-400 font-sans">https://&lt;your-username&gt;.github.io/&lt;repo-name&gt;/</div>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700 space-y-1 text-[11px]">
                <span className="font-bold text-white">Google Maps API Key:</span>
                <p>
                  Use the built-in system demo key or click the <strong>API Key</strong> button in the header
                  to set your own Google Cloud key. The key remains password-masked and is stored locally in your browser.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-800 p-3.5 bg-slate-900/90 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">Field Measure Pro · Web & Mobile Edition</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs transition cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
