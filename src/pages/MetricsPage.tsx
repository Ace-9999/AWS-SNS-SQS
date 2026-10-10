import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Layers,
  AlertTriangle,
  Clock,
  Zap,
} from 'lucide-react';
import { useSimulationStore, MetricsPoint } from '../store/useSimulationStore';

export const MetricsPage: React.FC = () => {
  const { metricsHistory, events, messages, workers } = useSimulationStore();

  const [timeRange, setTimeRange] = useState<'1m' | '5m' | 'all'>('5m');

  const activePoints =
    timeRange === '1m'
      ? metricsHistory.slice(-15)
      : timeRange === '5m'
      ? metricsHistory.slice(-40)
      : metricsHistory;

  // Compute stats
  const totalEvents = events.length;
  const currentDepth = messages.filter((m) => m.state === 'visible' || m.state === 'delayed').length;
  const inFlightCount = messages.filter((m) => m.state === 'inflight').length;
  const dlqCount = messages.filter((m) => m.state === 'dlq').length;
  const totalProcessed = workers.reduce((acc, w) => acc + w.totalProcessed, 0);
  const totalFailed = workers.reduce((acc, w) => acc + w.totalFailed, 0);

  // SVG Chart Generator Helper
  const renderSparkline = (
    data: number[],
    strokeColor: string,
    fillColor: string,
    height = 90
  ) => {
    if (data.length < 2) {
      return (
        <div className="h-24 flex items-center justify-center text-xs text-slate-500 font-mono">
          Accumulating simulation data points...
        </div>
      );
    }

    const min = Math.min(...data, 0);
    const max = Math.max(...data, 5);
    const range = max - min || 1;
    const width = 450;

    const points = data
      .map((val, idx) => {
        const x = (idx / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 15) - 8;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24">
          <polyline fill="none" stroke={strokeColor} strokeWidth="2.5" points={points} />
          {/* Subtle area gradient */}
          <polygon
            fill={fillColor}
            opacity="0.15"
            points={`0,${height} ${points} ${width},${height}`}
          />
        </svg>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
            CloudWatch & Pipeline Telemetry
          </h1>
          <p className="text-xs text-slate-400">
            Real-time metric telemetry tracking event bus throughput, consumer latency distribution, SQS queue depths, and DLQ rates.
          </p>
        </div>

        {/* Time Window Switcher */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs font-mono">
          {(['1m', '5m', 'all'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 rounded transition-colors ${
                timeRange === r
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Telemetry Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Ingestion Total</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{totalEvents}</div>
          <div className="text-[11px] text-slate-500">Events published</div>
        </div>

        <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Queue Depth</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-300">
            {currentDepth} <span className="text-xs text-slate-500 font-normal">vis</span>
          </div>
          <div className="text-[11px] text-slate-500">{inFlightCount} currently in-flight</div>
        </div>

        <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Consumer ACKs</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{totalProcessed}</div>
          <div className="text-[11px] text-slate-500">Acknowledged & purged</div>
        </div>

        <div className={`bg-[#131B2E] border rounded-xl p-4 space-y-1 ${dlqCount > 0 ? 'border-red-500/40 bg-red-950/10' : 'border-slate-800'}`}>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>DLQ Spillover</span>
            <AlertTriangle className={`w-4 h-4 ${dlqCount > 0 ? 'text-red-400' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-bold font-mono ${dlqCount > 0 ? 'text-red-400' : 'text-white'}`}>
            {dlqCount}
          </div>
          <div className="text-[11px] text-slate-500">{totalFailed} failure events recorded</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 1: Queue Depth Over Time */}
        <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              Queue Depth (Visible Messages)
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              Live: {currentDepth}
            </span>
          </div>
          {renderSparkline(
            activePoints.map((p) => p.totalQueueDepth),
            '#A855F7',
            '#A855F7'
          )}
        </div>

        {/* Chart 2: In-Flight Messages */}
        <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              In-Flight Visibility Leases
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              Active: {inFlightCount}
            </span>
          </div>
          {renderSparkline(
            activePoints.map((p) => p.inFlightCount),
            '#06B6D4',
            '#06B6D4'
          )}
        </div>

        {/* Chart 3: Message Processing ACKs */}
        <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Cumulative Processed Messages
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              Total: {totalProcessed}
            </span>
          </div>
          {renderSparkline(
            activePoints.map((p) => p.messagesProcessed),
            '#10B981',
            '#10B981'
          )}
        </div>

        {/* Chart 4: DLQ Spillover Rate */}
        <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              DLQ Accumulated Depth
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              DLQ: {dlqCount}
            </span>
          </div>
          {renderSparkline(
            activePoints.map((p) => p.dlqCount),
            '#EF4444',
            '#EF4444'
          )}
        </div>
      </div>
    </div>
  );
};

