import React, { useState } from 'react';
import {
  Send,
  Zap,
  RotateCcw,
  Play,
  Square,
  Sparkles,
  Search,
  Filter,
  Check,
  Code,
  FileJson,
  Layers,
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';
import { PRESET_SCENARIOS } from '../store/scenarios';
import { SimulationEvent } from '../engine/types';

export const EventBusPage: React.FC = () => {
  const {
    events,
    publishEvent,
    bulkPublishRandom,
    startBulkGenerator,
    stopBulkGenerator,
    bulkGenerator,
    selectedScenario,
  } = useSimulationStore();

  const scenarioMeta = PRESET_SCENARIOS[selectedScenario] || PRESET_SCENARIOS.ecommerce;

  // Form State
  const [source, setSource] = useState('com.ecommerce.orders');
  const [detailType, setDetailType] = useState('OrderCreated');
  const [detailJson, setDetailJson] = useState(
    JSON.stringify(
      {
        orderId: 'ord-84210',
        amount: 149.99,
        currency: 'USD',
        customerTier: 'VIP',
        items: ['Mechanical Keyboard', 'Wrist Rest'],
        shippingAddress: { city: 'Seattle', state: 'WA' },
      },
      null,
      2
    )
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Bulk generator state
  const [rateSlider, setRateSlider] = useState(bulkGenerator.ratePerSec || 3);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedEventModal, setSelectedEventModal] = useState<SimulationEvent | null>(null);

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedDetail = JSON.parse(detailJson);
      setJsonError(null);
      publishEvent({
        source,
        detailType,
        detail: parsedDetail,
      });
      setPublishSuccess(true);
      setTimeout(() => setPublishSuccess(false), 2000);
    } catch (err: any) {
      setJsonError(`Invalid JSON: ${err.message}`);
    }
  };

  const loadPreset = (presetPayload: any) => {
    setSource(presetPayload.source);
    setDetailType(presetPayload.detailType);
    setDetailJson(JSON.stringify(presetPayload.detail, null, 2));
    setJsonError(null);
  };

  const filteredEvents = events.filter((ev) => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      ev.source.toLowerCase().includes(q) ||
      ev.detailType.toLowerCase().includes(q) ||
      ev.traceId.toLowerCase().includes(q) ||
      JSON.stringify(ev.detail).toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-400" />
            EventBridge Event Bus
          </h1>
          <p className="text-xs text-slate-400">
            Publish events into the pipeline, simulate live traffic bursts, and inspect the real-time event stream.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-purple-500/10 text-purple-300 px-3 py-1.5 rounded-lg border border-purple-500/20">
            Bus: default
          </span>
          <span className="text-xs font-mono bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700">
            Events Ingested: {events.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Event Publisher & Presets */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-400" />
                Publish Event
              </h2>
              {/* Preset Selector */}
              <select
                onChange={(e) => {
                  const idx = parseInt(e.target.value);
                  if (!isNaN(idx) && scenarioMeta.sampleEvents[idx]) {
                    loadPreset(scenarioMeta.sampleEvents[idx].payload);
                  }
                }}
                defaultValue=""
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="" disabled>
                  Load Payload Preset...
                </option>
                {scenarioMeta.sampleEvents.map((preset, idx) => (
                  <option key={preset.name} value={idx}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handlePublish} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Source</label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g. com.ecommerce.orders"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Detail-Type</label>
                <input
                  type="text"
                  value={detailType}
                  onChange={(e) => setDetailType(e.target.value)}
                  placeholder="e.g. OrderCreated"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-400">Detail (JSON)</label>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(detailJson);
                        setDetailJson(JSON.stringify(parsed, null, 2));
                        setJsonError(null);
                      } catch (err: any) {
                        setJsonError(err.message);
                      }
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-mono"
                  >
                    <Code className="w-3 h-3" /> Format
                  </button>
                </div>
                <textarea
                  value={detailJson}
                  onChange={(e) => {
                    setDetailJson(e.target.value);
                    setJsonError(null);
                  }}
                  rows={8}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-amber-200/90 outline-none focus:border-amber-500 resize-none selection:bg-amber-500/20"
                  spellCheck={false}
                />
                {jsonError && (
                  <p className="text-[11px] text-red-400 mt-1 font-mono">{jsonError}</p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {publishSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-white" /> Published!
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Publish Event
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Bulk Event Generator */}
          <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Traffic Generator & Bursts
            </h2>
            <p className="text-xs text-slate-400">
              Continuously inject synthetic traffic or fire instant multi-event bursts to test pipeline capacity.
            </p>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Stream Rate:</span>
                  <span className="font-mono text-amber-400 font-bold">{rateSlider} events/sec</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={rateSlider}
                  onChange={(e) => {
                    const r = parseInt(e.target.value);
                    setRateSlider(r);
                    if (bulkGenerator.isActive) {
                      startBulkGenerator(r);
                    }
                  }}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2">
                {bulkGenerator.isActive ? (
                  <button
                    onClick={stopBulkGenerator}
                    className="flex-1 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" /> Stop Generator
                  </button>
                ) : (
                  <button
                    onClick={() => startBulkGenerator(rateSlider)}
                    className="flex-1 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Start Stream ({rateSlider}/s)
                  </button>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Instant Burst:</span>
                <button
                  onClick={() => bulkPublishRandom(5)}
                  className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
                >
                  +5 Events
                </button>
                <button
                  onClick={() => bulkPublishRandom(20)}
                  className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
                >
                  +20 Events
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Event Stream Table */}
        <div className="lg:col-span-7 bg-[#131B2E] border border-slate-800 rounded-xl p-5 flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Live Ingest Stream ({filteredEvents.length})
            </h2>

            {/* Filter Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Filter by source, type, ID..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 outline-none focus:border-amber-500 w-56 font-mono"
              />
            </div>
          </div>

          {/* Event Stream List */}
          <div className="flex-1 overflow-y-auto max-h-[620px] rounded-lg border border-slate-800 bg-slate-950/50">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs space-y-2">
                <FileJson className="w-8 h-8 mx-auto text-slate-600" />
                <p>No events in stream.</p>
                <p className="text-slate-400">Publish a test payload or trigger a burst to see incoming events.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="py-2 px-3">Time</th>
                    <th className="py-2 px-3">Source</th>
                    <th className="py-2 px-3">Detail-Type</th>
                    <th className="py-2 px-3">Trace ID</th>
                    <th className="py-2 px-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {filteredEvents.map((ev) => (
                    <tr
                      key={ev.id}
                      className="hover:bg-slate-900/60 transition-colors group cursor-pointer"
                      onClick={() => setSelectedEventModal(ev)}
                    >
                      <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                        {new Date(ev.time).toLocaleTimeString()}
                      </td>
                      <td className="py-2 px-3 text-purple-300 font-semibold truncate max-w-[140px]">
                        {ev.source}
                      </td>
                      <td className="py-2 px-3 text-amber-300">
                        <div className="flex items-center gap-1.5">
                          <span>{ev.detailType}</span>
                          {ev.isReplay && (
                            <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1 py-0.2 rounded font-mono">
                              REPLAY
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">
                        {ev.traceId.substring(0, 14)}...
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className="text-amber-400 group-hover:underline text-[11px]">
                          View JSON
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Inspect Event Modal */}
      {selectedEventModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131B2E] border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <FileJson className="w-5 h-5 text-amber-400" />
                  Event Envelope: {selectedEventModal.detailType}
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  Trace ID: {selectedEventModal.traceId}
                </span>
              </div>
              <button
                onClick={() => setSelectedEventModal(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-96 overflow-y-auto">
              <pre className="text-xs font-mono text-emerald-300">
                {JSON.stringify(selectedEventModal, null, 2)}
              </pre>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span>Timestamp: {selectedEventModal.time}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedEventModal, null, 2));
                }}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                Copy JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

