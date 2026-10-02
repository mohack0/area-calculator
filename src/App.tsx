/**
 * Field Measure Pro - Production Live Google Map & Flutter Mobile/Desktop Engine
 */

import React, { useState, useEffect } from 'react';
import { GoogleMapFieldView } from './components/GoogleMapFieldView';
import { FlutterProjectViewer } from './components/FlutterProjectViewer';
import { SavedFieldsDrawer, SavedField } from './components/SavedFieldsDrawer';
import { ApiKeyModal } from './components/ApiKeyModal';
import { GuideModal } from './components/GuideModal';
import { Map, Layers, Smartphone, Key, HelpCircle } from 'lucide-react';

interface TabNavigationProps {
  activeTab: 'map' | 'flutter';
  onTabChange: (tab: 'map' | 'flutter') => void;
  isCustomKey: boolean;
  onOpenApiKeyModal: () => void;
  onOpenGuideModal: () => void;
  savedFieldsCount: number;
  onOpenSavedFields: () => void;
}

/**
 * Accessible horizontal flex-scroll tab navigation component.
 * Minimizes vertical height and optimizes touch targets for mobile devices.
 */
const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  isCustomKey,
  onOpenApiKeyModal,
  onOpenGuideModal,
  savedFieldsCount,
  onOpenSavedFields,
}) => {
  return (
    <nav
      aria-label="Application Tabs Navigation"
      className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto touch-pan-x no-scrollbar flex-nowrap shrink-0 py-0.5 overscroll-x-contain select-none"
    >
      {/* Primary View Switcher Tabs (Live Map vs Flutter Code) */}
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="flex items-center bg-slate-800/90 p-0.5 sm:p-1 rounded-xl border border-slate-700/80 shrink-0 shadow-inner"
      >
        <button
          type="button"
          onClick={() => onTabChange('map')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer min-h-[36px] sm:min-h-[38px] touch-manipulation active:scale-95 shrink-0 ${
            activeTab === 'map'
              ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-md shadow-emerald-900/40 ring-1 ring-emerald-400/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          }`}
          aria-selected={activeTab === 'map'}
          role="tab"
          aria-label="Open Live Google Map View"
        >
          <Map className="w-3.5 h-3.5 shrink-0" />
          <span className="tracking-wide">Map</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('flutter')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer min-h-[36px] sm:min-h-[38px] touch-manipulation active:scale-95 shrink-0 ${
            activeTab === 'flutter'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/40 ring-1 ring-blue-400/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          }`}
          aria-selected={activeTab === 'flutter'}
          role="tab"
          aria-label="Open Flutter Android Engine Code"
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline tracking-wide">Flutter Engine</span>
          <span className="sm:hidden tracking-wide">Flutter</span>
        </button>
      </div>

      {/* Saved Fields Drawer Trigger */}
      <button
        type="button"
        onClick={onOpenSavedFields}
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 text-xs font-semibold transition-all duration-150 cursor-pointer min-h-[36px] sm:min-h-[38px] touch-manipulation active:scale-95 shrink-0"
        title="View and manage saved boundary fields"
        aria-label="Open saved fields drawer"
      >
        <Layers className="w-3.5 h-3.5 text-green-400 shrink-0" />
        <span className="hidden xs:inline">Fields</span>
        <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none min-w-[16px] text-center">
          {savedFieldsCount}
        </span>
      </button>

      {/* Guide & Land Units Modal Trigger */}
      <button
        type="button"
        onClick={onOpenGuideModal}
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 text-xs font-semibold transition-all duration-150 cursor-pointer min-h-[36px] sm:min-h-[38px] touch-manipulation active:scale-95 shrink-0"
        title="Open Measurement Guide & Land Units"
        aria-label="Open measurement guide"
      >
        <HelpCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="hidden xs:inline">Guide</span>
      </button>

      {/* Google Maps API Key Modal Trigger */}
      <button
        type="button"
        onClick={onOpenApiKeyModal}
        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-150 cursor-pointer min-h-[36px] sm:min-h-[38px] touch-manipulation active:scale-95 shrink-0 ${
          isCustomKey
            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40 hover:bg-emerald-900/60'
            : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
        }`}
        title="Configure or delete Google Maps API Key"
        aria-label="Configure API key"
      >
        <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="hidden xs:inline">API Key</span>
        {isCustomKey && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        )}
      </button>

      {/* WGS84 Geodesic Status Pill */}
      <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/60 text-emerald-400 border border-emerald-500/20 text-xs font-medium shrink-0 min-h-[36px]">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>WGS84 Engine</span>
      </div>
    </nav>
  );
};

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
      {/* Top Header with minimal vertical footprint */}
      <header className="border-b border-slate-800 bg-slate-900/95 px-2.5 sm:px-5 py-1 sm:py-1.5 flex items-center justify-between shrink-0 z-40 backdrop-blur gap-2 h-11 sm:h-12">
        {/* Brand Identity */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-green-600 to-emerald-400 flex items-center justify-center font-black text-white text-xs sm:text-sm shadow-md shadow-green-600/30 shrink-0">
            FMP
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-black tracking-tight text-white flex items-center gap-1.5 whitespace-nowrap">
              FIELD MEASURE PRO
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hidden md:inline-block">
                Web & Mobile
              </span>
            </h1>
          </div>
        </div>

        {/* Refactored Horizontal Flex-Scroll Tab Navigation */}
        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isCustomKey={isCustomKey}
          onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          onOpenGuideModal={() => setIsGuideModalOpen(true)}
          savedFieldsCount={savedFields.length}
          onOpenSavedFields={() => setIsSavedDrawerOpen(true)}
        />
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
