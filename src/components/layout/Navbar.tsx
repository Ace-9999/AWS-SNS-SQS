import React from 'react';
import {
  Play,
  Pause,
  FastForward,
  RotateCcw,
  StepForward,
  Zap,
  Layers,
  Inbox,
  AlertTriangle,
  Cpu,
  Flame,
} from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { PRESET_SCENARIOS } from '../../store/scenarios';

export const Navbar: React.FC = () => {
  const {
    clockState,
    togglePlay,
    setSpeed,
    stepClock,
    resetAll,
    selectedScenario,
    loadScenario,
    events,
    messages,
    workers,
    chaos,
  } = useSimulationStore();

  const totalEvents = events.length;
  const queuedMessages = messages.filter((m) => m.state === 'visible' || m.state === 'delayed').length;
  const inFlightMessages = messages.filter((m) => m.state === 'inflight').length;
  const dlqMessages = messages.filter((m) => m.state === 'dlq').length;
  const activeWorkers = workers.filter((w) => w.status !== 'crashed').length;

  const hasActiveChaos =
    chaos.crashedWorkerIds.length > 0 ||
    chaos.injectedLatencyMs > 0 ||
    chaos.snsDeliveryDropRate > 0 ||
    Object.keys(chaos.throttledQueueIds).some((k) => (chaos.throttledQueueIds[k] || 0) > 0);

  return (
    <header className="sticky top-0 z-50 h-16 bg-[#0E1526]/90 backdrop-blur-md border-b border-slate-800 px-4 flex items-center justify-between text-sm shadow-lg">
      {/* Brand & Scenario */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 font-bold text-lg text-white">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <span>Pulse<span className="text-amber-400">Bridge</span></span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Simulator
          </span>
        </div>

        {/* Scenario Selector */}
        <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-800">
          <label className="text-xs text-slate-400 font-medium">Scenario:</label>
          <select
            value={selectedScenario}
            onChange={(e) => loadScenario(e.target.value)}
            className="bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs rounded-md px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-amber-500 transition-colors cursor-pointer"
          >
            {Object.values(PRESET_SCENARIOS).map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Live Stats Ticker */}
      <div className="hidden lg:flex items-center gap-4 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800/80 text-xs font-mono">
        <div className="flex items-center gap-1.5 text-slate-300" title="Total Events Published">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400">Events:</span>
          <span className="font-semibold text-white">{totalEvents}</span>
        </div>

        <div className="w-px h-3.5 bg-slate-800" />

        <div className="flex items-center gap-1.5 text-slate-300" title="Queued Messages">
          <Layers className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-slate-400">Queued:</span>
          <span className="font-semibold text-white">{queuedMessages}</span>
        </div>

        <div className="w-px h-3.5 bg-slate-800" />

        <div className="flex items-center gap-1.5 text-slate-300" title="In-Flight Messages">
          <Inbox className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">In-Flight:</span>
          <span className="font-semibold text-white">{inFlightMessages}</span>
        </div>

        <div className="w-px h-3.5 bg-slate-800" />

        <div className={`flex items-center gap-1.5 ${dlqMessages > 0 ? 'text-red-400 animate-pulse' : 'text-slate-400'}`} title="Dead-Letter Queue Messages">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>DLQ:</span>
          <span className={`font-semibold ${dlqMessages > 0 ? 'text-red-400 font-bold' : 'text-slate-300'}`}>
            {dlqMessages}
          </span>
        </div>

        <div className="w-px h-3.5 bg-slate-800" />

        <div className="flex items-center gap-1.5 text-slate-300" title="Active Consumers">
          <Cpu className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-slate-400">Workers:</span>
          <span className="font-semibold text-white">{activeWorkers}</span>
        </div>

        {hasActiveChaos && (
          <>
            <div className="w-px h-3.5 bg-slate-800" />
            <div className="flex items-center gap-1 text-red-400 animate-bounce font-semibold" title="Chaos Fault Injection Active">
              <Flame className="w-3.5 h-3.5 fill-red-500 text-red-500" />
              <span>CHAOS ACTIVE</span>
            </div>
          </>
        )}
      </div>

      {/* Simulation Clock Controls */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 shadow-inner">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            title={clockState.isRunning ? 'Pause Simulation' : 'Resume Simulation'}
            className={`p-1.5 rounded-md transition-colors ${
              clockState.isRunning
                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
            }`}
          >
            {clockState.isRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          {/* Step forward (+1 tick) */}
          <button
            onClick={stepClock}
            disabled={clockState.isRunning}
            title="Step forward 1 tick (when paused)"
            className="p-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-40 transition-colors"
          >
            <StepForward className="w-4 h-4" />
          </button>

          {/* Speed Buttons */}
          <div className="flex items-center pl-1 border-l border-slate-800 text-xs">
            {([0.5, 1, 2, 5] as const).map((spd) => (
              <button
                key={spd}
                onClick={() => setSpeed(spd)}
                className={`px-1.5 py-1 rounded text-[11px] font-mono transition-colors ${
                  clockState.speed === spd
                    ? 'bg-slate-800 text-amber-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Global Reset */}
        <button
          onClick={resetAll}
          title="Reset simulation to initial state"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/30 text-slate-400 hover:text-red-400 text-xs transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </header>
  );
};

