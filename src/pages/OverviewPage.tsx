import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Layers,
  Send,
  Cpu,
  AlertTriangle,
  Play,
  ArrowRight,
  ShieldAlert,
  Radio,
  ShoppingCart,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';
import { PRESET_SCENARIOS } from '../store/scenarios';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    rules,
    topics,
    queues,
    workers,
    events,
    messages,
    selectedScenario,
    loadScenario,
    publishEvent,
  } = useSimulationStore();

  const activeMessages = messages.filter((m) => m.state !== 'deleted');
  const visibleMessages = activeMessages.filter((m) => m.state === 'visible').length;
  const inFlightMessages = activeMessages.filter((m) => m.state === 'inflight').length;
  const dlqMessages = activeMessages.filter((m) => m.state === 'dlq').length;
  const totalProcessed = workers.reduce((acc, w) => acc + w.totalProcessed, 0);
  const totalFailed = workers.reduce((acc, w) => acc + w.totalFailed, 0);

  const scenarioMeta = PRESET_SCENARIOS[selectedScenario] || PRESET_SCENARIOS.ecommerce;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-[#131B2E] to-slate-900 border border-slate-800 p-8 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            Simulated AWS Event-Driven Pipeline
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            EventBridge &rarr; SNS &rarr; SQS &rarr; Consumers
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            PulseBridge simulates full real-world semantics: EventBridge pattern matching, SNS fan-out with subscription filter policies, SQS standard & FIFO queue state machines with visibility timeouts, retry backoff, and DLQ spillover.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => navigate('/canvas')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-medium text-sm shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02]"
            >
              <Activity className="w-4 h-4" />
              Open Live Canvas
            </button>
            <button
              onClick={() => {
                if (scenarioMeta.sampleEvents.length > 0) {
                  publishEvent(scenarioMeta.sampleEvents[0].payload);
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-sm transition-all"
            >
              <Play className="w-4 h-4 text-emerald-400" />
              Publish Sample Event
            </button>
            <button
              onClick={() => navigate('/chaos')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-sm transition-all"
            >
              Test Chaos Lab
              <ArrowRight className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Total Events</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{events.length}</div>
          <div className="text-[11px] text-slate-400">Ingested to Bus</div>
        </div>

        <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Visible Queued</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-300">{visibleMessages}</div>
          <div className="text-[11px] text-slate-400">Ready for workers</div>
        </div>

        <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>In-Flight</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-300">{inFlightMessages}</div>
          <div className="text-[11px] text-slate-400">Under visibility lease</div>
        </div>

        <div className={`bg-[#131B2E] border rounded-xl p-4 space-y-1 ${dlqMessages > 0 ? 'border-red-500/40 bg-red-950/10' : 'border-slate-800'}`}>
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>DLQ Depth</span>
            <AlertTriangle className={`w-4 h-4 ${dlqMessages > 0 ? 'text-red-400' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-bold font-mono ${dlqMessages > 0 ? 'text-red-400 font-extrabold' : 'text-slate-400'}`}>
            {dlqMessages}
          </div>
          <div className="text-[11px] text-slate-400">Max retries exceeded</div>
        </div>

        <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Processed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{totalProcessed}</div>
          <div className="text-[11px] text-slate-400">ACK'd & deleted</div>
        </div>

        <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Failures</span>
            <AlertTriangle className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-orange-400">{totalFailed}</div>
          <div className="text-[11px] text-slate-400">Retried / poison pills</div>
        </div>
      </div>

      {/* Interactive Architecture Flow Diagram */}
      <div className="bg-[#131B2E] border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Pipeline Architecture & Topology
            </h2>
            <p className="text-xs text-slate-400">
              Interactive overview of the active AWS service nodes and their connections
            </p>
          </div>
          <button
            onClick={() => navigate('/canvas')}
            className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
          >
            Full Live Canvas &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Step 1: EventBridge */}
          <div className="bg-slate-900/90 border border-purple-500/30 rounded-xl p-4 space-y-3 relative group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">
                  EB
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-white">EventBridge</h3>
                  <span className="text-[10px] text-purple-400 font-mono">Bus: default</span>
                </div>
              </div>
              <span className="text-xs font-mono bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20">
                {rules.length} Rules
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-400">
              {rules.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-slate-950/60 px-2.5 py-1.5 rounded">
                  <span className="truncate max-w-[130px] font-mono text-slate-300">{r.name}</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">{r.state}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step 2: SNS Topics */}
          <div className="bg-slate-900/90 border border-pink-500/30 rounded-xl p-4 space-y-3 relative group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-xs">
                  SNS
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-white">SNS Topics</h3>
                  <span className="text-[10px] text-pink-400 font-mono">Fan-Out Hub</span>
                </div>
              </div>
              <span className="text-xs font-mono bg-pink-500/10 text-pink-300 px-2 py-0.5 rounded border border-pink-500/20">
                {topics.length} Topics
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-400">
              {topics.map((t) => (
                <div key={t.id} className="bg-slate-950/60 px-2.5 py-1.5 rounded space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate max-w-[130px] font-mono text-slate-300">{t.name}</span>
                    <span className="text-[10px] text-pink-400 font-mono">{t.subscriptions.length} subs</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: SQS Queues */}
          <div className="bg-slate-900/90 border border-indigo-500/30 rounded-xl p-4 space-y-3 relative group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                  SQS
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-white">SQS Queues</h3>
                  <span className="text-[10px] text-indigo-400 font-mono">Standard & FIFO</span>
                </div>
              </div>
              <span className="text-xs font-mono bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20">
                {queues.length} Queues
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-400">
              {queues.slice(0, 4).map((q) => {
                const count = messages.filter((m) => m.queueId === q.id && m.state !== 'deleted').length;
                return (
                  <div key={q.id} className="flex items-center justify-between bg-slate-950/60 px-2.5 py-1.5 rounded">
                    <span className="truncate max-w-[120px] font-mono text-slate-300">{q.name}</span>
                    <span className="text-[10px] font-mono text-indigo-300">{count} msgs</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 4: Consumers */}
          <div className="bg-slate-900/90 border border-orange-500/30 rounded-xl p-4 space-y-3 relative group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs">
                  WRK
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-white">Consumers</h3>
                  <span className="text-[10px] text-orange-400 font-mono">Mock Workers</span>
                </div>
              </div>
              <span className="text-xs font-mono bg-orange-500/10 text-orange-300 px-2 py-0.5 rounded border border-orange-500/20">
                {workers.length} Workers
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-400">
              {workers.map((w) => (
                <div key={w.id} className="flex items-center justify-between bg-slate-950/60 px-2.5 py-1.5 rounded">
                  <span className="truncate max-w-[120px] font-mono text-slate-300">{w.name}</span>
                  <span
                    className={`text-[10px] uppercase font-mono px-1.5 py-0.2 rounded ${
                      w.status === 'processing'
                        ? 'bg-amber-500/20 text-amber-400'
                        : w.status === 'crashed'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {w.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Start Scenarios */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white">Preconfigured Architecture Scenarios</h2>
          <p className="text-xs text-slate-400">
            Switch between real-world architectural topologies with customized rules, topics, and consumers
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Scenario 1: E-Commerce */}
          <div
            className={`border rounded-xl p-5 space-y-4 transition-all ${
              selectedScenario === 'ecommerce'
                ? 'bg-slate-900 border-amber-500/50 ring-1 ring-amber-500/30'
                : 'bg-[#131B2E] border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <ShoppingCart className="w-5 h-5" />
              </div>
              {selectedScenario === 'ecommerce' && (
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Active
                </span>
              )}
            </div>
            <div>
              <h3 className="font-bold text-white text-base">E-Commerce Orders</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Order creation, VIP filtering via FIFO SQS, fulfillment worker pool, poison pills, and DLQ spillover.
              </p>
            </div>
            <button
              onClick={() => loadScenario('ecommerce')}
              disabled={selectedScenario === 'ecommerce'}
              className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-semibold text-slate-200 transition-colors"
            >
              {selectedScenario === 'ecommerce' ? 'Scenario Active' : 'Load E-Commerce'}
            </button>
          </div>

          {/* Scenario 2: IoT */}
          <div
            className={`border rounded-xl p-5 space-y-4 transition-all ${
              selectedScenario === 'iot'
                ? 'bg-slate-900 border-cyan-500/50 ring-1 ring-cyan-500/30'
                : 'bg-[#131B2E] border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Radio className="w-5 h-5" />
              </div>
              {selectedScenario === 'iot' && (
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  Active
                </span>
              )}
            </div>
            <div>
              <h3 className="font-bold text-white text-base">IoT Smart City</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Sensors streaming telemetry; numeric rule filters trigger emergency broadcast and FIFO telemetry archives.
              </p>
            </div>
            <button
              onClick={() => loadScenario('iot')}
              disabled={selectedScenario === 'iot'}
              className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-semibold text-slate-200 transition-colors"
            >
              {selectedScenario === 'iot' ? 'Scenario Active' : 'Load IoT Telemetry'}
            </button>
          </div>

          {/* Scenario 3: Fraud */}
          <div
            className={`border rounded-xl p-5 space-y-4 transition-all ${
              selectedScenario === 'fraud'
                ? 'bg-slate-900 border-red-500/50 ring-1 ring-red-500/30'
                : 'bg-[#131B2E] border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              {selectedScenario === 'fraud' && (
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                  Active
                </span>
              )}
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Fraud Detection</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                High-value financial transactions, risk scoring pattern matching, investigation queues, and analyzer workers.
              </p>
            </div>
            <button
              onClick={() => loadScenario('fraud')}
              disabled={selectedScenario === 'fraud'}
              className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-semibold text-slate-200 transition-colors"
            >
              {selectedScenario === 'fraud' ? 'Scenario Active' : 'Load Fraud Pipeline'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

