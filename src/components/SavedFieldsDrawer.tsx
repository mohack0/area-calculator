import React from 'react';
import { X, Trash2, Download, ExternalLink, Calendar, MapPin, Layers } from 'lucide-react';
import { LatLng, formatArea, formatDistance, exportToGeoJson, exportToKML, exportToCSV } from '../utils/geoUtils';

export interface SavedField {
  id: string;
  name: string;
  points: LatLng[];
  areaSqMeters: number;
  perimeterMeters: number;
  createdAt: number;
  cropType?: string;
  notes?: string;
}

interface SavedFieldsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  fields: SavedField[];
  onSelectField: (field: SavedField) => void;
  onDeleteField: (id: string) => void;
  primaryAreaUnit: string;
}

export const SavedFieldsDrawer: React.FC<SavedFieldsDrawerProps> = ({
  isOpen,
  onClose,
  fields,
  onSelectField,
  onDeleteField,
  primaryAreaUnit,
}) => {
  if (!isOpen) return null;

  const downloadFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-slate-900/95 border-l border-slate-800 shadow-2xl backdrop-blur flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Saved Fields</h2>
            <p className="text-xs text-slate-400">{fields.length} measured plots</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Field List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {fields.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500">
            <MapPin className="w-10 h-10 mb-2 opacity-40 text-slate-400" />
            <p className="text-sm font-medium">No saved fields yet</p>
            <p className="text-xs max-w-xs mt-1 text-slate-500">
              Draw or walk a boundary on Google Maps, then click "Save Field" to preserve it here.
            </p>
          </div>
        ) : (
          fields.map((field) => (
            <div
              key={field.id}
              className="p-3.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition space-y-2.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-white">{field.name}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(field.createdAt).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span>{field.points.length} points</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      onSelectField(field);
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded bg-green-600/30 text-green-300 hover:bg-green-600/50 text-xs font-semibold flex items-center gap-1 transition"
                    title="Load on Google Maps"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Load
                  </button>
                  <button
                    onClick={() => onDeleteField(field.id)}
                    className="p-1 rounded text-red-400 hover:bg-red-500/20 transition"
                    title="Delete field"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Area & Perimeter badges */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Area</span>
                  <span className="font-bold text-green-400">
                    {formatArea(field.areaSqMeters, primaryAreaUnit)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Perimeter</span>
                  <span className="font-semibold text-slate-300">
                    {formatDistance(field.perimeterMeters)}
                  </span>
                </div>
              </div>

              {/* Export Buttons */}
              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-700/50">
                <span className="text-[10px] text-slate-500 mr-1 flex items-center gap-0.5">
                  <Download className="w-2.5 h-2.5" /> Export:
                </span>
                <button
                  onClick={() =>
                    downloadFile(
                      `${field.name.replace(/\s+/g, '_')}.geojson`,
                      exportToGeoJson(field.name, field.points, field.areaSqMeters, field.perimeterMeters),
                      'application/geo+json'
                    )
                  }
                  className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] font-mono text-slate-200 transition"
                >
                  GeoJSON
                </button>
                <button
                  onClick={() =>
                    downloadFile(
                      `${field.name.replace(/\s+/g, '_')}.kml`,
                      exportToKML(field.name, field.points, field.areaSqMeters, field.perimeterMeters),
                      'application/vnd.google-earth.kml+xml'
                    )
                  }
                  className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] font-mono text-slate-200 transition"
                >
                  KML
                </button>
                <button
                  onClick={() =>
                    downloadFile(
                      `${field.name.replace(/\s+/g, '_')}_points.csv`,
                      exportToCSV(field.name, field.points),
                      'text/csv'
                    )
                  }
                  className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] font-mono text-slate-200 transition"
                >
                  CSV
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
