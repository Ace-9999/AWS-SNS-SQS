import React, { useState } from 'react';
import {
  Flame,
  Zap,
  RotateCcw,
  Sliders,
  AlertTriangle,
  Play,
  Clock,
  Send,
  Cpu,
  Layers,
  History,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';

export const ChaosLabPage: React.FC = () => {
  const {
    chaos,
    workers,
    queues,
    topics,
    rules,
    messages,
    toggleCrashWorker,
    setInjectedLatency,
    setQueueThrottling,
    setSNSDropRate,
    togglePartitionSubscription,
    applyChaosPreset,
    resetChaos,
    replayEvents,
    archiveStore,
  } = useSimulationStore();

  // Replay Studio Form State
  const [selectedRuleFilter, setSelectedRuleFilter] = useState('');
  const [replaySuccessCount, setReplaySuccessCount] = useState<number | null>(null);

  // Active failing messages for backoff view
  const failingMessages = messages.filter(
    (m) => m.receiveCount > 1 || m.state === 'dlq' || m.isPoison
  );

  const totalArchived = archiveStore.size();

  const handleReplay = () => {
    let pattern = undefined;
    if (selectedRuleFilter) {
      const r = rules.find((x) => x.id === selectedRuleFilter);
      if (r) pattern = r.eventPattern;
    }

    const count = replayEvents(undefined, pattern);
    setReplaySuccessCount(count);
    setTimeout(() => setReplaySuccessCount(null), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Flame className="w-6 h-6 text-red-500 fill-red-500/20" />
            Chaos Engineering Lab & Resilience Replay
          </h1>
          <p className="text-xs text-slate-400">
            Simulate real-world outages: crash workers, inject downstream latency, throttle SQS queues, drop SNS deliveries, and replay historical archives.
          </p>
        </div>

        <button
          onClick={resetChaos}
          className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors flex items-center gap-1.5 border border-slate-700 w-fit"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Chaos Injectors
        </button>
      </div>

      {/* Preset Outage Scenarios */}
      <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          One-Click Chaos Presets
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => applyChaosPreset('black_friday')}
            className={`p-4 rounded-xl border text-left transition-all space-y-2 ${
              chaos.activePreset === 'black_friday'
                ? 'bg-amber-950/20 border-amber-500/50 ring-1 ring-amber-500/30'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">Black Friday Surge</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                12 msg/s Burst
              </span>
            </div>
            <p className="text-xs text-slate-400">
              High event injection rate, 25% queue throttling, +1200ms latency.
            </p>
          </button>

          <button
            onClick={() => applyChaosPreset('cascading_failure')}
            className={`p-4 rounded-xl border text-left transition-all space-y-2 ${
              chaos.activePreset === 'cascading_failure'
                ? 'bg-red-950/20 border-red-500/50 ring-1 ring-red-500/30'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">Cascading Outage</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300">
                Worker Down
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Crashes primary fulfillment worker, drops 20% SNS deliveries, +3000ms latency.
            </p>
          </button>

          <button
            onClick={() => applyChaosPreset('poison_onslaught')}
            className={`p-4 rounded-xl border text-left transition-all space-y-2 ${
              chaos.activePreset === 'poison_onslaught'
                ? 'bg-purple-950/20 border-purple-500/50 ring-1 ring-purple-500/30'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">Poison Pill Storm</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                DLQ Cascade
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Injects corrupted message payloads triggering retries and Dead-Letter Queue escalations.
            </p>
          </button>
        </div>
      </div>

      {/* Live Fault Injectors Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Injector Sliders */}
        <div className="lg:col-span-6 bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-5">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-red-400" />
            Live Fault Injectors
          </h2>

          <div className="space-y-4 text-xs">
            {/* 1. Downstream Injected Latency */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Injected Downstream Latency:</span>
                <span className="font-mono text-amber-400 font-bold">
                  +{chaos.injectedLatencyMs} ms
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={5000}
                step={250}
                value={chaos.injectedLatencyMs}
                onChange={(e) => setInjectedLatency(parseInt(e.target.value) || 0)}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <span className="text-[11px] text-slate-500">
                Adds delay to all consumer worker processing times.
              </span>
            </div>

            {/* 2. SNS Delivery Drop Rate */}
            <div className="space-y-1 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between text-slate-300">
                <span>SNS Delivery Drop Rate:</span>
                <span className="font-mono text-red-400 font-bold">
                  {chaos.snsDeliveryDropRate}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={chaos.snsDeliveryDropRate}
                onChange={(e) => setSNSDropRate(parseInt(e.target.value) || 0)}
                className="w-full accent-red-500 cursor-pointer"
              />
              <span className="text-[11px] text-slate-500">
                Simulates network packet drops between SNS topics and subscribers.
              </span>
            </div>

            {/* 3. SQS Queue Throttling */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <span className="text-slate-300 font-medium block">SQS Queue Throttling:</span>
              <div className="space-y-2">
                {queues.map((q) => {
                  const currentThrottle = chaos.throttledQueueIds[q.id] || 0;
                  return (
                    <div key={q.id} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                        <span>{q.name}</span>
                        <span className="text-purple-400 font-bold">{currentThrottle}% Throttled</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={currentThrottle}
                        onChange={(e) =>
                          setQueueThrottling(q.id, parseInt(e.target.value) || 0)
                        }
                        className="w-full accent-purple-500 cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Crash Consumer Workers */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <span className="text-slate-300 font-medium block">Consumer Worker Crashes:</span>
              <div className="grid grid-cols-2 gap-2">
                {workers.map((w) => {
                  const isCrashed = chaos.crashedWorkerIds.includes(w.id);
                  return (
                    <button
                      key={w.id}
                      onClick={() => toggleCrashWorker(w.id)}
                      className={`p-2 rounded-lg border text-left text-xs font-mono transition-colors flex items-center justify-between ${
                        isCrashed
                          ? 'bg-red-500/20 text-red-300 border-red-500/30'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span className="truncate max-w-[110px]">{w.name}</span>
                      <span className="text-[10px] font-bold">
                        {isCrashed ? 'CRASHED' : 'ALIVE'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Archive & Replay Studio */}
        <div className="lg:col-span-6 bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" />
              Event Archive & Replay Studio
            </h2>
            <span className="text-xs font-mono bg-purple-500/10 text-purple-300 px-2.5 py-1 rounded border border-purple-500/20">
              {totalArchived} Events in Archive
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            All published events are recorded in the bus archive. Filter historical events by rule or time window and replay them back into the pipeline with visible <span className="text-purple-400 font-mono">[REPLAY]</span> tagging.
          </p>

          <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Filter by Rule Pattern
              </label>
              <select
                value={selectedRuleFilter}
                onChange={(e) => setSelectedRuleFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none"
              >
                <option value="">All Archived Events (No Pattern Filter)</option>
                {rules.map((r) => (
                  <option key={r.id} value={r.id}>
                    Filter by: {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2">
              <button
                onClick={handleReplay}
                disabled={totalArchived === 0}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Play className="w-4 h-4" />
                Replay Filtered Events into Pipeline
              </button>
              {replaySuccessCount !== null && (
                <p className="text-center text-xs text-purple-300 mt-2 font-mono">
                  &check; Successfully re-injected {replaySuccessCount} events with [REPLAY] tag!
                </p>
              )}
            </div>
          </div>

          {/* Retry & Exponential Backoff Ladder */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Active Retries & Backoff Ladder ({failingMessages.length})
            </h3>

            {failingMessages.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs bg-slate-950/40 rounded-lg border border-slate-800">
                No active failing messages currently backing off or in DLQ.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {failingMessages.slice(0, 5).map((msg) => (
                  <div
                    key={msg.id}
                    className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs font-mono space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold">{msg.id}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          msg.state === 'dlq'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {msg.state === 'dlq' ? 'MOVED TO DLQ' : `ATTEMPT ${msg.receiveCount}`}
                      </span>
                    </div>

                    {/* Step ladder progress */}
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 pt-1">
                      <div
                        className={`flex-1 py-1 rounded text-center ${
                          msg.receiveCount >= 1 ? 'bg-amber-500/30 text-amber-200' : 'bg-slate-800'
                        }`}
                      >
                        Try 1
                      </div>
                      <div
                        className={`flex-1 py-1 rounded text-center ${
                          msg.receiveCount >= 2 ? 'bg-orange-500/30 text-orange-200' : 'bg-slate-800'
                        }`}
                      >
                        Try 2 (Backoff)
                      </div>
                      <div
                        className={`flex-1 py-1 rounded text-center ${
                          msg.receiveCount >= 3 ? 'bg-red-500/40 text-red-200 font-bold' : 'bg-slate-800'
                        }`}
                      >
                        Try 3 &rarr; DLQ
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

