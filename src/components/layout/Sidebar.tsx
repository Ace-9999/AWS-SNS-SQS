import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Radio,
  Sliders,
  Send,
  Layers,
  Cpu,
  Activity,
  BarChart3,
  Flame,
  SearchCode,
  BookOpen,
  Settings,
} from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';

export const Sidebar: React.FC = () => {
  const { rules, topics, queues, workers, events, messages, chaos } = useSimulationStore();

  const totalRules = rules.length;
  const totalTopics = topics.length;
  const totalQueues = queues.length;
  const totalWorkers = workers.length;
  const dlqCount = messages.filter((m) => m.state === 'dlq').length;
  const hasChaos =
    chaos.crashedWorkerIds.length > 0 ||
    chaos.injectedLatencyMs > 0 ||
    chaos.snsDeliveryDropRate > 0 ||
    Object.keys(chaos.throttledQueueIds).some((k) => (chaos.throttledQueueIds[k] || 0) > 0);

  const navItems = [
    { name: 'Overview', to: '/', icon: LayoutDashboard },
    { name: 'Event Bus', to: '/event-bus', icon: Radio, badge: events.length > 0 ? events.length : undefined },
    { name: 'Rules', to: '/rules', icon: Sliders, badge: totalRules },
    { name: 'SNS Topics', to: '/sns', icon: Send, badge: totalTopics },
    {
      name: 'SQS Queues',
      to: '/sqs',
      icon: Layers,
      badge: dlqCount > 0 ? `${totalQueues} (${dlqCount} DLQ)` : totalQueues,
      badgeColor: dlqCount > 0 ? 'bg-red-500/20 text-red-400 border-red-500/30' : undefined,
    },
    { name: 'Consumers', to: '/consumers', icon: Cpu, badge: totalWorkers },
    { name: 'Live Canvas', to: '/canvas', icon: Activity, highlight: true },
    { name: 'Metrics', to: '/metrics', icon: BarChart3 },
    {
      name: 'Chaos Lab',
      to: '/chaos',
      icon: Flame,
      badge: hasChaos ? 'ACTIVE' : undefined,
      badgeColor: hasChaos ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse' : undefined,
    },
    { name: 'Trace Debugger', to: '/traces', icon: SearchCode },
    { name: 'Learn', to: '/learn', icon: BookOpen },
    { name: 'Settings', to: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0B0F19] border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none">
      <div className="py-4">
        <div className="px-4 pb-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Architecture & Services
        </div>
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-300 font-semibold shadow-sm shadow-amber-500/5'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-850'
                  } ${item.highlight ? 'border border-amber-500/20 text-amber-200' : ''}`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${item.highlight ? 'text-amber-400' : ''}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Simulator Footer */}
      <div className="p-4 border-t border-slate-800/80 text-xs text-slate-400 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-mono">PulseBridge v1.0</span>
          <span className="inline-flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Sim Engine Online
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight">
          EventBridge &rarr; SNS &rarr; SQS &rarr; Workers
        </p>
      </div>
    </aside>
  );
};

