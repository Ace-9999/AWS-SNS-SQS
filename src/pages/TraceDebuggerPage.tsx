import React, { useState } from 'react';
import {
  SearchCode,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Play,
  RotateCcw,
  Zap,
  Filter,
  Eye,
  FileJson,
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';
import { TraceHop, TraceRecord } from '../engine/types';

export const TraceDebuggerPage: React.FC = () => {
  const { traceRecorder } = useSimulationStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTraceId, setSelectedTraceId] = useState<string>('');
  const [scrubberStep, setScrubberStep] = useState<number>(0);

  const allTraces = traceRecorder.getAllTraces();
  const filteredTraces = traceRecorder.searchTraces(searchQuery, statusFilter);

  const activeTrace =
    filteredTraces.find((t) => t.traceId === selectedTraceId) ||
    filteredTraces[0] ||
    allTraces[0];

  // Scrubber visible hops
  const visibleHops = activeTrace
    ? scrubberStep > 0
      ? activeTrace.hops.slice(0, scrubberStep)
      : activeTrace.hops
    : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <SearchCode className="w-6 h-6 text-amber-400" />
            Distributed Trace Debugger & Timeline Scrubber
          </h1>
          <p className="text-xs text-slate-400">
            Inspect hop-by-hop message execution, scrub historical timelines, and view precise explanations for rules and filters that did not fire.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-slate-900 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-800">
            Total Traces: {allTraces.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Traces Search & Selection List */}
        <div className="lg:col-span-4 bg-[#131B2E] border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="space-y-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search trace ID, event..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 font-mono outline-none focus:border-amber-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 text-[11px] font-mono">
              {['ALL', 'DELIVERED', 'DROPPED', 'DLQ'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`flex-1 py-1 rounded transition-colors ${
                    statusFilter === st
                      ? 'bg-amber-500/20 text-amber-300 font-bold'
                      : 'text-slate-400 hover:text-white bg-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Trace Items List */}
          <div className="space-y-2 max-h-[580px] overflow-y-auto">
            {filteredTraces.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs font-mono">
                No matching traces found.
              </div>
            ) : (
              filteredTraces.map((t) => {
                const isSelected = activeTrace?.traceId === t.traceId;
                const isDlq = t.status === 'DLQ';
                const isDelivered = t.status === 'DELIVERED';
                const isDropped = t.status === 'DROPPED';

                return (
                  <div
                    key={t.traceId}
                    onClick={() => {
                      setSelectedTraceId(t.traceId);
                      setScrubberStep(0);
                    }}
                    className={`p-3 rounded-lg border transition-all cursor-pointer space-y-1 ${
                      isSelected
                        ? 'bg-amber-950/20 border-amber-500/50 text-amber-200'
                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-white truncate max-w-[170px]">
                        {t.traceId}
                      </span>
                      <span
                        className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                          isDelivered
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : isDlq
                            ? 'bg-red-500/20 text-red-400'
                            : isDropped
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="text-purple-300 truncate max-w-[160px]">
                        {t.originalEvent.detailType}
                      </span>
                      <span>{t.hops.length} Hops</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Trace Timeline Scrubber & Hop Inspector */}
        <div className="lg:col-span-8 space-y-6">
          {activeTrace ? (
            <>
              {/* Timeline Scrubber Bar */}
              <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div>
                    <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                      <span>Trace: {activeTrace.traceId}</span>
                      {activeTrace.originalEvent.isReplay && (
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded font-mono">
                          REPLAY
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Origin: {activeTrace.originalEvent.source} &bull; Type: {activeTrace.originalEvent.detailType}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setScrubberStep(0)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
                    >
                      Show All ({activeTrace.hops.length})
                    </button>
                  </div>
                </div>

                {/* Scrubber Range Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono text-slate-400">
                    <span>Scrubber Position:</span>
                    <span className="text-amber-400 font-bold">
                      Hop {scrubberStep === 0 ? activeTrace.hops.length : scrubberStep} of {activeTrace.hops.length}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={activeTrace.hops.length}
                    value={scrubberStep === 0 ? activeTrace.hops.length : scrubberStep}
                    onChange={(e) => setScrubberStep(parseInt(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Hop-By-Hop Visual Timeline */}
              <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Hop Lineage & Action Audit
                </h3>

                <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {visibleHops.map((hop, idx) => {
                    const isSuccess = hop.status === 'SUCCESS';
                    const isFailed = hop.status === 'FAILED';
                    const isDlq = hop.status === 'DLQ';
                    const isDropped = hop.status === 'DROPPED';

                    return (
                      <div key={hop.id} className="relative group">
                        {/* Dot indicator */}
                        <div
                          className={`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                            isSuccess
                              ? 'bg-emerald-400'
                              : isDlq
                              ? 'bg-red-500'
                              : isDropped
                              ? 'bg-slate-600'
                              : 'bg-amber-400'
                          }`}
                        />

                        {/* Hop Card */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 hover:border-slate-700 transition-colors">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-400 font-bold">
                                Hop #{hop.hopIndex}
                              </span>
                              <span className="font-bold text-white font-mono">
                                [{hop.service}] {hop.nodeName}
                              </span>
                            </div>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                                isSuccess
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : isDlq
                                  ? 'bg-red-500/20 text-red-400'
                                  : isDropped
                                  ? 'bg-slate-800 text-slate-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              {hop.action}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed">
                            {hop.details}
                          </p>

                          {/* "WHY DID THIS NOT FIRE?" DIAGNOSTIC CARD */}
                          {hop.diffReason && (
                            <div className="mt-2 bg-red-950/20 border border-red-500/30 rounded-lg p-3 space-y-1">
                              <div className="flex items-center gap-1.5 text-xs text-red-400 font-bold">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Why did this condition NOT match?
                              </div>
                              <p className="text-xs font-mono text-red-300/90 pl-5">
                                {hop.diffReason}
                              </p>
                            </div>
                          )}

                          {/* Snapshot preview */}
                          {hop.payloadSnapshot && (
                            <details className="text-[11px] text-slate-400 pt-1">
                              <summary className="cursor-pointer hover:text-white font-mono">
                                View Payload Snapshot
                              </summary>
                              <pre className="mt-2 p-2 bg-slate-950 rounded border border-slate-800/80 text-emerald-300/80 overflow-x-auto">
                                {JSON.stringify(hop.payloadSnapshot, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-500 text-xs">
              Publish an event on the Event Bus to record and trace message hops.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

