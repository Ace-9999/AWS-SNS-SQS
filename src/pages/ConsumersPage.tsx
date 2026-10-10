import React, { useState } from 'react';
import {
  Cpu,
  Plus,
  Trash2,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  Flame,
  Activity,
  Terminal,
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';
import { ConsumerWorker } from '../engine/types';

export const ConsumersPage: React.FC = () => {
  const { workers, queues, addWorker, updateWorker, deleteWorker, toggleCrashWorker, chaos } =
    useSimulationStore();

  const [selectedWorkerId, setSelectedWorkerId] = useState(workers[0]?.id || '');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New worker form
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newQueueId, setNewQueueId] = useState(queues[0]?.id || '');
  const [newProcessingTime, setNewProcessingTime] = useState(1500);
  const [newFailureRate, setNewFailureRate] = useState(10);
  const [newPoisonPattern, setNewPoisonPattern] = useState('CORRUPTED');

  const selectedWorker = workers.find((w) => w.id === selectedWorkerId) || workers[0];

  const handleCreateWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName.trim()) return;

    const worker: ConsumerWorker = {
      id: `worker-${Date.now().toString(36)}`,
      name: newWorkerName.trim(),
      queueId: newQueueId || queues[0]?.id || '',
      status: 'idle',
      concurrency: 1,
      processingTimeMs: newProcessingTime,
      failureRatePct: newFailureRate,
      poisonPattern: newPoisonPattern,
      progressPct: 0,
      totalProcessed: 0,
      totalFailed: 0,
      logs: [],
    };

    addWorker(worker);
    setNewWorkerName('');
    setShowCreateModal(false);
    setSelectedWorkerId(worker.id);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-orange-400" />
            Mock Consumers & Workers Fleet
          </h1>
          <p className="text-xs text-slate-400">
            Configure worker processing speed, concurrency, simulated downstream failure rate, and poison pill crash handlers.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-orange-500/20 w-fit"
        >
          <Plus className="w-4 h-4" /> Add Consumer Worker
        </button>
      </div>

      {/* Workers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workers.map((worker) => {
          const isCrashed = chaos.crashedWorkerIds.includes(worker.id);
          const assignedQueue = queues.find((q) => q.id === worker.queueId);
          const isSelected = selectedWorker?.id === worker.id;

          return (
            <div
              key={worker.id}
              onClick={() => setSelectedWorkerId(worker.id)}
              className={`bg-[#131B2E] border rounded-xl p-5 space-y-4 cursor-pointer transition-all ${
                isSelected
                  ? 'border-orange-500/50 ring-1 ring-orange-500/30'
                  : 'border-slate-800 hover:border-slate-700'
              } ${isCrashed ? 'opacity-80 bg-red-950/10 border-red-500/30' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isCrashed
                        ? 'bg-red-500/20 text-red-400'
                        : worker.status === 'processing'
                        ? 'bg-amber-500/20 text-amber-400 animate-pulse'
                        : 'bg-orange-500/20 text-orange-400'
                    }`}
                  >
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{worker.name}</h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Queue: {assignedQueue?.name || worker.queueId}
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteWorker(worker.id);
                  }}
                  className="text-slate-500 hover:text-red-400 p-1"
                  title="Delete Worker"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Status Badge & Controls */}
              <div className="flex items-center justify-between pt-1">
                <span
                  className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold ${
                    isCrashed
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : worker.status === 'processing'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {isCrashed ? 'CRASHED (CHAOS)' : worker.status}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCrashWorker(worker.id);
                  }}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors ${
                    isCrashed
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                      : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                  }`}
                >
                  {isCrashed ? 'Restart Worker' : 'Simulate Crash'}
                </button>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Processing:</span>
                  <span>{Math.round(worker.progressPct)}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-150"
                    style={{ width: `${worker.progressPct}%` }}
                  />
                </div>
              </div>

              {/* Stats Footer */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-center font-mono text-xs">
                <div className="bg-slate-950/60 p-2 rounded">
                  <span className="text-[10px] text-slate-500 block">ACKed</span>
                  <span className="text-emerald-400 font-bold">{worker.totalProcessed}</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded">
                  <span className="text-[10px] text-slate-500 block">Failed</span>
                  <span className="text-red-400 font-bold">{worker.totalFailed}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Worker Deep Inspector & Live Log Console */}
      {selectedWorker && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Worker Tuning Panel */}
          <div className="lg:col-span-5 bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-400" />
              Tune Worker: {selectedWorker.name}
            </h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Assigned SQS Queue</label>
                <select
                  value={selectedWorker.queueId}
                  onChange={(e) => updateWorker(selectedWorker.id, { queueId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono outline-none"
                >
                  {queues.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name} ({q.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Processing Latency:</span>
                  <span className="font-mono text-orange-400 font-bold">
                    {selectedWorker.processingTimeMs} ms
                  </span>
                </div>
                <input
                  type="range"
                  min={200}
                  max={5000}
                  step={100}
                  value={selectedWorker.processingTimeMs}
                  onChange={(e) =>
                    updateWorker(selectedWorker.id, { processingTimeMs: parseInt(e.target.value) })
                  }
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Failure Rate:</span>
                  <span className="font-mono text-red-400 font-bold">
                    {selectedWorker.failureRatePct}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={selectedWorker.failureRatePct}
                  onChange={(e) =>
                    updateWorker(selectedWorker.id, { failureRatePct: parseInt(e.target.value) })
                  }
                  className="w-full accent-red-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Poison Pill Pattern (Guaranteed Failure)
                </label>
                <input
                  type="text"
                  value={selectedWorker.poisonPattern || ''}
                  onChange={(e) =>
                    updateWorker(selectedWorker.id, { poisonPattern: e.target.value })
                  }
                  placeholder="e.g. CORRUPTED"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono text-slate-200 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Worker Live Logs Console */}
          <div className="lg:col-span-7 bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-3 flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                Live Worker Log Stream ({selectedWorker.name})
              </h2>
              <span className="text-[10px] font-mono text-slate-500">
                {selectedWorker.logs.length} entries
              </span>
            </div>

            <div className="flex-1 bg-slate-950 rounded-lg border border-slate-800 p-3 font-mono text-xs overflow-y-auto max-h-64 space-y-1">
              {selectedWorker.logs.length === 0 ? (
                <div className="text-slate-600 text-center py-10">
                  No activity logs recorded yet. Worker is waiting for queue messages.
                </div>
              ) : (
                selectedWorker.logs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-start gap-2 text-[11px] ${
                      log.level === 'error'
                        ? 'text-red-400'
                        : log.level === 'warn'
                        ? 'text-amber-400'
                        : 'text-slate-300'
                    }`}
                  >
                    <span className="text-slate-600 whitespace-nowrap">
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>
                    <span>{log.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Worker Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131B2E] border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-orange-400" /> Add Consumer Worker
            </h3>

            <form onSubmit={handleCreateWorker} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Worker Name
                </label>
                <input
                  type="text"
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  placeholder="e.g. Order Fulfillment Worker 03"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Poll SQS Queue
                </label>
                <select
                  value={newQueueId}
                  onChange={(e) => setNewQueueId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 outline-none"
                >
                  {queues.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name} ({q.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Processing Time (ms)
                  </label>
                  <input
                    type="number"
                    min={200}
                    max={10000}
                    value={newProcessingTime}
                    onChange={(e) => setNewProcessingTime(parseInt(e.target.value) || 1500)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Failure Rate (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newFailureRate}
                    onChange={(e) => setNewFailureRate(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs transition-colors"
                >
                  Deploy Worker
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

