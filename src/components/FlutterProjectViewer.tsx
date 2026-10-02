/**
 * FlutterProjectViewer Component
 * Interactive file tree explorer and 1-click ZIP packager/downloader for the
 * entire Flutter + Android + Windows + Dart codebase.
 * Automatically loads all 34+ production files directly from /field_measure_pro.
 */

import React, { useState, useMemo } from 'react';
import JSZip from 'jszip';

interface FlutterFile {
  path: string;
  category: 'Dart Core' | 'GIS & Math' | 'GPS & Filter' | 'Controllers' | 'Features / UI' | 'Android' | 'Windows' | 'Tests' | 'Config';
  content: string;
}

// Dynamically import all files under /field_measure_pro via Vite raw import glob
const rawFiles = import.meta.glob('/field_measure_pro/**/*', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function getCategory(filePath: string): FlutterFile['category'] {
  if (filePath.startsWith('android/')) return 'Android';
  if (filePath.startsWith('windows/')) return 'Windows';
  if (filePath.startsWith('test/')) return 'Tests';
  if (filePath.startsWith('lib/gis/')) return 'GIS & Math';
  if (filePath.startsWith('lib/gps/')) return 'GPS & Filter';
  if (filePath.startsWith('lib/polygon_editor/') || filePath.startsWith('lib/drawing/')) return 'Controllers';
  if (filePath.startsWith('lib/features/') || filePath.startsWith('lib/map/')) return 'Features / UI';
  if (filePath.startsWith('lib/core/') || filePath.startsWith('lib/models/') || filePath.startsWith('lib/database/') || filePath.startsWith('lib/export/') || filePath.startsWith('lib/import/') || filePath === 'lib/main.dart') return 'Dart Core';
  return 'Config';
}

export const FlutterProjectViewer: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const fileList = useMemo<FlutterFile[]>(() => {
    const list: FlutterFile[] = [];
    for (const [key, content] of Object.entries(rawFiles)) {
      if (typeof content !== 'string') continue;
      // Strip leading /field_measure_pro/
      const cleanPath = key.replace(/^\/field_measure_pro\//, '').replace(/^field_measure_pro\//, '');
      if (!cleanPath) continue;

      list.push({
        path: cleanPath,
        category: getCategory(cleanPath),
        content,
      });
    }

    // Sort order: Config, Dart Core, Controllers, Features, GIS, GPS, Android, Windows, Tests
    const categoryOrder: Record<string, number> = {
      'Config': 1,
      'Dart Core': 2,
      'Controllers': 3,
      'Features / UI': 4,
      'GIS & Math': 5,
      'GPS & Filter': 6,
      'Android': 7,
      'Windows': 8,
      'Tests': 9,
    };

    return list.sort((a, b) => {
      const catDiff = (categoryOrder[a.category] ?? 99) - (categoryOrder[b.category] ?? 99);
      if (catDiff !== 0) return catDiff;
      return a.path.localeCompare(b.path);
    });
  }, []);

  const [selectedPath, setSelectedPath] = useState<string>(() => {
    return fileList.find(f => f.path.includes('polygon_editor_controller.dart'))?.path ?? fileList[0]?.path ?? 'pubspec.yaml';
  });

  const selectedFile = fileList.find(f => f.path === selectedPath) ?? fileList[0];
  const [isZipping, setIsZipping] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const rootFolder = zip.folder('field_measure_pro');

      for (const file of fileList) {
        rootFolder?.file(file.path, file.content);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'field_measure_pro_flutter_cross_platform.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to create zip', e);
    } finally {
      setIsZipping(false);
    }
  };

  const handleCopyCode = async () => {
    if (!selectedFile) return;
    try {
      await navigator.clipboard.writeText(selectedFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  return (
    <div className="min-h-full bg-slate-900 text-slate-100 flex flex-col p-4 md:p-8 max-w-6xl mx-auto select-none">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-green-400">Flutter</span> Codebase Explorer
            </h2>
            <p className="text-xs text-slate-400">
              Complete production Flutter + Android + Windows package ({fileList.length} files)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadZip}
            disabled={isZipping || fileList.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {isZipping ? 'PACKAGING ZIP...' : 'DOWNLOAD FLUTTER PROJECT (.ZIP)'}
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="mt-4 flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-[560px]">
        {/* Left Column: File Explorer Tree */}
        <div className="md:col-span-4 bg-slate-950/80 rounded-2xl border border-slate-800 p-3 flex flex-col overflow-hidden max-h-[600px]">
          <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800/80 mb-2">
            Project Files ({fileList.length})
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {fileList.map((file) => {
              const isSelected = file.path === selectedFile?.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedPath(file.path)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-green-600/20 text-green-300 font-semibold border border-green-500/30'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <span className="truncate pr-2 font-mono">{file.path}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/50 flex-shrink-0">
                    {file.category}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Code Viewer */}
        <div className="md:col-span-8 bg-slate-950/90 rounded-2xl border border-slate-800 flex flex-col overflow-hidden max-h-[600px]">
          {selectedFile ? (
            <>
              <div className="bg-slate-900/90 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-green-400">
                    {selectedFile.path}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    {selectedFile.category}
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                >
                  {copied ? (
                    <span className="text-green-400 font-bold">Copied!</span>
                  ) : (
                    <span>Copy File</span>
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-xs leading-relaxed text-slate-300 custom-scrollbar select-text">
                <pre>
                  <code>{selectedFile.content}</code>
                </pre>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
              Select a file to inspect code
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
