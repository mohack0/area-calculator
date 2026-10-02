/**
 * Field Measure Pro - Production Live Google Map & Flutter Mobile/Desktop Engine
 */

import React, { useState, useEffect } from 'react';
import { GoogleMapFieldView } from './components/GoogleMapFieldView';
import { FlutterProjectViewer } from './components/FlutterProjectViewer';
import { SavedFieldsDrawer, SavedField } from './components/SavedFieldsDrawer';
import { ApiKeyModal } from './components/ApiKeyModal';
import { GuideModal } from './components/GuideModal';
import { Map, Layers, Smartphone, Key, HelpCircle, Github } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'map' | 'flutter'>('map');
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  const [savedFields, setSavedFields] = useState<SavedField[]>(() => {
    try {
      const stored = localStorage.getItem('fmp_saved_fields');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [activeLoadedField, setActiveLoadedField] = useState<SavedField | null>(null);

  // Custom API Key Management with local storage persistence
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('fmp_custom_google_maps_api_key') || '';
    } catch {
      return '';
    }
  });

  const envApiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyB8vVAXzOosPGxMMD-74x7h3WiEYes9nUk';
  const effectiveApiKey = customApiKey.trim() || envApiKey;
  const isCustomKey = Boolean(customApiKey.trim());

  // Persist saved fields
  useEffect(() => {
    try {
      localStorage.setItem('fmp_saved_fields', JSON.stringify(savedFields));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [savedFields]);

  const handleUpdateApiKey = (newKey: string) => {
    const trimmed = newKey.trim();
    setCustomApiKey(trimmed);
    try {
      localStorage.setItem('fmp_custom_google_maps_api_key', trimmed);
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  };

  const handleDeleteApiKey = () => {
    setCustomApiKey('');
    try {
      localStorage.removeItem('fmp_custom_google_maps_api_key');
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  };

  const handleSaveField = (field: SavedField) => {
    setSavedFields((prev) => [field, ...prev]);
  };

  const handleDeleteField = (id: string) => {
    setSavedFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSelectField = (field: SavedField) => {
    setActiveLoadedField(field);
    setActiveTab('map');
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 px-2.5 sm:px-6 py-1.5 sm:py-2.5 flex items-center justify-between shrink-0 z-40 backdrop-blur gap-2">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-green-600 to-emerald-400 flex items-center justify-center font-black text-white text-xs sm:text-base shadow-lg shadow-green-600/30 shrink-0">
            FMP
          </div>
          <div>
            <h1 className="text-xs sm:text-base font-black tracking-tight text-white flex items-center gap-1.5 whitespace-nowrap">
              FIELD MEASURE PRO
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hidden md:inline-block">
                Web & Mobile
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden lg:block">
              Real-time GPS boundary walking, satellite parcel mapping & geodesic calculation
            </p>
          </div>
        </div>

        {/* Tab Switcher & Status (Touch scrollable & compact on mobile) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto touch-pan-x scrollbar-none">
          {/* Guide & Units Modal Button */}
          <button
            onClick={() => setIsGuideModalOpen(true)}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] sm:text-xs font-semibold transition cursor-pointer shrink-0"
            title="Open Measurement Guide & Land Units"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Guide</span>
          </button>

          {/* API Key Settings Button */}
          <button
            onClick={() => setIsApiKeyModalOpen(true)}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl border text-[11px] sm:text-xs font-semibold transition cursor-pointer shrink-0 ${
              isCustomKey
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40 hover:bg-emerald-900/60'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Configure or delete Google Maps API Key"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">API Key</span>
            {isCustomKey && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            )}
          </button>

          {/* View Switcher: Map vs Flutter Engine */}
          <div className="flex bg-slate-800/90 p-0.5 sm:p-1 rounded-xl border border-slate-700/80 shrink-0">
            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                activeTab === 'map'
                  ? 'bg-green-600 text-white shadow-md shadow-green-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Map className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Map</span>
            </button>
            <button
              onClick={() => setActiveTab('flutter')}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                activeTab === 'flutter'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden md:inline">Flutter Android Engine</span>
              <span className="md:hidden">Flutter</span>
            </button>
          </div>

          <span className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 text-emerald-400 border border-emerald-500/30 text-xs font-medium shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            WGS84 Authalic
          </span>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 w-full relative overflow-hidden">
        {activeTab === 'map' ? (
          <GoogleMapFieldView
            key={`map-view-${effectiveApiKey}`}
            apiKey={effectiveApiKey}
            onOpenSavedFields={() => setIsSavedDrawerOpen(true)}
            savedFieldsCount={savedFields.length}
            onSaveField={handleSaveField}
            activeLoadedField={activeLoadedField}
          />
        ) : (
          <div className="h-full overflow-auto">
            <FlutterProjectViewer onBack={() => setActiveTab('map')} />
          </div>
        )}

        {/* Saved Fields Drawer */}
        <SavedFieldsDrawer
          isOpen={isSavedDrawerOpen}
          onClose={() => setIsSavedDrawerOpen(false)}
          fields={savedFields}
          onSelectField={handleSelectField}
          onDeleteField={handleDeleteField}
          primaryAreaUnit="Acres"
        />

        {/* Google Maps API Key Modal */}
        <ApiKeyModal
          isOpen={isApiKeyModalOpen}
          onClose={() => setIsApiKeyModalOpen(false)}
          isCustomKey={isCustomKey}
          onUpdateKey={handleUpdateApiKey}
          onDeleteKey={handleDeleteApiKey}
        />

        {/* User Guide & Land Units Modal */}
        <GuideModal
          isOpen={isGuideModalOpen}
          onClose={() => setIsGuideModalOpen(false)}
        />
      </main>
    </div>
  );
}
