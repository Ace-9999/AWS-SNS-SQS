import React, { useState } from 'react';
import {
  Settings,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Check,
  AlertTriangle,
  Code,
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';

export const SettingsPage: React.FC = () => {
  const {
    exportStateJson,
    importStateJson,
    resetAll,
    selectedScenario,
    loadScenario,
    archiveStore,
    traceRecorder,
  } = useSimulationStore();

  const [importJsonText, setImportJsonText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [copiedExport, setCopiedExport] = useState(false);

  const handleExport = () => {
    const json = exportStateJson();
    navigator.clipboard.writeText(json);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  const handleDownload = () => {
    const json = exportStateJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulsebridge-simulation-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importJsonText.trim()) return;

    const success = importStateJson(importJsonText);
    if (success) {
      setImportStatus('Successfully restored simulation state from JSON!');
      setImportJsonText('');
      setTimeout(() => setImportStatus(null), 3000);
    } else {
      setImportStatus('Failed to import: JSON structure is invalid.');
    }
  };

  const handleClearHistory = () => {
    archiveStore.clear();
    traceRecorder.clear();
    alert('Archive history and trace records cleared.');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-400" />
          PulseBridge Simulator Settings & State Portability
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Export and import entire pipeline topologies, backup simulation scenarios, and manage local storage state.
        </p>
      </div>

      {/* Export / Backup State */}
      <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Download className="w-4 h-4 text-emerald-400" />
          Export Simulation State
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Saves all configured EventBridge rules, SNS topics, subscriptions, SQS queues, consumer workers, and chaos configurations into portable JSON.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleDownload}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-md shadow-emerald-500/20"
          >
            <Download className="w-4 h-4" /> Download State File (.json)
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors flex items-center gap-2 border border-slate-700"
          >
            {copiedExport ? <Check className="w-4 h-4 text-emerald-400" /> : <Code className="w-4 h-4" />}
            {copiedExport ? 'Copied to Clipboard!' : 'Copy JSON to Clipboard'}
          </button>
        </div>
      </div>

      {/* Import / Restore State */}
      <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Upload className="w-4 h-4 text-cyan-400" />
          Import Simulation State
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Paste a previously exported PulseBridge JSON payload to instantly reload the entire pipeline architecture.
        </p>

        <form onSubmit={handleImport} className="space-y-4">
          <textarea
            value={importJsonText}
            onChange={(e) => setImportJsonText(e.target.value)}
            rows={5}
            placeholder="Paste PulseBridge state JSON here..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-cyan-200 outline-none focus:border-cyan-500"
          />

          {importStatus && (
            <p className={`text-xs font-mono ${importStatus.includes('Success') ? 'text-emerald-400' : 'text-red-400'}`}>
              {importStatus}
            </p>
          )}

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-semibold text-xs transition-colors shadow-md shadow-cyan-500/20"
          >
            Import & Restore State
          </button>
        </form>
      </div>

      {/* Danger Zone: Reset & Clear */}
      <div className="bg-[#131B2E] border border-red-500/30 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-bold text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Reset & Cleanup Controls
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Reset all simulator resources back to default initial values or clear archived trace logs.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={resetAll}
            className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold text-xs transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Reset Current Scenario
          </button>

          <button
            onClick={handleClearHistory}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors flex items-center gap-2 border border-slate-700"
          >
            <Trash2 className="w-4 h-4" /> Clear Traces & Archive History
          </button>
        </div>
      </div>
    </div>
  );
};

