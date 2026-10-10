import React, { useState, useMemo } from 'react';
import {
  Activity,
  Zap,
  Sliders,
  Send,
  Layers,
  Cpu,
  AlertTriangle,
  Play,
  Pause,
  Info,
  X,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';

interface NodePosition {
  id: string;
  name: string;
  type: 'bus' | 'rule' | 'topic' | 'queue' | 'worker' | 'dlq';
  x: number;
  y: number;
  width: number;
  height: number;
  meta?: any;
}

export const LiveCanvasPage: React.FC = () => {
  const {
    rules,
    topics,
    queues,
    workers,
    particles,
    messages,
    clockState,
    togglePlay,
    publishEvent,
  } = useSimulationStore();

  const [selectedNode, setSelectedNode] = useState<NodePosition | null>(null);

  // Compute Layout Node Positions
  const nodePositions = useMemo(() => {
    const nodes: NodePosition[] = [];

    // 1. Bus Node
    nodes.push({
      id: 'eventbus-default',
      name: 'EventBridge Bus',
      type: 'bus',
      x: 60,
      y: 280,
      width: 140,
      height: 70,
    });

    // 2. Rules
    rules.forEach((r, idx) => {
      nodes.push({
        id: r.id,
        name: r.name,
        type: 'rule',
        x: 270,
        y: 120 + idx * 160,
        width: 150,
        height: 65,
        meta: r,
      });
    });

    // 3. SNS Topics
    topics.forEach((t, idx) => {
      nodes.push({
        id: t.id,
        name: t.name,
        type: 'topic',
        x: 490,
        y: 140 + idx * 180,
        width: 150,
        height: 65,
        meta: t,
      });
    });

    // 4. Queues (separate standard queues from DLQs)
    const primaryQueues = queues.filter((q) => !q.name.toLowerCase().includes('dlq'));
    const dlqQueues = queues.filter((q) => q.name.toLowerCase().includes('dlq'));

    primaryQueues.forEach((q, idx) => {
      nodes.push({
        id: q.id,
        name: q.name,
        type: 'queue',
        x: 710,
        y: 100 + idx * 140,
        width: 160,
        height: 75,
        meta: q,
      });
    });

    dlqQueues.forEach((q, idx) => {
      nodes.push({
        id: q.id,
        name: q.name,
        type: 'dlq',
        x: 710,
        y: 440 + idx * 130,
        width: 160,
        height: 75,
        meta: q,
      });
    });

    // 5. Workers
    workers.forEach((w, idx) => {
      nodes.push({
        id: w.id,
        name: w.name,
        type: 'worker',
        x: 950,
        y: 130 + idx * 150,
        width: 160,
        height: 75,
        meta: w,
      });
    });

    return nodes;
  }, [rules, topics, queues, workers]);

  // Edges definition
  const edges = useMemo(() => {
    const list: { fromId: string; toId: string; color: string; label?: string }[] = [];

    // Bus -> Rules
    rules.forEach((r) => {
      list.push({ fromId: 'eventbus-default', toId: r.id, color: '#C925D1' });
      // Rule -> Targets
      r.targets.forEach((tgt) => {
        list.push({
          fromId: r.id,
          toId: tgt.targetId,
          color: tgt.type === 'SNS' ? '#E7157B' : '#A855F7',
        });
      });
    });

    // Topic -> Subscriptions (queues)
    topics.forEach((t) => {
      t.subscriptions.forEach((s) => {
        if (s.protocol === 'sqs') {
          list.push({ fromId: t.id, toId: s.endpoint, color: '#E7157B' });
        }
      });
    });

    // Queue -> DLQ
    queues.forEach((q) => {
      if (q.deadLetterQueueId) {
        list.push({ fromId: q.id, toId: q.deadLetterQueueId, color: '#EF4444' });
      }
    });

    // Queue -> Workers
    workers.forEach((w) => {
      list.push({ fromId: w.queueId, toId: w.id, color: '#F97316' });
    });

    return list;
  }, [rules, topics, queues, workers]);

  const getNodePos = (id: string) => nodePositions.find((n) => n.id === id);

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] space-y-4">
      {/* Top Canvas Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131B2E] border border-slate-800 p-4 rounded-xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-400" />
            Live Pipeline Graph & Particle Stream
          </h1>
          <p className="text-xs text-slate-400">
            Real-time visualization of events traveling across the AWS architecture, queue depth liquid bars, and DLQ spillover.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="flex items-center gap-1 text-purple-300">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span> Standard
            </span>
            <span className="flex items-center gap-1 text-indigo-300">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span> Replay
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-400"></span> DLQ / Fail
            </span>
          </div>

          <button
            onClick={togglePlay}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              clockState.isRunning
                ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
            }`}
          >
            {clockState.isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {clockState.isRunning ? 'Pause Sim' : 'Resume Sim'}
          </button>
        </div>
      </div>

      {/* Main SVG Interactive Graph */}
      <div className="flex-1 bg-[#090D16] border border-slate-800 rounded-2xl relative overflow-hidden shadow-2xl">
        <svg className="w-full h-full min-h-[640px] select-none">
          <defs>
            <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#475569" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#64748B" stopOpacity="0.8" />
            </linearGradient>

            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid Background Pattern */}
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1E293B" strokeWidth="0.5" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" opacity="0.6" />

          {/* Render Connection Edges */}
          {edges.map((edge, i) => {
            const from = getNodePos(edge.fromId);
            const to = getNodePos(edge.toId);
            if (!from || !to) return null;

            const startX = from.x + from.width;
            const startY = from.y + from.height / 2;
            const endX = to.x;
            const endY = to.y + to.height / 2;
            const dx = Math.abs(endX - startX) * 0.5;

            const pathD = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;

            return (
              <g key={`edge-${i}`}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={edge.color}
                  strokeWidth="2"
                  strokeOpacity="0.35"
                  strokeDasharray="4 3"
                />
              </g>
            );
          })}

          {/* Render Animated Particles along Edges */}
          {particles.map((p) => {
            const from = getNodePos(p.fromNodeId);
            const to = getNodePos(p.toNodeId);
            if (!from || !to) return null;

            const startX = from.x + from.width;
            const startY = from.y + from.height / 2;
            const endX = to.x;
            const endY = to.y + to.height / 2;
            const dx = Math.abs(endX - startX) * 0.5;

            // Cubic bezier point at progress t
            const t = p.progress;
            const cx1 = startX + dx;
            const cy1 = startY;
            const cx2 = endX - dx;
            const cy2 = endY;

            const px =
              Math.pow(1 - t, 3) * startX +
              3 * Math.pow(1 - t, 2) * t * cx1 +
              3 * (1 - t) * Math.pow(t, 2) * cx2 +
              Math.pow(t, 3) * endX;

            const py =
              Math.pow(1 - t, 3) * startY +
              3 * Math.pow(1 - t, 2) * t * cy1 +
              3 * (1 - t) * Math.pow(t, 2) * cy2 +
              Math.pow(t, 3) * endY;

            return (
              <g key={p.id}>
                {/* Glow ring */}
                <circle cx={px} cy={py} r="8" fill={p.color} opacity="0.3" filter="url(#glow)" />
                {/* Core particle */}
                <circle cx={px} cy={py} r="4.5" fill={p.color} stroke="#ffffff" strokeWidth="1.5" />
              </g>
            );
          })}

          {/* Render Nodes */}
          {nodePositions.map((node) => {
            const isSelected = selectedNode?.id === node.id;

            // Custom coloring per node type
            let borderColor = '#334155';
            let bgFill = '#0F172A';
            let iconColor = '#94A3B8';

            if (node.type === 'bus') {
              borderColor = '#C925D1';
              bgFill = '#1E142B';
              iconColor = '#C925D1';
            } else if (node.type === 'rule') {
              borderColor = '#8B5CF6';
              bgFill = '#17142E';
              iconColor = '#A78BFA';
            } else if (node.type === 'topic') {
              borderColor = '#E7157B';
              bgFill = '#241021';
              iconColor = '#F472B6';
            } else if (node.type === 'queue') {
              borderColor = '#6366F1';
              bgFill = '#131833';
              iconColor = '#818CF8';
            } else if (node.type === 'dlq') {
              borderColor = '#EF4444';
              bgFill = '#2B1214';
              iconColor = '#F87171';
            } else if (node.type === 'worker') {
              borderColor = '#F97316';
              bgFill = '#2B1910';
              iconColor = '#FB923C';
            }

            // Depth calculation for queues
            const queueMsgs =
              node.type === 'queue' || node.type === 'dlq'
                ? messages.filter((m) => m.queueId === node.id && m.state !== 'deleted')
                : [];
            const queueDepthPct = Math.min(100, queueMsgs.length * 15);

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => setSelectedNode(node)}
                className="cursor-pointer transition-transform hover:scale-[1.02]"
              >
                {/* Box */}
                <rect
                  width={node.width}
                  height={node.height}
                  rx="10"
                  fill={bgFill}
                  stroke={isSelected ? '#F59E0B' : borderColor}
                  strokeWidth={isSelected ? '2.5' : '1.5'}
                  filter="drop-shadow(0px 4px 10px rgba(0,0,0,0.5))"
                />

                {/* Queue Liquid Depth fill indicator */}
                {(node.type === 'queue' || node.type === 'dlq') && queueDepthPct > 0 && (
                  <rect
                    x="2"
                    y={node.height - 6}
                    width={(node.width - 4) * (queueDepthPct / 100)}
                    height="4"
                    rx="2"
                    fill={node.type === 'dlq' ? '#EF4444' : '#6366F1'}
                  />
                )}

                {/* Node Label Header */}
                <text
                  x="14"
                  y="24"
                  fill="#E2E8F0"
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="Inter, sans-serif"
                >
                  {node.name.length > 17 ? node.name.substring(0, 16) + '...' : node.name}
                </text>

                {/* Subtext info */}
                <text
                  x="14"
                  y="42"
                  fill="#94A3B8"
                  fontSize="9.5"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {node.type === 'bus' && 'EventBus (Default)'}
                  {node.type === 'rule' && `Pattern (${node.meta?.targets?.length || 1} tgt)`}
                  {node.type === 'topic' && `${node.meta?.subscriptions?.length || 0} Subscriptions`}
                  {(node.type === 'queue' || node.type === 'dlq') &&
                    `Depth: ${queueMsgs.length} msgs`}
                  {node.type === 'worker' &&
                    `State: ${node.meta?.status?.toUpperCase()} (${node.meta?.totalProcessed} ACK)`}
                </text>

                {/* Status indicator dot */}
                <circle
                  cx={node.width - 14}
                  cy="18"
                  r="4"
                  fill={
                    node.type === 'worker' && node.meta?.status === 'processing'
                      ? '#F59E0B'
                      : node.type === 'worker' && node.meta?.status === 'crashed'
                      ? '#EF4444'
                      : '#10B981'
                  }
                />
              </g>
            );
          })}
        </svg>

        {/* Node Detail Drawer Modal on Click */}
        {selectedNode && (
          <div className="absolute right-4 top-4 bottom-4 w-96 bg-[#131B2E]/95 backdrop-blur-md border border-slate-700 rounded-2xl p-5 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right-8 z-30">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-white text-base font-mono">{selectedNode.name}</h3>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400">
                    {selectedNode.type}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Node Metadata Inspector */}
              <div className="space-y-3 text-xs">
                {selectedNode.type === 'queue' || selectedNode.type === 'dlq' ? (
                  <div className="space-y-2">
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono space-y-1">
                      <div className="text-slate-400">
                        Type: <span className="text-white">{selectedNode.meta?.type}</span>
                      </div>
                      <div className="text-slate-400">
                        Visibility Timeout:{' '}
                        <span className="text-white">
                          {selectedNode.meta?.visibilityTimeoutSec}s
                        </span>
                      </div>
                      <div className="text-slate-400">
                        Max Receive Count:{' '}
                        <span className="text-white">{selectedNode.meta?.maxReceiveCount}</span>
                      </div>
                    </div>

                    <h4 className="font-bold text-slate-300 pt-2">Active Messages in Queue:</h4>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px]">
                      {messages
                        .filter((m) => m.queueId === selectedNode.id && m.state !== 'deleted')
                        .map((m) => (
                          <div key={m.id} className="bg-slate-900 p-2 rounded border border-slate-800">
                            <div className="flex justify-between text-indigo-300">
                              <span>{m.id}</span>
                              <span className="text-slate-400">{m.state}</span>
                            </div>
                            <div className="text-slate-400 truncate">
                              Body: {JSON.stringify(m.body)}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : selectedNode.type === 'rule' ? (
                  <div className="space-y-2">
                    <p className="text-slate-300">{selectedNode.meta?.description}</p>
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-purple-300 max-h-56 overflow-y-auto">
                      <pre>{JSON.stringify(selectedNode.meta?.eventPattern, null, 2)}</pre>
                    </div>
                  </div>
                ) : selectedNode.type === 'worker' ? (
                  <div className="space-y-2 font-mono">
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                      <div>Status: <span className="text-amber-400">{selectedNode.meta?.status}</span></div>
                      <div>Base Duration: <span className="text-white">{selectedNode.meta?.processingTimeMs} ms</span></div>
                      <div>Simulated Failure Rate: <span className="text-red-400">{selectedNode.meta?.failureRatePct}%</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400">
                    Standard AWS Pipeline Node. Receiving incoming events and routing downstream.
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setSelectedNode(null)}
              className="w-full mt-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
            >
              Close Inspector
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

